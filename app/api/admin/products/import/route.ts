import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isAdminDashboardRole } from '@/lib/permissions';
import mongoPrisma from '@/lib/mongodb';
import {
  buildImportDescription,
  importRowSlug,
  parseRelatorioEstoqueWorkbook,
  slugifyProductKey,
} from '@/lib/relatorio-estoque-xls';

export const dynamic = 'force-dynamic';

async function uniqueCategorySlug(base: string): Promise<string> {
  let s = base.slice(0, 80) || 'categoria';
  let i = 0;
  for (;;) {
    const ex = await mongoPrisma.category.findUnique({ where: { slug: s } });
    if (!ex) return s;
    i += 1;
    s = `${base}-${i}`.slice(0, 80);
  }
}

async function resolveCategoryId(
  grupo: string,
  cache: Map<string, string>,
  existingCategories: { id: string; name: string }[]
): Promise<string> {
  const g = grupo.trim() || 'Sem grupo';
  const key = g.toLowerCase();
  const hitCache = cache.get(key);
  if (hitCache) return hitCache;

  const hit = existingCategories.find((c) => c.name.trim().toLowerCase() === key);
  if (hit) {
    cache.set(key, hit.id);
    return hit.id;
  }

  const slugBase = slugifyProductKey(g) || 'sem-grupo';
  const slug = await uniqueCategorySlug(slugBase);
  const created = await mongoPrisma.category.create({
    data: {
      name: g,
      slug,
      description: 'Categoria criada na importação do relatório de estoque.',
    },
  });
  existingCategories.push({ id: created.id, name: created.name });
  cache.set(key, created.id);
  return created.id;
}

async function uniqueProductSlug(base: string): Promise<string> {
  let s = base.slice(0, 120);
  let i = 0;
  for (;;) {
    const ex = await mongoPrisma.product.findUnique({ where: { slug: s } });
    if (!ex) return s;
    i += 1;
    s = `${base}-${i}`.slice(0, 120);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAdminDashboardRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get('file');
    const upsertRaw = form.get('upsert');
    const upsert = upsertRaw === 'true' || upsertRaw === '1';

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Envie o ficheiro no campo file' }, { status: 400 });
    }

    const buf = await file.arrayBuffer();
    const { rows, warnings } = parseRelatorioEstoqueWorkbook(buf);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma linha de produto encontrada', warnings },
        { status: 400 }
      );
    }

    const catCache = new Map<string, string>();
    const existingCategories = await mongoPrisma.category.findMany({
      select: { id: true, name: true },
    });
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: { name: string; message: string }[] = [];

    for (const row of rows) {
      const baseSlug = importRowSlug(row.code, row.name);
      const description = buildImportDescription(row);
      const categoryId = await resolveCategoryId(row.grupo, catCache, existingCategories);
      const price = row.price;

      try {
        const existing = await mongoPrisma.product.findUnique({
          where: { slug: baseSlug },
        });

        if (existing) {
          if (!upsert) {
            skipped += 1;
            continue;
          }
          await mongoPrisma.product.update({
            where: { id: existing.id },
            data: {
              name: row.name,
              description,
              price,
              stock: row.stock,
              categoryId,
            },
          });
          updated += 1;
          continue;
        }

        const newSlug = await uniqueProductSlug(baseSlug);

        await mongoPrisma.product.create({
          data: {
            name: row.name,
            slug: newSlug,
            description,
            price,
            stock: row.stock,
            minStock: 0,
            categoryId,
            featured: false,
          },
        });
        created += 1;
      } catch (err: any) {
        errors.push({ name: row.name, message: err?.message || String(err) });
      }
    }

    return NextResponse.json({
      created,
      updated,
      skipped,
      errors,
      warnings,
      totalParsed: rows.length,
    });
  } catch (e: any) {
    console.error('import produtos:', e);
    return NextResponse.json(
      { error: 'Erro ao importar', details: e?.message },
      { status: 500 }
    );
  }
}
