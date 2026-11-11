import type { Locale, OrderStatus, OrderType } from './types';

const intlLocale: Record<Locale, string> = { ar: 'ar-DZ', fr: 'fr-DZ', en: 'en-GB' };

export function formatDA(amount: number, locale: Locale): string {
  const n = new Intl.NumberFormat(locale === 'ar' ? 'fr-DZ' : intlLocale[locale], {
    maximumFractionDigits: 0,
  }).format(amount);
  return locale === 'ar' ? `${n} دج` : `${n} DA`;
}

// Arabic uses the fr-DZ numeric format (dd/mm/yyyy 24h): mixing "ص/م" with
// LTR-isolated numbers scrambles the date in RTL layouts.
const dateLocale: Record<Locale, string> = { ar: 'fr-DZ', fr: 'fr-DZ', en: 'en-GB' };

export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(dateLocale[locale], {
    dateStyle: 'short',
    timeStyle: 'short',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

export function formatTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(dateLocale[locale], { timeStyle: 'short', hourCycle: 'h23' }).format(new Date(iso));
}

/** Pick the localized value of `${base}_${locale}`, falling back to French then Arabic. */
export function loc(obj: object, base: string, locale: Locale): string {
  const o = obj as Record<string, unknown>;
  const pick = (l: Locale) => {
    const v = o[`${base}_${l}`];
    return typeof v === 'string' && v.trim() ? v : '';
  };
  return pick(locale) || pick('fr') || pick('ar') || pick('en');
}

export const STATUS_FLOW: Record<OrderType, OrderStatus[]> = {
  dine_in: ['new', 'confirmed', 'preparing', 'ready', 'completed'],
  takeaway: ['new', 'confirmed', 'preparing', 'ready', 'completed'],
  delivery: ['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed'],
};

export function nextStatus(type: OrderType, status: OrderStatus): OrderStatus | null {
  const flow = STATUS_FLOW[type];
  const i = flow.indexOf(status);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
}

export const OPEN_STATUSES: OrderStatus[] = ['new', 'confirmed', 'preparing', 'ready', 'out_for_delivery'];
export const CLOSED_STATUSES: OrderStatus[] = ['completed', 'cancelled', 'rejected'];

/** Maps a Postgres error raised by our RPCs/triggers to an i18n key. */
export function errorKey(err: unknown): string {
  const msg = (err as { message?: string } | null)?.message ?? '';
  const known = [
    'ordering_disabled',
    'delivery_disabled',
    'invalid_order_type',
    'invalid_name',
    'invalid_phone',
    'invalid_table',
    'invalid_address',
    'invalid_notes',
    'invalid_items',
    'invalid_quantity',
    'item_unavailable',
    'extra_unavailable',
    'delivery_fee_required',
    'invalid_status_transition',
    'order_closed',
  ];
  const hit = known.find((k) => msg.includes(k));
  return hit ? `err.${hit}` : 'err.generic';
}
