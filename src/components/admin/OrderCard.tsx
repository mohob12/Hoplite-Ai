import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';
import { formatDA, formatDateTime, loc, nextStatus } from '../../lib/format';
import { OrderActionError, setDeliveryFee, setOrderStatus } from '../../lib/orderActions';
import { useOrdersFeed } from '../../lib/ordersFeed';
import type { Order, OrderStatus } from '../../lib/types';

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  const cls =
    status === 'new'
      ? 'badge-solid-red'
      : status === 'preparing'
        ? 'badge-yellow'
        : status === 'ready' || status === 'out_for_delivery'
          ? 'badge-dark'
          : status === 'cancelled' || status === 'rejected'
            ? 'badge-red'
            : 'badge-muted';
  return (
    <span className={`badge ${cls}`} data-testid="status-badge" data-status={status}>
      {t(`status.${status}`)}
    </span>
  );
}

export function TypeBadge({ type }: { type: Order['order_type'] }) {
  const { t } = useI18n();
  const icon = type === 'dine_in' ? '🍽' : type === 'takeaway' ? '🥡' : '🛵';
  return (
    <span className="badge badge-muted" style={{ color: 'inherit' }}>
      <span aria-hidden="true">{icon}</span> {t(`type.${type}`)}
    </span>
  );
}

