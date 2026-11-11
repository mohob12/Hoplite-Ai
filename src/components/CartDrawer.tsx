import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { useCart } from '../lib/cart';
import { useSettings } from '../lib/settings';
import { errorKey, formatDA } from '../lib/format';
import CartLines from './CartLines';
import { supabase } from '../lib/supabase';
import type { OrderType } from '../lib/types';

interface Form {
  name: string;
  phone: string;
  table: string;
  address: string;
  notes: string;
}

const PROFILE_KEY = 'mk.checkout.profile';
const TYPES: { type: OrderType; icon: string }[] = [
  { type: 'dine_in', icon: '🍽' },
  { type: 'takeaway', icon: '🥡' },
  { type: 'delivery', icon: '🛵' },
];

export function saveMyOrder(reference: string, token: string) {
  try {
    const list = JSON.parse(localStorage.getItem('mk.myOrders') || '[]') as { reference: string; token: string }[];
    localStorage.setItem('mk.myOrders', JSON.stringify([{ reference, token }, ...list].slice(0, 20)));
  } catch {
    /* non-critical */
  }
}

function validate(type: OrderType | null, f: Form): Partial<Record<keyof Form | 'type', string>> {
  const e: Partial<Record<keyof Form | 'type', string>> = {};
  if (!type) e.type = 'err.invalid_order_type';
  if (f.name.trim().length < 2) e.name = 'v.name';
  const digits = f.phone.replace(/\D/g, '');
  if (type && type !== 'dine_in' && (digits.length < 9 || digits.length > 15)) e.phone = 'v.phone';
  if (type === 'dine_in' && !f.table.trim()) e.table = 'v.table';
  if (type === 'delivery' && f.address.trim().length < 8) e.address = 'v.address';
  return e;
}

