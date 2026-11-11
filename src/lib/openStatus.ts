import { useEffect, useState } from 'react';
import type { RestaurantSettings } from './types';

export const RESTAURANT_TZ = 'Africa/Algiers';

/** Minutes since midnight in the restaurant's time zone. */
export function restaurantMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: RESTAURANT_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get('hour') * 60 + get('minute');
}

/** "HH:MM[:SS]" → minutes since midnight. */
export function parseTime(t: string | null | undefined): number | null {
  const m = t ? /^(\d{1,2}):(\d{2})/.exec(t) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export interface OpenStatus {
  open: boolean;
  /** Closing time when open, opening time when closed (minutes since midnight). */
  next: number;
}

/** Daily hours; a closing time at or before the opening time runs past midnight. Equal times = 24h. */
export function openStatus(s: Pick<RestaurantSettings, 'opens_at' | 'closes_at'>, now: Date): OpenStatus | null {
  const o = parseTime(s.opens_at);
  const c = parseTime(s.closes_at);
  if (o === null || c === null) return null;
  const n = restaurantMinutes(now);
  const open = o === c ? true : o < c ? n >= o && n < c : n >= o || n < c;
  return { open, next: open ? c : o };
}

/** Re-renders every 30 s so the badge flips at opening/closing time. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
