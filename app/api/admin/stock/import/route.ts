import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth-options';
import { canAccessPhysicalStockApi } from '@/lib/store-stock-access';
import { connectToDatabase } from '@/lib/mongodb-native';
import { enrichExistingProductIfSparse } from '@/lib/product-web-enrichment';

export const dynamic = 'force-dynamic';

type ImportMode = 'add' | 'set';

type ImportItem = {
  productId: string;
  quantity: number;
  externalCode?: string | null;
};

function isValidMode(v: unknown): v is ImportMode {
  return v === 'add' || v === 'set';
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !canAccessPhysicalStockApi((session.user as any).role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const mode: ImportMode = isValidMode(body?.mode) ? body.mode : 'add';
  const source = typeof body?.source === 'string' ? body.source : 'unknown';
  const documentHash = typeof body?.documentHash === 'string' ? body.documentHash : null;
  /** Enriquecimento inline desativado por defeito — usar fila em `/api/admin/catalog/enrichment-queue/kick`. */
  const enrichProducts = body?.enrichProducts === true;
  const items: ImportItem[] = Array.isArray(body?.items) ? body.items : [];
  const mappingsToUpsert: Array<{ externalCode: string; productId: string; source?: string }> = Array.isArray(
    body?.mappingsToUpsert
  )
    ? body.mappingsToUpsert
    : [];

  if (items.length === 0) {
    return NextResponse.json({ error: 'Nenhum item para importar' }, { status: 400 });
  }

  const normalized = items
    .map((it) => ({
      productId: String(it?.productId ?? '').trim(),
      externalCode: typeof it?.externalCode === 'string' ? it.externalCode.trim() : null,
      quantity: Number(it?.quantity),
    }))
    .filter((it) => it.productId && Number.isFinite(it.quantity) && it.quantity > 0);

  if (normalized.length === 0) {
    return NextResponse.json({ error: 'Itens inválidos' }, { status: 400 });
  }

  const db = await connectToDatabase();
  const products = db.collection('products');
  const imports = db.collection('inventory_imports');
  const documents = db.collection('inventory_import_documents');
  const mappings = db.collection('inventory_product_mappings');

  let applied = 0;
  const errors: Array<{ productId: string; error: string }> = [];
  
  // Agrega por produto para reduzir chamadas ao Mongo em importações grandes.
  const perProduct = new Map<string, { oid: ObjectId; value: number }>();

  for (const it of normalized) {
    let oid: ObjectId;
    try {
      oid = new ObjectId(it.productId);
    } catch {
      errors.push({ productId: it.productId, error: 'productId não é ObjectId' });
      continue;
    }

    const q = Math.round(it.quantity);
    if (q <= 0) continue;

    const existing = perProduct.get(it.productId);
    if (!existing) {
      perProduct.set(it.productId, { oid, value: q });
      continue;
    }

    if (mode === 'set') {
      // Em modo set, considera o último valor recebido para o produto.
      existing.value = q;
      perProduct.set(it.productId, existing);
    } else {
      existing.value += q;
      perProduct.set(it.productId, existing);
    }
  }

  if (perProduct.size > 0) {
    try {
      if (mode === 'set') {
        const ops = Array.from(perProduct.values()).map(({ oid, value }) => ({
          updateOne: {
            filter: { _id: oid },
            update: { $set: { stock: value } },
          },
        }));
        const res = await products.bulkWrite(ops, { ordered: false });
        applied = (res.modifiedCount ?? 0) + (res.upsertedCount ?? 0);
      } else {
        const ops = Array.from(perProduct.values()).map(({ oid, value }) => ({
          updateOne: {
            filter: { _id: oid },
            update: { $inc: { stock: value } },
          },
        }));
        const res = await products.bulkWrite(ops, { ordered: false });
        applied = (res.modifiedCount ?? 0) + (res.upsertedCount ?? 0);
      }
    } catch (e: any) {
      errors.push({ productId: 'bulk', error: e?.message || 'Falha ao atualizar estoque em lote' });
    }
  }

  const createdAt = new Date();
  const actorId = (session.user as any)?.id ?? null;
  const actorEmail = (session.user as any)?.email ?? null;
  const actorRole = (session.user as any)?.role ?? null;
  const createdBy = actorEmail ?? actorId ?? null;

  // Salva documento (dedupe/registro) se tiver hash
  if (documentHash) {
    await documents.updateOne(
      { documentHash },
      {
        $setOnInsert: {
          documentHash,
          source,
          createdAt,
          createdBy,
          actorId,
          actorEmail,
          actorRole,
          actorType: 'admin_session',
        },
      },
      { upsert: true }
    );
  }

  // Upsert mapeamentos (externalCode -> productId)
  if (mappingsToUpsert.length > 0) {
    const mapOps = mappingsToUpsert
      .map((m) => {
        const externalCode = String(m?.externalCode ?? '').trim();
        const productId = String(m?.productId ?? '').trim();
        if (!externalCode || !productId) return null;
        try {
          void new ObjectId(productId);
        } catch {
          return null;
        }

        return {
          updateOne: {
            filter: { externalCode },
            update: {
              $set: {
                externalCode,
                productId,
                source: typeof m?.source === 'string' ? m.source : source,
                updatedAt: createdAt,
                updatedBy: createdBy,
              },
              $setOnInsert: {
                createdAt,
                createdBy,
                actorId,
                actorEmail,
                actorRole,
                actorType: 'admin_session',
              },
            },
            upsert: true,
          },
        };
      })
      .filter(Boolean) as any[];

    if (mapOps.length) {
      try {
        await mappings.bulkWrite(mapOps, { ordered: false });
      } catch (e: any) {
        errors.push({ productId: 'mappings', error: e?.message || 'Falha ao gravar mapeamentos' });
      }
    }
  }

  const enrichment: {
    enabled: boolean;
    processed: number;
    updated: number;
    skipped: number;
    cappedAt: number;
    errors: string[];
  } = {
    enabled: enrichProducts,
    processed: 0,
    updated: 0,
    skipped: 0,
    cappedAt: 40,
    errors: [],
  };

  if (enrichProducts && perProduct.size > 0) {
    const MAX = enrichment.cappedAt;
    const ids = Array.from(perProduct.keys()).slice(0, MAX);
    try {
      const db = await connectToDatabase();
      const oids = ids.map((id) => new ObjectId(id));
      const prods = await db
        .collection('products')
        .find({ _id: { $in: oids } }, { projection: { name: 1 } })
        .toArray();
      for (const p of prods) {
        enrichment.processed += 1;
        try {
          const r = await enrichExistingProductIfSparse(String(p._id), String((p as { name?: string }).name ?? ''));
          if (r.updated) enrichment.updated += 1;
          else enrichment.skipped += 1;
        } catch (e: unknown) {
          enrichment.errors.push(e instanceof Error ? e.message : String(e));
        }
      }
    } catch (e: unknown) {
      enrichment.errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  await imports.insertOne({
    mode,
    source,
    documentHash,
    totalReceived: items.length,
    totalNormalized: normalized.length,
    applied,
    errorsCount: errors.length,
    errors,
    createdAt,
    createdBy,
    actorId,
    actorEmail,
    actorRole,
    actorType: 'admin_session',
  });

  return NextResponse.json({
    success: true,
    mode,
    source,
    documentHash,
    applied,
    errorsCount: errors.length,
    errors,
    enrichment,
  });
}