export function OrderItemsList({ order }: { order: Order }) {
  const { locale } = useI18n();
  return (
    <ul className="ocard-items">
      {(order.order_items ?? []).map((it, i) => {
        const variant = loc(it, 'variant_name', locale);
        const extras = it.order_item_extras ?? [];
        return (
          <li key={it.id ?? i}>
            <span className="q num">{it.quantity}×</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>
                {loc(it, 'product_name', locale)}
                {variant && <span className="badge badge-yellow" style={{ marginInlineStart: 6 }}>{variant}</span>}
              </div>
              {extras.length > 0 && (
                <div className="sub">+ {extras.map((e) => loc(e, 'name', locale)).join('، ')}</div>
              )}
            </div>
            <span className="num">{formatDA(it.line_total, locale)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function TotalsBlock({ order }: { order: Order }) {
  const { t, locale } = useI18n();
  const isDelivery = order.order_type === 'delivery';
  const pending = order.delivery_fee_status === 'pending';
  return (
    <div className="summary">
      <div className="line">
        <span>{t('sum.subtotal')}</span>
        <span className="num">{formatDA(order.subtotal, locale)}</span>
      </div>
      {isDelivery && (
        <div className="line">
          <span>{t('sum.deliveryFee')}</span>
          {pending ? (
            <span className="pending">{t('sum.pending')}</span>
          ) : (
            <span className="num">{formatDA(order.delivery_fee ?? 0, locale)}</span>
          )}
        </div>
      )}
      <div className="line total">
        <span>{isDelivery && pending ? t('sum.estimated') : t('sum.total')}</span>
        <span className="num" data-testid="order-total">
          {formatDA(order.total, locale)}
        </span>
      </div>
      <div className="small muted">💵 {t(`pay.${order.order_type}`)}</div>
    </div>
  );
}

export function DeliveryFeeEditor({ order, onSaved }: { order: Order; onSaved?: (o: Order) => void }) {
  const { t, locale } = useI18n();
  const { applyOrder } = useOrdersFeed();
  const confirmed = order.delivery_fee_status === 'confirmed';
  const [editing, setEditing] = useState(!confirmed);
  const [value, setValue] = useState(order.delivery_fee?.toString() ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const closed = ['completed', 'cancelled', 'rejected'].includes(order.status);

  const fee = /^\d{1,6}$/.test(value.trim()) ? Number(value.trim()) : null;

  async function save() {
    if (fee === null) return;
    setBusy(true);
    setError('');
    try {
      const o = await setDeliveryFee(order.id, fee);
      applyOrder(o);
      onSaved?.(o);
      setEditing(false);
    } catch (e) {
      setError(t(e instanceof OrderActionError ? e.key : 'err.generic'));
    } finally {
      setBusy(false);
    }
  }

  if (!editing || closed) {
    return (
      <div className="row wrap" style={{ gap: 8 }}>
        <span className="badge badge-dark">✓ {t('fee.confirmed')}</span>
        <span className="num" style={{ fontWeight: 700 }}>
          {formatDA(order.delivery_fee ?? 0, locale)}
        </span>
        {!closed && (
          <button className="btn btn-sm btn-ghost" onClick={() => setEditing(true)}>
            {t('fee.change')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 8 }} data-testid="fee-editor">
      <div className="small muted">{t('fee.reviewAddress')}</div>
      <div className="row" style={{ alignItems: 'stretch' }}>
        <input
          className="input"
          inputMode="numeric"
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('fee.enter')}
          aria-label={t('fee.enter')}
          style={{ maxWidth: 160 }}
          data-testid="fee-input"
        />
        <button className="btn btn-yellow" disabled={fee === null || busy} onClick={save} data-testid="fee-confirm">
          {busy ? t('common.saving') : t('fee.confirm')}
        </button>
      </div>
      {fee !== null && (
        <div className="small">
          {t('fee.newTotal')}: <strong className="num">{formatDA(order.subtotal + fee, locale)}</strong>
        </div>
      )}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

export function useOrderActions(order: Order) {
  const { t } = useI18n();
  const { applyOrder } = useOrdersFeed();
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  const [error, setError] = useState('');

  async function go(status: OrderStatus, confirmKey?: string) {
    if (confirmKey && !window.confirm(t(confirmKey, { ref: order.reference }))) return;
    setBusy(status);
    setError('');
    try {
      applyOrder(await setOrderStatus(order.id, status));
    } catch (e) {
      setError(t(e instanceof OrderActionError ? e.key : 'err.generic'));
    } finally {
      setBusy(null);
    }
  }
  return { busy, error, go };
}

export function OrderActions({ order, showDetails = true }: { order: Order; showDetails?: boolean }) {
  const { t } = useI18n();
  const { busy, error, go } = useOrderActions(order);
  const next = nextStatus(order.order_type, order.status);
  const feeMissing = order.order_type === 'delivery' && order.delivery_fee_status !== 'confirmed';
  const closed = ['completed', 'cancelled', 'rejected'].includes(order.status);

  return (
    <>
      {order.status === 'new' ? (
        <>
          <button
            className="btn btn-primary"
            disabled={!!busy || feeMissing}
            title={feeMissing ? t('dash.feeRequired') : undefined}
            onClick={() => go('confirmed')}
            data-testid="accept-order"
          >
            ✓ {t('dash.accept')}
          </button>
          <button className="btn btn-outline-red" disabled={!!busy} onClick={() => go('rejected', 'dash.confirmReject')} data-testid="reject-order">
            ✕ {t('dash.reject')}
          </button>
        </>
      ) : (
        next && (
          <button className="btn btn-dark" disabled={!!busy} onClick={() => go(next)} data-testid="advance-order">
            {t('dash.advance', { status: t(`status.${next}`) })}
          </button>
        )
      )}
      {showDetails && (
        <Link className="btn btn-sm" to={`/admin/orders/${order.id}`} data-testid="view-details">
          {t('dash.details')}
        </Link>
      )}
      <a className="btn btn-sm" href={`/admin/orders/${order.id}/print`} target="_blank" rel="noreferrer" data-testid="print-receipt">
        🖨 {t('dash.print')}
      </a>
      {!closed && order.status !== 'new' && (
        <button className="btn btn-sm btn-ghost" disabled={!!busy} onClick={() => go('cancelled', 'dash.confirmCancel')}>
          {t('dash.cancelOrder')}
        </button>
      )}
      {feeMissing && order.status === 'new' && <div className="field-error" style={{ width: '100%' }}>{t('dash.feeRequired')}</div>}
      {error && (
        <div className="field-error" style={{ width: '100%' }} role="alert">
          {error}
        </div>
      )}
    </>
  );
}

export default function OrderCard({ order, fresh }: { order: Order; fresh?: boolean }) {
  const { t, locale } = useI18n();
  const isNew = order.status === 'new';
  return (
    <article
      className={`ocard ${isNew ? 'is-new' : ''} ${fresh ? 'fresh' : ''}`}
      data-testid="order-card"
      data-reference={order.reference}
      data-status={order.status}
    >
      <header className="ocard-head">
        <span className="ocard-ref num">{order.reference}</span>
        <div className="spacer" />
        {!isNew && <StatusBadge status={order.status} />}
        <span className="small num">{formatDateTime(order.created_at, locale)}</span>
      </header>
      <div className="ocard-body">
        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <TypeBadge type={order.order_type} />
          <span className="pay-pill" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>💵 {t('pay.label')}</span>
        </div>
        <div>
          <div style={{ fontWeight: 800 }}>{order.customer_name}</div>
          {order.customer_phone && (
            <a href={`tel:${order.customer_phone}`} className="num">
              {order.customer_phone}
            </a>
          )}
          {order.table_number && (
            <div>
              {t('conf.table')}: <strong className="num">{order.table_number}</strong>
            </div>
          )}
          {order.delivery_address && <div className="small">📍 {order.delivery_address}</div>}
        </div>
        <OrderItemsList order={order} />
        {order.notes && <div className="ocard-note">📝 {order.notes}</div>}
        {order.order_type === 'delivery' && (
          <div className="stack" style={{ gap: 6 }}>
            <strong className="small">{t('fee.title')}</strong>
            <DeliveryFeeEditor order={order} key={`${order.id}-${order.delivery_fee}`} />
          </div>
        )}
        <TotalsBlock order={order} />
      </div>
      <footer className="ocard-foot">
        <OrderActions order={order} />
      </footer>
    </article>
  );
}
