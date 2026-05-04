'use client';

/**
 * Formata descrições longas vindas do catálogo (ex.: blocos "Secção:\n" + corpo).
 * Evita o "paredão" de texto: parágrafos, quebras e títulos de secção visíveis.
 */
export function ProductDescriptionFormatted({ text }: { text: string }) {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return null;

  const blocks = trimmed.split(/\n\n+/).filter((b) => b.trim());

  return (
    <div className="space-y-6 text-slate-600 leading-relaxed text-base max-w-prose">
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        const first = (lines[0] ?? '').trim();
        /** Linha só com "Título:" (padrão dos textos gerados) */
        const isSectionTitle = /^.{2,100}:$/.test(first);
        if (isSectionTitle && lines.length > 1) {
          const title = first.replace(/:+$/, '').trim();
          const body = lines
            .slice(1)
            .join('\n')
            .trim();
          return (
            <section key={i} className="scroll-mt-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 border-b border-slate-100 pb-2">
                {title}
              </h3>
              <div className="whitespace-pre-line text-slate-600">{body}</div>
            </section>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line text-slate-600">
            {block.trim()}
          </p>
        );
      })}
    </div>
  );
}
