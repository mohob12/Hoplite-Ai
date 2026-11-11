import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';
import { useSettings } from '../../lib/settings';
import { formatDA, formatDateTime, loc } from '../../lib/format';
import { fetchOrder } from '../../lib/orderActions';
import type { Order } from '../../lib/types';

export default function Receipt() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const settings = useSettings();
  const [order, setOrder] = useState<Order | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (id) fetchOrder(id).then(setOrder).catch(() => setFailed(true));
  }, [id]);

  useEffect(() => {
    if (order && settings) {
      const timer = setTimeout(() => window.print(), 300);
      return () => clearTimeout(timer);
    }
  }, [order, settings]);

  if (failed) return <p className="receipt">{t('common.error')}</p>;
  if (!order) return <p className="receipt">{t('common.loading')}</p>;

  const pending = order.delivery_fee_status === 'pending';
  return (
    <>
      <div className="print-actions">
        <button className="btn btn-primary" onClick={() => window.print()}>
          🖨 {t('dash.print')}
        </button>
        <button className="btn" onClick={() => window.close()}>
          {t('common.close')}
        </button>
      </div>
      <div className="receipt" data-testid="receipt">
        <h1>{settings?.name ?? 'Mac Kiffan'}</h1>
        <div className="center">{settings && loc(settings, 'address', locale)}</div>
        <div className="center num">{settings?.phone}</div>
        <hr />
        <div className="center big num">{order.reference}</div>
        <div className="center">
          {t(`type.${order.order_type}`)} · <span className="num">{formatDateTime(order.created_at, locale)}</span>
        </div>
        <hr />
        <div>
          {t('f.name')}: <strong>{order.customer_name}</strong>
        </div>
        {order.customer_phone && (
          <div>
            {t('f.phone')}: <span className="num">{order.customer_phone}</span>
          </div>
        )}
        {order.table_number && (
          <div>
            {t('conf.table')}: <strong className="num">{order.table_number}</strong>
          </div>
        )}
        {order.delivery_address && (
          <div>
            {t('conf.address')}: {order.delivery_address}
          </div>
        )}
        <hr />
        <table>
          <tbody>
            {(order.order_items ?? []).map((it, i) => (
              <tr key={it.id ?? i}>
                <td>
                  <strong className="num">{it.quantity}×</strong> {loc(it, 'product_name', locale)}
                  {loc(it, 'variant_name', locale) && ` (${loc(it, 'variant_name', locale)})`}
                  {(it.order_item_extras ?? []).map((e, j) => (
                    <div key={j}>&nbsp;&nbsp;+ {loc(e, 'name', locale)}</div>
                  ))}
                </td>
                <td className="end num">{formatDA(it.line_total, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {order.notes && (
          <>
            <hr />
            <div>
              {t('od.notes')}: {order.notes}
            </div>
          </>
        )}
        <hr />
        <table>
          <tbody>
            <tr>
              <td>{t('sum.subtotal')}</td>
              <td className="end num">{formatDA(order.subtotal, locale)}</td>
            </tr>
            {order.order_type === 'delivery' && (
              <tr>
                <td>{t('sum.deliveryFee')}</td>
                <td className="end num">{pending ? t('sum.pending') : formatDA(order.delivery_fee ?? 0, locale)}</td>
              </tr>
            )}
            <tr className="big">
              <td>{order.order_type === 'delivery' && pending ? t('sum.estimated') : t('sum.total')}</td>
              <td className="end num">{formatDA(order.total, locale)}</td>
            </tr>
          </tbody>
        </table>
        <hr />
        <div className="center">{t(`pay.${order.order_type}`)}</div>
        <div className="center">{t('rc.thanks')}</div>
      </div>
    </>
  );
}
