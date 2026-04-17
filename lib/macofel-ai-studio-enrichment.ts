import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { z } from 'zod';
import {
  CATALOG_AGENT_GEMINI_MODEL,
  GEMINI_API_KEY,
  GEMINI_ENRICH_MODEL,
} from '@/env';

export const MACRO_CATEGORY_SLUGS = [
  'cimento-argamassa',
  'tijolos-blocos',
  'tintas-acessorios',
  'ferramentas',
  'material-hidraulico',
  'material-eletrico',
] as const;

export type MacroCategorySlug = (typeof MACRO_CATEGORY_SLUGS)[number];

export const enrichProductInputSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  codBarra: z.string().optional(),
  codigo: z.string().min(1),
  marca: z.string().optional(),
  description: z.string().optional(),
  categoryHint: z.string().optional(),
  referenceUrls: z.array(z.string().url()).max(3).optional(),
  /** Se true, grava o resultado em `products` (Mongo) após o Gemini. */
  persist: z.boolean().optional(),
});

export type EnrichProductInput = z.infer<typeof enrichProductInputSchema>;

export const enrichProductOutputSchema = z.object({
  description: z.string(),
  imageUrls: z.array(z.string()),
  imageUrl: z.string().nullable().optional(),
  weight: z.number().nullable().optional(),
  dimensionsCm: z.string().nullable().optional(),
  macroCategorySlug: z.enum(MACRO_CATEGORY_SLUGS),
  confidence: z.number().min(0).max(1),
  notes: z.string(),
});

export type EnrichProductOutput = z.infer<typeof enrichProductOutputSchema>;

/** Limite de injeção via URL: no máx. 3 URLs, cada uma até 500 caracteres. */
export function sanitizeReferenceUrls(urls: string[] | undefined): string[] {
  if (!urls?.length) return [];
  return urls
    .slice(0, 3)
    .map((u) => String(u).trim().slice(0, 500))
    .filter((u) => /^https?:\/\//i.test(u));
}

export const MACOFEL_ENRICHMENT_SYSTEM_INSTRUCTION = `És um assistente especializado em catálogo de materiais de construção no Brasil (pt-BR).

Tarefa: gerar conteúdo técnico e otimizado para SEO e preencher campos factuais quando houver evidência.

Regras:
- Não inventes peso, dimensões nem URLs de imagem. Só inclui peso, dimensionsCm ou URLs de imagem se estiverem explicitamente nos dados de entrada ou nas URLs de referência (texto/URL claramente identificáveis como imagem .jpg, .jpeg, .png, .webp). Caso contrário usa null ou listas vazias.
- Descrição longa: entre 180 e 280 palavras. Benefícios, aplicação técnica, durabilidade, normas ou contexto de uso quando fizer sentido. Tom profissional; evita adjetivos vazios ("maravilhoso", "incrível").
- Imagens: imageUrls só com links https diretos de ficheiros de imagem quando houver evidência; senão [].
- Categorização: escolhe exatamente um destes slugs: cimento-argamassa, tijolos-blocos, tintas-acessorios, ferramentas, material-hidraulico, material-eletrico.
- confidence: 0 a 1, coerente com a quantidade de dados factuais disponíveis.
- notes: breve (ex.: dados em falta, avisos).

Resposta: apenas JSON válido conforme o schema (sem markdown).`;

export function buildEnrichmentUserPrompt(input: EnrichProductInput): string {
  const refs = sanitizeReferenceUrls(input.referenceUrls);
  const refBlock =
    refs.length > 0
      ? refs.map((u, i) => `  ${i + 1}. ${u}`).join('\n')
      : '  (nenhuma)';
  return `Gere o enriquecimento para o produto abaixo:

- Nome: ${input.name}
- Marca: ${input.marca ?? '(não indicada)'}
- EAN: ${input.codBarra ?? '(não indicado)'}
- SKU/Código: ${input.codigo}
- Descrição atual (curta): ${input.description ?? '(vazia)'}
- Categoria sugerida: ${input.categoryHint ?? '(não indicada)'}
- Referências (URLs, até 3):
${refBlock}`;
}

/** Schema Gemini (tipagem do SDK é estrita; validação final fica no Zod). */
function geminiResponseSchema(): object {
  return {
    type: SchemaType.OBJECT,
    properties: {
      description: { type: SchemaType.STRING },
      imageUrls: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
      },
      imageUrl: { type: SchemaType.STRING, nullable: true },
      weight: { type: SchemaType.NUMBER, nullable: true },
      dimensionsCm: { type: SchemaType.STRING, nullable: true },
      macroCategorySlug: { type: SchemaType.STRING },
      confidence: { type: SchemaType.NUMBER },
      notes: { type: SchemaType.STRING },
    },
    required: [
      'description',
      'imageUrls',
      'macroCategorySlug',
      'confidence',
      'notes',
    ],
  };
}

function countWordsPt(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Chama Gemini com saída JSON estruturada (AI Studio / mesmo padrão do catálogo).
 */
export async function enrichProductWithGemini(
  input: EnrichProductInput
): Promise<EnrichProductOutput> {
  if (!GEMINI_API_KEY?.trim()) {
    throw new Error('GEMINI_API_KEY não configurada');
  }

  const modelName =
    GEMINI_ENRICH_MODEL ||
    CATALOG_AGENT_GEMINI_MODEL?.trim() ||
    'gemini-2.0-flash';
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: MACOFEL_ENRICHMENT_SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.35,
      responseMimeType: 'application/json',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- responseSchema do SDK vs. tipos gerados
      responseSchema: geminiResponseSchema() as any,
    },
  });

  const prompt = buildEnrichmentUserPrompt(input);
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    throw new Error('Resposta do modelo não é JSON válido');
  }

  const parsed = enrichProductOutputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `JSON inválido do modelo: ${parsed.error.errors.map((e) => e.message).join('; ')}`
    );
  }

  const out = parsed.data;
  const words = countWordsPt(out.description);
  if (words < 160) {
    const err = new Error('Descrição demasiado curta face ao pedido (mín. ~180 palavras).');
    (err as Error & { code?: string }).code = 'INSUFFICIENT_DESCRIPTION';
    throw err;
  }

  return out;
}
