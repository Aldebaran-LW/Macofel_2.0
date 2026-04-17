import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import {
  GEMINI_API_KEY,
  MACOFEL_ENRICH_API_KEY,
  MACOFEL_ENRICH_BACKEND,
} from '@/env';
import {
  enrichProductInputSchema,
  enrichProductWithGemini,
} from '@/lib/macofel-ai-studio-enrichment';
import { enrichProductWithOllama } from '@/lib/ollama-product-enrichment';
import { persistAiStudioProductEnrichment } from '@/lib/persist-ai-studio-product-enrichment';

export const dynamic = 'force-dynamic';
/** Ollama no CPU pode demorar vários minutos. */
export const maxDuration = 300;

/**
 * Enriquecimento de produto (descrição SEO + campos factuais quando houver evidência).
 * Auth: header `x-api-key` = `MACOFEL_ENRICH_API_KEY` no `.env`.
 *
 * @see lib/macofel-ai-studio-enrichment.ts — Gemini.
 * @see lib/ollama-product-enrichment.ts — se `MACOFEL_ENRICH_BACKEND=ollama`.
 */
export async function POST(request: NextRequest) {
  if (!MACOFEL_ENRICH_API_KEY) {
    return NextResponse.json(
      {
        code: 'NOT_CONFIGURED',
        message:
          'MACOFEL_ENRICH_API_KEY não definida. Gere um segredo no .env e envie-o em x-api-key.',
      },
      { status: 503 }
    );
  }

  const key = request.headers.get('x-api-key');
  if (key !== MACOFEL_ENRICH_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  if (MACOFEL_ENRICH_BACKEND === 'gemini' && !GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      { code: 'NO_GEMINI', message: 'GEMINI_API_KEY não configurada.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: 'BAD_JSON', message: 'Corpo inválido (esperado JSON).' },
      { status: 400 }
    );
  }

  const parsed = enrichProductInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: 'VALIDATION_ERROR',
        message: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  if (parsed.data.persist && !ObjectId.isValid(parsed.data.productId)) {
    return NextResponse.json(
      {
        code: 'BAD_PRODUCT_ID',
        message:
          'Com persist=true, productId tem de ser um ObjectId Mongo válido (24 hex).',
      },
      { status: 400 }
    );
  }

  try {
    const { persist, ...enrichInput } = parsed.data;
    const data =
      MACOFEL_ENRICH_BACKEND === 'ollama'
        ? await enrichProductWithOllama(enrichInput)
        : await enrichProductWithGemini(enrichInput);
    if (data.confidence < 0.2) {
      return NextResponse.json(
        {
          code: 'LOW_CONFIDENCE',
          message:
            'Confiança demasiado baixa; reveja referências ou dados de entrada.',
          partial: data,
        },
        { status: 422 }
      );
    }

    if (persist) {
      const p = await persistAiStudioProductEnrichment(
        parsed.data.productId,
        data
      );
      if (!p.ok && p.reason === 'Produto não encontrado') {
        return NextResponse.json({ ...data, persist: p }, { status: 404 });
      }
      return NextResponse.json({ ...data, persist: p }, { status: 200 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e: unknown) {
    const code =
      e instanceof Error && (e as Error & { code?: string }).code ===
        'INSUFFICIENT_DESCRIPTION'
        ? 'INSUFFICIENT_DESCRIPTION'
        : null;
    if (code === 'INSUFFICIENT_DESCRIPTION') {
      return NextResponse.json(
        {
          code: 'INSUFFICIENT_DESCRIPTION',
          message: e instanceof Error ? e.message : String(e),
        },
        { status: 422 }
      );
    }
    console.error('[enrich-product]', e);
    return NextResponse.json(
      {
        code: 'INTERNAL_ERROR',
        message: e instanceof Error ? e.message : 'Erro ao processar IA',
      },
      { status: 500 }
    );
  }
}
