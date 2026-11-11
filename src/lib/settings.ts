import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { RestaurantSettings } from './types';

let cache: RestaurantSettings | null = null;
const listeners = new Set<(s: RestaurantSettings) => void>();

export async function refreshSettings(): Promise<RestaurantSettings | null> {
  const { data } = await supabase.from('restaurant_settings').select('*').eq('id', 1).maybeSingle();
  if (data) {
    cache = data as RestaurantSettings;
    listeners.forEach((l) => l(cache!));
  }
  return cache;
}

/** Restaurant contact/settings row, shared across the app. */
export function useSettings(): RestaurantSettings | null {
  const [s, setS] = useState(cache);
  useEffect(() => {
    listeners.add(setS);
    if (!cache) void refreshSettings();
    return () => {
      listeners.delete(setS);
    };
  }, []);
  return s;
}
