import { useState } from 'react';
import { useI18n } from '../../lib/i18n';
import { useOrdersFeed } from '../../lib/ordersFeed';
import { OPEN_STATUSES } from '../../lib/format';
import OrderCard from '../../components/admin/OrderCard';
import { ActivateBanner } from '../../components/admin/StatusIndicators';
import type { OrderType } from '../../lib/types';

// 'in_progress' = accepted orders not yet completed (all types), without the new ones.
type TypeFilter = OrderType | 'all' | 'in_progress';
const FILTER_KEY = 'mk.dash.typeFilter';
const FILTERS: { value: TypeFilter; icon: string }[] = [
  { value: 'all', icon: '' },
  { value: 'dine_in', icon: '🍽' },
  { value: 'takeaway', icon: '🥡' },
  { value: 'delivery', icon: '🛵' },
  { value: 'in_progress', icon: '👨‍🍳' },
];

function savedFilter(): TypeFilter {
  const v = localStorage.getItem(FILTER_KEY);
  return v === 'dine_in' || v === 'takeaway' || v === 'delivery' || v === 'in_progress' ? v : 'all';
}

function filterLabel(f: TypeFilter, t: (k: string) => string): string {
  if (f === 'all') return t('common.all');
  if (f === 'in_progress') return t('dash.inProgress');
  return t(`type.${f}`);
}

export default function Dashboard() {
  const { t } = useI18n();
  const { orders, counts, fresh, loading, error, refresh } = useOrdersFeed();
  const [filter, setFilterState] = useState<TypeFilter>(savedFilter);
  const setFilter = (f: TypeFilter) => {
    localStorage.setItem(FILTER_KEY, f);
    setFilterState(f);
  };

  const open = orders.filter((o) => OPEN_STATUSES.includes(o.status));
  const apply = (f: TypeFilter) =>
    f === 'all' ? open : f === 'in_progress' ? open.filter((o) => o.status !== 'new') : open.filter((o) => o.order_type === f);
  const tally = (f: TypeFilter) => {
    const list = apply(f);
    return { total: list.length, fresh: list.filter((o) => o.status === 'new').length };
  };
  // First come, first served: oldest order at the top, newest at the bottom.
  const shown = apply(filter)
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.order_number - b.order_number);
  const showIncoming = filter !== 'in_progress';
  const incoming = shown.filter((o) => o.status === 'new');
  const active = shown.filter((o) => o.status !== 'new');

  const stats: { key: keyof typeof counts; label: string; cls?: string }[] = [
    { key: 'new', label: t('dash.new'), cls: counts.new > 0 ? 'hot' : '' },
    { key: 'confirmed', label: t('dash.confirmed') },
    { key: 'preparing', label: t('dash.preparing'), cls: 'warm' },
    { key: 'ready', label: t('dash.ready') },
    { key: 'delivery', label: t('dash.delivery') },
    { key: 'today', label: t('dash.today') },
  ];

  return (
    <>
      <ActivateBanner />
      <h1>{t('admin.nav.dashboard')}</h1>

      <div className="stats">
        {stats.map((s) => (
          <div key={s.key} className={`stat ${s.cls ?? ''}`} data-testid={`stat-${s.key}`}>
            <div className="label">{s.label}</div>
            <div className="value num">{counts[s.key]}</div>
          </div>
        ))}
      </div>

      <div className="type-filter" role="group" aria-label={t('cart.orderType')} data-testid="type-filter">
        {FILTERS.map(({ value, icon }) => {
          const c = tally(value);
          return (
            <button
              key={value}
              type="button"
              className={value === 'in_progress' ? 'tf-status' : undefined}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              data-testid={`filter-${value}`}
            >
              {icon && <span aria-hidden="true">{icon}</span>}
              {filterLabel(value, t)}
              <span className="tf-count num">{c.total}</span>
              {c.fresh > 0 && (
                <span className="tf-new num" title={t('dash.new')}>
                  {c.fresh}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="alert alert-error row">
          <span>{t('common.error')}</span>
          <div className="spacer" />
          <button className="btn btn-sm" onClick={() => void refresh()}>
            {t('common.retry')}
          </button>
        </div>
      )}

      {showIncoming && (
        <section className="stack" style={{ gap: 14 }} data-testid="incoming-section">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
            {t('dash.incoming')} <span className="badge badge-solid-red num">{incoming.length}</span>
          </h2>
          {loading ? (
            <p className="muted">{t('common.loading')}</p>
          ) : incoming.length === 0 ? (
            <div className="panel muted" data-testid="no-incoming">
              {t('dash.noIncoming')}
            </div>
          ) : (
            <div className="orders-grid" data-testid="incoming-orders">
              {incoming.map((o) => (
                <OrderCard key={o.id} order={o} fresh={fresh.has(o.id)} />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="stack" style={{ gap: 14 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
          {t('dash.inProgress')} <span className="badge badge-dark num">{active.length}</span>
        </h2>
        {!loading && active.length === 0 ? (
          <div className="panel muted">{t('dash.noActive')}</div>
        ) : (
          <div className="orders-grid" data-testid="active-orders">
            {active.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
