import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { formatDA, formatDateTime } from '../../lib/format';
import { StatusBadge, TypeBadge } from '../../components/admin/OrderCard';
import type { Order, OrderStatus, OrderType } from '../../lib/types';

const PAGE = 50;
const STATUSES: OrderStatus[] = ['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled', 'rejected'];
const TYPES: OrderType[] = ['dine_in', 'takeaway', 'delivery'];

export default function OrderHistory() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState<OrderType | ''>('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [rows, setRows] = useState<Order[]>([]);
  const [count, setCount] = useState(0);
  const [limit, setLimit] = useState(PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);
    const term = q.trim().replace(/[,()%]/g, ' ').trim();
    if (term) {
      const num = term.replace(/^MK-?/i, '');
      const parts = [`customer_name.ilike.%${term}%`, `customer_phone.ilike.%${term.replace(/\s/g, '')}%`, `reference.ilike.%${term}%`];
      if (/^\d+$/.test(num)) parts.push(`order_number.eq.${num}`);
      query = query.or(parts.join(','));
    }
    if (from) query = query.gte('created_at', new Date(`${from}T00:00:00`).toISOString());
    if (to) query = query.lte('created_at', new Date(`${to}T23:59:59.999`).toISOString());
    if (type) query = query.eq('order_type', type);
    if (status) query = query.eq('status', status);
    const { data, error: err, count: c } = await query;
    setLoading(false);
    if (err) {
      setError(true);
      return;
    }
    setRows((data ?? []) as Order[]);
    setCount(c ?? 0);
  }, [q, from, to, type, status, limit]);

  useEffect(() => {
    const id = setTimeout(() => void load(), 250);
    return () => clearTimeout(id);
  }, [load]);

  return (
    <>
      <h1>{t('hist.title')}</h1>
      <div className="filters">
        <input
          className="input"
          type="search"
          placeholder={t('hist.searchPh')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={t('common.search')}
          data-testid="history-search"
        />
        <label className="field">
          <span className="sr-only">{t('hist.from')}</span>
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t('hist.from')} />
        </label>
        <label className="field">
          <span className="sr-only">{t('hist.to')}</span>
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label={t('hist.to')} />
        </label>
        <select className="select" value={type} onChange={(e) => setType(e.target.value as OrderType | '')} aria-label={t('hist.type')}>
          <option value="">{t('hist.type')}: {t('common.all')}</option>
          {TYPES.map((x) => (
            <option key={x} value={x}>
              {t(`type.${x}`)}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
          aria-label={t('hist.status')}
          data-testid="history-status"
        >
          <option value="">{t('hist.status')}: {t('common.all')}</option>
          {STATUSES.map((x) => (
            <option key={x} value={x}>
              {t(`status.${x}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="muted small">{t('hist.count', { n: count })}</div>
      {error && <div className="alert alert-error">{t('common.error')}</div>}

      <div className="table-wrap">
        <table className="table" data-testid="history-table">
          <thead>
            <tr>
              <th>{t('conf.number')}</th>
              <th>{t('rc.date')}</th>
              <th>{t('od.customer')}</th>
              <th>{t('f.phone')}</th>
              <th>{t('hist.type')}</th>
              <th>{t('hist.status')}</th>
              <th>{t('sum.total')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="clickable" onClick={() => navigate(`/admin/orders/${o.id}`)}>
                <td className="num" style={{ fontWeight: 800 }}>
                  {o.reference}
                </td>
                <td className="num">{formatDateTime(o.created_at, locale)}</td>
                <td>{o.customer_name}</td>
                <td className="num">{o.customer_phone ?? '—'}</td>
                <td>
                  <TypeBadge type={o.order_type} />
                </td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
                <td className="num">
                  {formatDA(o.total, locale)}
                  {o.delivery_fee_status === 'pending' && <span className="muted small"> *</span>}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 28 }}>
                  {t('hist.none')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {loading && <p className="muted">{t('common.loading')}</p>}
      {rows.length < count && (
        <button className="btn" onClick={() => setLimit((l) => l + PAGE)} style={{ alignSelf: 'center' }}>
          {t('hist.loadMore')}
        </button>
      )}
    </>
  );
}