export default function CartDrawer() {
  const { t, locale } = useI18n();
  const cart = useCart();
  const settings = useSettings();
  const navigate = useNavigate();
  const [type, setType] = useState<OrderType | null>(null);
  const [form, setForm] = useState<Form>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
      return { name: saved.name ?? '', phone: saved.phone ?? '', table: '', address: saved.address ?? '', notes: '' };
    } catch {
      return { name: '', phone: '', table: '', address: '', notes: '' };
    }
  });
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!cart.open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cart.setOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [cart.open, cart]);

  if (!cart.open) return null;

  const errors = validate(type, form);
  const deliveryOff = settings?.delivery_enabled === false;
  const orderingOff = settings?.ordering_enabled === false;
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const err = (k: keyof Form) => (touched && errors[k] ? t(errors[k]!) : '');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setSubmitError('');
    if (Object.keys(errors).length || !type || cart.lines.length === 0) return;
    setSubmitting(true);
    const payload = {
      order_type: type,
      customer_name: form.name.trim(),
      customer_phone: type === 'dine_in' ? '' : form.phone.trim(),
      table_number: type === 'dine_in' ? form.table.trim() : '',
      delivery_address: type === 'delivery' ? form.address.trim() : '',
      notes: form.notes.trim(),
      locale,
      items: cart.lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity, extra_ids: l.extras.map((x) => x.id) })),
    };
    try {
      const { data, error } = await supabase.rpc('place_order', { payload });
      // Only a returned reference + token proves the order was stored.
      if (error || !data?.reference || !data?.access_token) {
        const key = error ? errorKey(error) : 'err.generic';
        setSubmitError(t(key === 'err.generic' ? 'co.failed' : key));
        return;
      }
      saveMyOrder(data.reference, data.access_token);
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: form.name, phone: form.phone, address: form.address }));
      cart.clear();
      cart.setOpen(false);
      setForm((f) => ({ ...f, notes: '', table: '' }));
      setTouched(false);
      navigate(`/order/${encodeURIComponent(data.reference)}?t=${encodeURIComponent(data.access_token)}`);
    } catch {
      setSubmitError(t('co.failed'));
    } finally {
      setSubmitting(false);
    }
  }

  const empty = cart.lines.length === 0;

  return (
    <div className="overlay" onClick={() => cart.setOpen(false)}>
      <form
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t('cart.title')}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        noValidate
        data-testid="cart-drawer"
      >
        <div className="drawer-head">
          <h2>{t('cart.title')}</h2>
          <div className="spacer" />
          <button type="button" className="icon-btn" onClick={() => cart.setOpen(false)} aria-label={t('common.close')}>
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {empty ? (
            <p className="muted" style={{ textAlign: 'center', padding: '40px 0' }}>
              {t('cart.empty')}
            </p>
          ) : (
            <>
              <CartLines />

              <section>
                <div className="section-title">{t('cart.orderType')}</div>
                <div className="seg" role="group" aria-label={t('cart.orderType')}>
                  {TYPES.map(({ type: ty, icon }) => (
                    <button
                      key={ty}
                      type="button"
                      aria-pressed={type === ty}
                      disabled={ty === 'delivery' && deliveryOff}
                      onClick={() => setType(ty)}
                      data-testid={`type-${ty}`}
                    >
                      <span className="ico" aria-hidden="true">
                        {icon}
                      </span>
                      {t(`type.${ty}`)}
                    </button>
                  ))}
                </div>
                {touched && errors.type && <div className="field-error" style={{ marginTop: 6 }}>{t(errors.type)}</div>}
              </section>

              {type && (
                <section className="stack" key={type} data-testid={`fields-${type}`}>
                  <div className="section-title" style={{ marginBottom: 0 }}>
                    {t('cart.details')}
                  </div>
                  {type === 'dine_in' && (
                    <Field label={t('f.table')} error={err('table')}>
                      <input className="input" name="table" inputMode="numeric" maxLength={10} value={form.table} onChange={set('table')} aria-invalid={!!err('table')} data-testid="f-table" />
                    </Field>
                  )}
                  <Field label={t('f.name')} error={err('name')}>
                    <input className="input" name="name" autoComplete="name" maxLength={80} value={form.name} onChange={set('name')} aria-invalid={!!err('name')} data-testid="f-name" />
                  </Field>
                  {type !== 'dine_in' && (
                    <Field label={t('f.phone')} error={err('phone')}>
                      <input className="input num" style={{ textAlign: 'start' }} dir="ltr" name="phone" type="tel" autoComplete="tel" maxLength={20} placeholder={t('f.phonePh')} value={form.phone} onChange={set('phone')} aria-invalid={!!err('phone')} data-testid="f-phone" />
                    </Field>
                  )}
                  {type === 'delivery' && (
                    <Field label={t('f.address')} error={err('address')}>
                      <textarea className="textarea" name="address" autoComplete="street-address" maxLength={300} placeholder={t('f.addressPh')} value={form.address} onChange={set('address')} aria-invalid={!!err('address')} data-testid="f-address" />
                    </Field>
                  )}
                  <Field label={type === 'dine_in' ? t('f.notes') : t('f.notesPlural')} optional={t('common.optional')}>
                    <textarea className="textarea" name="notes" maxLength={500} placeholder={t('f.notesPh')} value={form.notes} onChange={set('notes')} data-testid="f-notes" />
                  </Field>
                </section>
              )}
            </>
          )}
        </div>

        {!empty && (
          <div className="drawer-foot stack" style={{ gap: 10 }}>
            <div className="summary" data-testid="cart-summary">
              <div className="line">
                <span>{t('sum.subtotal')}</span>
                <strong className="num" data-testid="cart-subtotal">
                  {formatDA(cart.subtotal, locale)}
                </strong>
              </div>
              {type === 'delivery' ? (
                <>
                  <div className="line">
                    <span>{t('sum.deliveryFee')}</span>
                    <span className="pending" data-testid="fee-pending">
                      {t('sum.pending')}
                    </span>
                  </div>
                  <div className="line total">
                    <span>{t('sum.estimated')}</span>
                    <span className="num">{formatDA(cart.subtotal, locale)}</span>
                  </div>
                  <p className="small muted">{t('sum.deliveryNotice')}</p>
                </>
              ) : (
                <div className="line total">
                  <span>{t('sum.total')}</span>
                  <span className="num">{formatDA(cart.subtotal, locale)}</span>
                </div>
              )}
            </div>
            <div className="row wrap">
              <span className="pay-pill" data-testid="payment-label">
                💵 {type ? t(`pay.${type}`) : t('pay.label')}
              </span>
            </div>
            {orderingOff && <div className="alert alert-warn">{t('menu.orderingOff')}</div>}
            {submitError && (
              <div className="alert alert-error" role="alert" data-testid="submit-error">
                {submitError}
              </div>
            )}
            <button className="btn btn-primary btn-block" disabled={submitting || orderingOff} data-testid="submit-order">
              {submitting ? t('co.submitting') : t('co.submit')}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

function Field({ label, error, optional, children }: { label: string; error?: string; optional?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>
        {label} {optional && <span className="hint">({optional})</span>}
      </span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
