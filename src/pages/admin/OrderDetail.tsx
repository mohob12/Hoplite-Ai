import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';
import { formatDA, formatDateTime, loc } from '../../lib/format';
import { fetchOrder } from '../../lib/orderActions';
import { useOrdersFeed } from '../../lib/ordersFeed';
import { DeliveryFeeEditor, OrderActions, StatusBadge, TotalsBlock, TypeBadge } from '../../components/admin/OrderCard';
import type { Order } from '../../lib/types';

export default function OrderDetail() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const { orders } = useOrdersFeed();
  const [loaded, setLoaded] = useState<Order | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading');

  // Prefer the live feed copy (realtime-updated) when present.
  const live = orders.find((o) => o.id === id);
  const order = live && live.order_items ? live : loaded;

  useEffect(() => {
    if (!id) return;
    fetchOrder(id)
      .then((o) => {
        setLoaded(o);
        setState(o ? 'ok' : 'missing');
      })
      .catch(() => setState('error'));
  }, [id, live?.updated_at]);

  if (!order) {
    return <p className="muted">{state === 'loading' ? t('common.loading') : state === 'missing' ? t('conf.notFound') : t('common.error')}</p>;
  }

  return (
    <>
      <div className="row wrap">
        <Link to="/admin" className="btn btn-sm btn-ghost">
          ← {t('od.back')}
        </Link>
        <h1 className="num">{order.reference}</h1>
        <StatusBadge status={order.status} />
        <TypeBadge type={order.order_type} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>
        <section className="panel stack">
          <h2>{t('od.customer')}</h2>
          <dl className="kv">
            <dt>{t('f.name')}</dt>
            <dd>{order.customer_name}</dd>
            {order.customer_phone && (
              <>
                <dt>{t('f.phone')}</dt>
                <dd>
                  <a className="num" href={`tel:${order.customer_phone}`}>
                    {order.customer_phone}
                  </a>
                </dd>
              </>
            )}
            {order.table_number && (
              <>
                <dt>{t('conf.table')}</dt>
                <dd className="num">{order.table_number}</dd>
              </>
            )}
            {order.delivery_address && (
              <>
                <dt>{t('conf.address')}</dt>
                <dd>{order.delivery_address}</dd>
              </>
            )}
            <dt>{t('rc.date')}</dt>
            <dd className="num">{formatDateTime(order.created_at, locale)}</dd>
            <dt>{t('od.timeline')}</dt>
            <dd className="num">{formatDateTime(order.status_changed_at, locale)}</dd>
            <dt>{t('conf.payment')}</dt>
            <dd>💵 {t(`pay.${order.order_type}`)}</dd>
          </dl>
          <div>
            <strong>{t('od.notes')}</strong>
            {order.notes ? <div className="ocard-note" style={{ marginTop: 6 }}>{order.notes}</div> : <p className="muted">{t('od.noNotes')}</p>}
          </div>
        </section>

        <section className="panel stack">
          <h2>{t('conf.items')}</h2>
          <table className="items-table">
            <thead>
              <tr>
                <th>{t('od.qty')}</th>
                <th></th>
                <th className="end">{t('od.unitPrice')}</th>
                <th className="end">{t('od.line')}</th>
              </tr>
            </thead>
            <tbody>
              {(order.order_items ?? []).map((it, i) => (
                <tr key={it.id ?? i}>
                  <td className="num" style={{ fontWeight: 800 }}>
                    {it.quantity}×
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{loc(it, 'product_name', locale)}</div>
                    {loc(it, 'variant_name', locale) && <span className="badge badge-yellow">{loc(it, 'variant_name', locale)}</span>}
                    {(it.order_item_extras ?? []).map((e, j) => (
                      <div key={j} className="small muted">
                        + {loc(e, 'name', locale)} <span className="num">({formatDA(e.price, locale)})</span>
                      </div>
                    ))}
                  </td>
                  <td className="end num">{formatDA(it.unit_price + it.extras_unit_total, locale)}</td>
                  <td className="end num">{formatDA(it.line_total, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {order.order_type === 'delivery' && (
            <div className="stack" style={{ gap: 6 }}>
              <strong>{t('fee.title')}</strong>
              <DeliveryFeeEditor order={order} key={`${order.id}-${order.delivery_fee}`} onSaved={setLoaded} />
            </div>
          )}
          <TotalsBlock order={order} />
          <div className="row wrap">
            <OrderActions order={order} showDetails={false} />
          </div>
        </section>
      </div>
    </>
  );
}
