import type { Category, Product, Variant } from '../../../lib/types';

export type Translate = (key: string, vars?: Record<string, string | number>) => string;

export interface MenuData {
  categories: Category[];
  products: Product[];
}

export const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;

export const isPending = (v: Variant) => v.verification === 'pending';
export const hasPending = (p: Product) => p.product_variants.some(isPending);
export const isOrderable = (p: Product) =>
  p.product_variants.some((v) => v.verification === 'verified' && v.is_available);

export function hasAllNames(v: { name_ar: string; name_fr: string; name_en: string }): boolean {
  return !!v.name_ar.trim() && !!v.name_fr.trim() && !!v.name_en.trim();
}

/** Parses a non-negative integer from an input string; returns null when invalid. */
export function parseDA(s: string): number | null {
  if (!/^\d+$/.test(s.trim())) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) && n <= 2_000_000_000 ? n : null;
}

export function parseIntOr(s: string, fallback = 0): number {
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Maps a Supabase/Postgres error to a friendly translated message. */
export function amError(err: unknown, t: Translate): string {
  const e = err as { message?: string; code?: string } | null;
  const msg = e?.message ?? '';
  if (msg.includes('verified_variant_named')) return t('am.err.verifiedNeedsNames');
  if (e?.code === '23503' || msg.includes('violates foreign key')) return t('am.err.inUse');
  if (e?.code === '42501' || msg.toLowerCase().includes('row-level security')) return t('am.err.denied');
  if (e?.code === '23514') return t('am.err.invalidValue');
  return msg ? `${t('common.error')} (${msg})` : t('common.error');
}

export function safeFileName(name: string): string {
  const cleaned = name.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return (cleaned || 'image').slice(-80);
}
