import { useI18n } from '../../lib/i18n';
import { useOrdersFeed } from '../../lib/ordersFeed';
import OrderCard from '../../components/admin/OrderCard';
import { ActivateBanner } from '../../components/admin/StatusIndicators';

export default function Dashboard() {
  const { t } = useI18n();
  const { orders, counts, fresh, loading, error, refresh } = useOrdersFeed();
  const incoming = orders.filter((o) => o.status === 'new');
  const active = orders
    .filter((o) => ['confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

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

      {error && (
        <div className="alert alert-error row">
          <span>{t('common.error')}</span>
          <div className="spacer" />
          <button className="btn btn-sm" onClick={() => void refresh()}>
            {t('common.retry')}
          </button>
        </div>
      )}

      <section className="stack" style={{ gap: 14 }}>
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
