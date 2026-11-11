import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import { formatDateTime } from '../lib/format';

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export default function ReviewsPage() {
  const { t, locale } = useI18n();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  useEffect(() => {
    supabase
      .from('customer_reviews')
      .select('id, customer_name, rating, comment, created_at')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setReviews((data ?? []) as Review[]));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setStatus('sending');
    const { error } = await supabase
      .from('customer_reviews')
      .insert({ customer_name: name.trim(), rating, comment: comment.trim() });
    setStatus(error ? 'error' : 'done');
  }

  return (
    <div className="page page-narrow stack" style={{ gap: 20 }}>
      <h1>{t('rev.title')}</h1>
      <div className="stack">
        {reviews.length === 0 && <p className="muted">{t('rev.none')}</p>}
        {reviews.map((r) => (
          <article key={r.id} className="card card-pad stack" style={{ gap: 6 }}>
            <div className="row">
              <strong>{r.customer_name}</strong>
              <span className="stars" aria-label={`${r.rating}/5`}>
                {'★'.repeat(r.rating)}
              </span>
              <div className="spacer" />
              <span className="muted small num">{formatDateTime(r.created_at, locale)}</span>
            </div>
            {r.comment && <p>{r.comment}</p>}
          </article>
        ))}
      </div>

      <form className="card card-pad stack" onSubmit={submit}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{t('rev.write')}</h2>
        {status === 'done' ? (
          <div className="alert alert-info">{t('rev.thanks')}</div>
        ) : (
          <>
            <label className="field">
              <span>{t('rev.name')}</span>
              <input className="input" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="field">
              <span>{t('rev.rating')}</span>
              <div className="star-input" role="radiogroup" aria-label={t('rev.rating')}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={n <= rating ? 'on' : ''}
                    onClick={() => setRating(n)}
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n}/5`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <label className="field">
              <span>{t('rev.comment')}</span>
              <textarea className="textarea" maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
            </label>
            {status === 'error' && <div className="alert alert-error">{t('common.error')}</div>}
            <button className="btn btn-primary" disabled={status === 'sending'}>
              {status === 'sending' ? t('common.saving') : t('rev.submit')}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
