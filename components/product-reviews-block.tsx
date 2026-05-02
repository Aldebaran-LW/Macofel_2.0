'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Star, StarHalf } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  authorLabel: string;
};

type ReviewStats = {
  averageRating: number | null;
  count: number;
  canReview: boolean;
  alreadyReviewed: boolean;
  reviews: ReviewItem[];
};

function StarsVisual({
  average,
  count,
  sizeClass = 'w-4 h-4',
}: {
  average: number;
  count: number;
  sizeClass?: string;
}) {
  if (count === 0) {
    return (
      <div className="flex gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className={`${sizeClass} fill-amber-400 text-amber-400`} aria-hidden />
        ))}
      </div>
    );
  }

  const stars: ReactNode[] = [];
  for (let i = 1; i <= 5; i++) {
    if (average >= i) {
      stars.push(
        <Star key={i} className={`${sizeClass} fill-amber-400 text-amber-400`} aria-hidden />
      );
    } else if (average >= i - 0.5) {
      stars.push(
        <StarHalf key={i} className={`${sizeClass} fill-amber-400 text-amber-400`} aria-hidden />
      );
    } else {
      stars.push(<Star key={i} className={`${sizeClass} text-slate-200`} aria-hidden />);
    }
  }
  return <div className="flex gap-0.5">{stars}</div>;
}

export default function ProductReviewsBlock({ productSlug }: { productSlug: string }) {
  const { status } = useSession();
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratingPick, setRatingPick] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(productSlug)}/reviews`, {
        credentials: 'include',
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [productSlug]);

  useEffect(() => {
    load();
  }, [load, status]);

  const avg = stats?.averageRating ?? 0;
  const count = stats?.count ?? 0;

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!stats?.canReview || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(productSlug)}/reviews`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: ratingPick, comment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data?.error === 'string' ? data.error : 'Não foi possível enviar');
        return;
      }
      toast.success('Obrigado pela avaliação!');
      setComment('');
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {loading ? (
          <div className="h-5 w-36 animate-pulse rounded bg-slate-100" />
        ) : (
          <>
            <StarsVisual average={count === 0 ? 5 : avg} count={count} />
            <span className="text-sm text-slate-400 font-medium">
              {count === 0 ? (
                <>Sem avaliações ainda</>
              ) : (
                <>
                  <span className="text-slate-700 font-semibold">{avg.toFixed(1).replace('.', ',')}</span>
                  {' · '}
                  {count === 1 ? '1 avaliação' : `${count} avaliações`}
                </>
              )}
            </span>
          </>
        )}
      </div>

      {!loading && stats && stats.reviews.length > 0 && (
        <ul className="space-y-3 border-t border-slate-100 pt-4">
          {stats.reviews.slice(0, 8).map((r) => (
            <li key={r.id} className="text-sm">
              <div className="flex items-center gap-2 mb-1">
                <StarsVisual average={r.rating} count={1} sizeClass="w-3 h-3" />
                <span className="font-semibold text-slate-800">{r.authorLabel}</span>
                <span className="text-xs text-slate-400">
                  {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              {r.comment ? (
                <p className="text-slate-600 leading-relaxed pl-1">{r.comment}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {!loading && stats?.alreadyReviewed && (
        <p className="text-sm text-emerald-700 font-medium">Obrigado — já registámos a sua avaliação.</p>
      )}

      {!loading && stats?.canReview && status === 'authenticated' && (
        <form onSubmit={submitReview} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Avaliar produto</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">Sua nota:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRatingPick(n)}
                  className="p-0.5 rounded hover:bg-amber-50 transition-colors"
                  aria-label={`${n} estrelas`}
                >
                  <Star
                    className={`w-7 h-7 ${
                      n <= ratingPick ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Comentário (opcional)"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 transition-colors"
          >
            {submitting ? 'A enviar…' : 'Publicar avaliação'}
          </button>
          <p className="text-[11px] text-slate-500">
            Só quem concluiu uma compra deste produto pode avaliar.
          </p>
        </form>
      )}

      {!loading && stats && !stats.canReview && !stats.alreadyReviewed && status === 'authenticated' && (
        <p className="text-xs text-slate-500">
          Para avaliar, é necessário ter um pedido <strong className="font-semibold text-slate-600">concluído</strong>{' '}
          que inclua este produto.
        </p>
      )}

      {status === 'unauthenticated' && !loading && stats && (stats.count > 0 || stats.canReview) && (
        <p className="text-xs text-slate-500">Inicie sessão para ver se pode avaliar este produto.</p>
      )}
    </div>
  );
}
