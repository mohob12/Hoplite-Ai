import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import { useSettings } from '../lib/settings';
import { formatDA, formatDateTime, loc } from '../lib/format';
import OrderTracker from '../components/OrderTracker';
import type { PublicOrder } from '../lib/types';

const REFRESH_MS = 8_000;

export default function OrderPage() {
  const { reference = '' } = useParams();
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const { t, locale } = useI18n();
  const settings = useSettings();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading');

  const load = useCallback(async () => {
    if (!/^[0-9a-f-]{36}$/i.test(token)) {
      setState('missing');
      return;
    }
    const { data, error } = await supabase.rpc('get_order_public', { p_reference: reference, p_token: token });
    if (error) {
      setState((s) => (s === 'ok' ? s : 'error'));
      return;
    }
    if (!data) {
      setState('missing');
      return;
    }
    setOrder(data as PublicOrder);
    setState('ok');
  }, [reference, token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Customers have no realtime access to orders; a light poll keeps the tracker current
  // until the order reaches a final state.
  const final = order ? ['completed', 'cancelled', 'rejected'].includes(order.status) : false;
  useEffect(() => {
    if (final) return;
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load, final]);

  if (state !== 'ok' || !order) {
    return (
      <div className="page page-narrow">
        <div className="card card-pad stack" style={{ textAlign: 'center' }}>
          <p className={state === 'loading' ? 'muted' : ''}>
            {state === 'loading' ? t('common.loading') : state === 'missing' ? t('conf.notFound') : t('common.error')}
          </p>
          {state === 'error' && (
            <button className="btn" onClick={() => void load()}>
              {t('common.retry')}
            </button>
          )}
          <Link to="/" className="btn btn-primary">
            {t('conf.back')}
          </Link>
        </div>
      </div>
    );
  }

  const isDelivery = order.order_type === 'delivery';
  const pending = order.delivery_fee_status === 'pending';

  return (
    <div className="page page-narrow stack" style={{ gap: 18 }} data-testid="order-confirmation">
      <div className="card confirm-hero">
        <div className="confirm-check" aria-hidden="true">
          ✓
        </div>
        <h1 style={{ marginBottom: 4 }}>{t('conf.title')}</h1>
        <p className="muted">{t('conf.subtitle')}</p>
        <div style={{ marginTop: 14 }}>
          <div className="muted small">{t('conf.number')}</div>
          <div className="order-ref num" data-testid="order-reference">
            {order.reference}
          </div>
        </div>
      </div>

      <OrderTracker
        type={order.order_type}
        status={order.status}
        since={order.status_changed_at}
        feeStatus={order.delivery_fee_status}
      />

      <section className="card card-pad stack">
        <dl className="kv">
          <dt>{t('conf.type')}</dt>
          <dd data-testid="order-type">{t(`type.${order.order_type}`)}</dd>
          <dt>{t('f.name')}</dt>
          <dd>{order.customer_name}</dd>
          {order.table_number && (
            <>
              <dt>{t('conf.table')}</dt>
              <dd>
                <span className="table-badge num" data-testid="table-badge">
                  {order.table_number}
                </span>
              </dd>
            </>
          )}
          {order.customer_phone && (
            <>
              <dt>{t('f.phone')}</dt>
              <dd className="num">{order.customer_phone}</dd>
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
          <dt>{t('conf.payment')}</dt>
          <dd data-testid="order-payment">💵 {t(`pay.${order.order_type}`)}</dd>
        </dl>
      </section>

      <section className="card card-pad stack">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t('conf.items')}</h2>
        <table className="items-table">
          <tbody>
            {order.items.map((it, i) => (
              <tr key={i} data-testid="confirmation-item">
                <td className="num" style={{ fontWeight: 800, width: 40 }}>
                  {it.quantity}×
                </td>
                <td>
                  <div style={{ fontWeight: 700 }}>{loc(it, 'product_name', locale)}</div>
                  {loc(it, 'variant_name', locale) && <div className="small muted">{loc(it, 'variant_name', locale)}</div>}
                  {(it.extras ?? []).map((e, j) => (
                    <div key={j} className="small muted">
                      + {loc(e, 'name', locale)}
                    </div>
                  ))}
                </td>
                <td className="end num">{formatDA(it.line_total, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="summary">
          <div className="line">
            <span>{t('sum.subtotal')}</span>
            <strong className="num" data-testid="conf-subtotal">
              {formatDA(order.subtotal, locale)}
            </strong>
          </div>
          {isDelivery && (
            <div className="line">
              <span>{t('sum.deliveryFee')}</span>
              {pending ? (
                <span className="pending" data-testid="conf-fee">
                  {t('sum.pending')}
                </span>
              ) : (
                <strong className="num" data-testid="conf-fee">
                  {formatDA(order.delivery_fee ?? 0, locale)}
                </strong>
              )}
            </div>
          )}
          <div className="line total">
            <span>{isDelivery ? (pending ? t('sum.estimated') : t('sum.final')) : t('sum.total')}</span>
            <span className="num" data-testid="conf-total">
              {formatDA(order.total, locale)}
            </span>
          </div>
          {isDelivery && pending && <p className="small muted">{t('sum.deliveryNotice')}</p>}
        </div>
      </section>

      {settings && (
        <section className="card card-pad stack">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t('conf.contact')}</h2>
          <div className="row wrap">
            {settings.phone && (
              <a className="btn btn-dark" href={`tel:${settings.phone.replace(/\s/g, '')}`}>
                📞 <span className="num">{settings.phone}</span>
              </a>
            )}
            {settings.phone_secondary && (
              <a className="btn" href={`tel:${settings.phone_secondary.replace(/\s/g, '')}`}>
                <span className="num">{settings.phone_secondary}</span>
              </a>
            )}
          </div>
          <p className="muted small">{loc(settings, 'address', locale)}</p>
        </section>
      )}

      <p className="muted small" style={{ textAlign: 'center' }}>
        {t('conf.live')} {t('conf.keep')}
      </p>
      <Link to="/" className="btn btn-primary" style={{ alignSelf: 'center' }}>
        {t('conf.back')}
      </Link>
    </div>
  );
}
