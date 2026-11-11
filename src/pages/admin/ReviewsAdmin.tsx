import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { formatDateTime } from '../../lib/format';
import { amError } from './menu/shared';
import './admin-manage.css';

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  is_approved: boolean;
  created_at: string;
}

type Filter = 'all' | 'pending' | 'approved';

export default function ReviewsAdmin() {
  const { t, locale } = useI18n();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('customer_reviews')
      .select('*')
      .order('created_at', { ascending: false });
    if (err) setError(amError(err, t));
    else {
      setError('');
      setReviews(data as Review[]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = useMemo(() => (reviews ?? []).filter((r) => !r.is_approved).length, [reviews]);
  const shown = useMemo(
    () =>
      (reviews ?? []).filter((r) => (filter === 'all' ? true : filter === 'pending' ? !r.is_approved : r.is_approved)),
    [reviews, filter],
  );

  async function toggle(r: Review) {
    setBusyId(r.id);
    const { error: err } = await supabase.from('customer_reviews').update({ is_approved: !r.is_approved }).eq('id', r.id);
    if (err) setError(amError(err, t));
    else await load();
    setBusyId(null);
  }

  async function remove(r: Review) {
    if (!window.confirm(t('am.rev.confirmDelete'))) return;
    setBusyId(r.id);
    const { error: err } = await supabase.from('customer_reviews').delete().eq('id', r.id);
    if (err) setError(amError(err, t));
    else await load();
    setBusyId(null);
  }

  return (
    <div className="am-page">
      <div className="am-head">
        <h1>{t('am.rev.title')}</h1>
        {pendingCount > 0 && <span className="badge badge-yellow">{t('am.rev.pendingCount', { n: pendingCount })}</span>}
      </div>

      <div className="am-seg">
        {(['all', 'pending', 'approved'] as const).map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-dark' : ''}`}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {t(`am.rev.filter.${f}`)}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!reviews && !error && <div className="muted">{t('common.loading')}</div>}
      {reviews && shown.length === 0 && <div className="panel muted">{t('am.rev.empty')}</div>}

      <div className="am-list">
        {shown.map((r) => (
          <article className="panel am-item" key={r.id}>
            <div className="am-item-head">
              <strong>{r.customer_name}</strong>
              <span className="am-stars" aria-label={`${r.rating}/5`}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className={i <= r.rating ? 'on' : ''}>
                    ★
                  </span>
                ))}
              </span>
              <span className={`badge ${r.is_approved ? 'badge-dark' : 'badge-yellow'}`}>
                {r.is_approved ? t('am.rev.approved') : t('am.rev.pending')}
              </span>
              <span className="spacer" />
              <span className="muted small">{formatDateTime(r.created_at, locale)}</span>
            </div>
            {r.comment ? <p className="am-comment">{r.comment}</p> : <p className="muted">{t('am.rev.noComment')}</p>}
            <div className="row wrap">
              <button
                className={`btn btn-sm ${r.is_approved ? '' : 'btn-primary'}`}
                disabled={busyId === r.id}
                onClick={() => toggle(r)}
              >
                {r.is_approved ? t('am.rev.unapprove') : t('am.rev.approve')}
              </button>
              <button className="btn btn-sm btn-outline-red" disabled={busyId === r.id} onClick={() => remove(r)}>
                {t('am.delete')}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
