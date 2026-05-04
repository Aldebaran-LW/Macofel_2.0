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
    <div className="space-y-8 md:space-y-10 text-slate-700 leading-relaxed text-lg md:text-xl max-w-none">
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
              <h3 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 mb-4 md:mb-5 border-b border-slate-200 pb-3 md:pb-4">
                {title}
              </h3>
              <div className="whitespace-pre-line text-slate-700 leading-[1.65] md:leading-[1.7] max-w-[85ch]">
                {body}
              </div>
            </section>
          );
        }
        return (
          <p
            key={i}
            className="whitespace-pre-line text-slate-700 leading-[1.65] md:leading-[1.7] max-w-[85ch]"
          >
            {block.trim()}
          </p>
        );
      })}
    </div>
  );
}
