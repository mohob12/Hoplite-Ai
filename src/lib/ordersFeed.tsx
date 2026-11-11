import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { notifier } from './notifier';
import { useI18n } from './i18n';
import { OPEN_STATUSES, formatTime } from './format';
import type { Order, OrderStatus } from './types';

export type ConnectionState = 'connecting' | 'live' | 'polling' | 'offline';

export const ORDER_SELECT = '*, order_items(*, order_item_extras(*))';
export const POLL_INTERVAL_S = 10;
// Reconcile even while "live": a socket can report SUBSCRIBED yet deliver nothing
// (e.g. right after the realtime server restarts).
const SAFETY_POLL_MS = 20_000;
const FRESH_MS = 30_000;

export interface IncomingAlert {
  id: string;
  reference: string;
  orderType: Order['order_type'];
  createdAt: string;
}

interface FeedValue {
  orders: Order[];
  loading: boolean;
  error: string | null;
  connection: ConnectionState;
  lastSync: Date | null;
  fresh: Set<string>;
  alerts: IncomingAlert[];
  dismissAlert: (id: string) => void;
  counts: Record<'new' | 'confirmed' | 'preparing' | 'ready' | 'delivery' | 'today', number>;
  refresh: () => Promise<void>;
  applyOrder: (o: Order) => void;
}

const FeedContext = createContext<FeedValue | null>(null);

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function sortItems(o: Order): Order {
  if (o.order_items) o.order_items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return o;
}

export function OrdersFeedProvider({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  const [orders, setOrders] = useState<Map<string, Order>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [alerts, setAlerts] = useState<IncomingAlert[]>([]);

  const seen = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const highWater = useRef<string | null>(null); // max updated_at seen
  const tRef = useRef(t);
  tRef.current = t;
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const markFresh = useCallback((id: string) => {
    setFresh((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setFresh((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, FRESH_MS);
  }, []);

  /** Merge orders into state; returns orders never seen before. */
  const ingest = useCallback(
    (rows: Order[], { alert }: { alert: boolean }) => {
      const brandNew: Order[] = [];
      for (const r of rows) {
        if (!highWater.current || r.updated_at > highWater.current) highWater.current = r.updated_at;
        if (!seen.current.has(r.id)) {
          seen.current.add(r.id);
          if (alert && r.status === 'new') brandNew.push(r);
        }
      }
      setOrders((prev) => {
        const next = new Map(prev);
        for (const r of rows) {
          const old = next.get(r.id);
          next.set(r.id, sortItems({ ...old, ...r, order_items: r.order_items ?? old?.order_items }));
        }
        return next;
      });
      for (const o of brandNew) {
        markFresh(o.id);
        setAlerts((prev) =>
          [{ id: o.id, reference: o.reference, orderType: o.order_type, createdAt: o.created_at }, ...prev].slice(0, 5),
        );
        notifier.alertNewOrder({
          id: o.id,
          reference: o.reference,
          title: tRef.current('dash.newOrderToast', { ref: o.reference }),
          body: `${tRef.current(`type.${o.order_type}`)} · ${formatTime(o.created_at, localeRef.current)} · ${o.customer_name}`,
        });
      }
      return brandNew;
    },
    [markFresh],
  );

  const loadInitial = useCallback(async () => {
    const since = startOfToday().toISOString();
    const { data, error: err } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .or(`status.in.(${OPEN_STATUSES.join(',')}),created_at.gte.${since}`)
      .order('created_at', { ascending: false })
      .limit(300);
    if (err) {
      setError(err.message);
      return false;
    }
    setError(null);
    // Orders already waiting when the dashboard opens are shown, not chimed.
    ingest((data ?? []) as Order[], { alert: initialized.current });
    initialized.current = true;
    setLastSync(new Date());
    return true;
  }, [ingest]);

  /** Fetch everything changed since the last sync (catch-up / polling). */
  const catchUp = useCallback(async () => {
    if (!initialized.current) {
      await loadInitial();
      return;
    }
    let q = supabase.from('orders').select(ORDER_SELECT).order('updated_at', { ascending: true }).limit(200);
    if (highWater.current) q = q.gte('updated_at', highWater.current);
    const { data, error: err } = await q;
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    ingest((data ?? []) as Order[], { alert: true });
    setLastSync(new Date());
  }, [ingest, loadInitial]);

  const fetchOne = useCallback(
    async (id: string) => {
      const { data } = await supabase.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle();
      if (data) ingest([data as Order], { alert: true });
    },
    [ingest],
  );

  // Initial load, realtime subscription with reconnection, polling fallback.
  useEffect(() => {
    let disposed = false;
    let channel: RealtimeChannel | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let warmupTimer: ReturnType<typeof setTimeout> | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let attempt = 0;

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(() => void catchUp(), POLL_INTERVAL_S * 1000);
    };
    const stopPolling = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = undefined;
    };

    const subscribe = () => {
      if (disposed) return;
      if (channel) void supabase.removeChannel(channel);
      setConnection(navigator.onLine ? 'connecting' : 'offline');
      channel = supabase
        .channel(`orders-feed-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
          // Items are inserted in the same transaction, so a fetch now sees them.
          void fetchOne((payload.new as Order).id);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
          const row = payload.new as Order;
          if (!seen.current.has(row.id)) void fetchOne(row.id);
          else ingest([row], { alert: false });
        })
        .subscribe((status) => {
          if (disposed) return;
          if (status === 'SUBSCRIBED') {
            attempt = 0;
            setConnection('live');
            stopPolling();
            // Catch up on anything missed while disconnected, and again shortly after:
            // an idle realtime server starts replication lazily, so changes made in the
            // first seconds after SUBSCRIBED may never be pushed.
            void catchUp();
            clearTimeout(warmupTimer);
            warmupTimer = setTimeout(() => void catchUp(), 4000);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setConnection(navigator.onLine ? 'polling' : 'offline');
            startPolling();
            clearTimeout(retryTimer);
            const delay = Math.min(30_000, 1000 * 2 ** attempt++);
            retryTimer = setTimeout(subscribe, delay);
          }
        });
    };

    const onOnline = () => {
      void catchUp();
      subscribe();
    };
    const onOffline = () => setConnection('offline');
    const onVisible = () => {
      if (document.visibilityState === 'visible') void catchUp();
    };

    (async () => {
      setLoading(true);
      const ok = await loadInitial();
      if (disposed) return;
      setLoading(false);
      if (!ok) startPolling();
      subscribe();
    })();

    // Belt and braces: occasional reconciliation even while "live".
    const safety = setInterval(() => void catchUp(), SAFETY_POLL_MS);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      clearTimeout(warmupTimer);
      stopPolling();
      clearInterval(safety);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [catchUp, fetchOne, ingest, loadInitial]);

  const list = useMemo(
    () => [...orders.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [orders],
  );

  const counts = useMemo(() => {
    const today = startOfToday().toISOString();
    const by = (s: OrderStatus) => list.filter((o) => o.status === s).length;
    return {
      new: by('new'),
      confirmed: by('confirmed'),
      preparing: by('preparing'),
      ready: by('ready'),
      delivery: list.filter((o) => o.order_type === 'delivery' && OPEN_STATUSES.includes(o.status)).length,
      today: list.filter((o) => o.created_at >= today).length,
    };
  }, [list]);

  useEffect(() => {
    document.title = counts.new > 0 ? `(${counts.new}) Mac Kiffan — Admin` : 'Mac Kiffan — Admin';
    return () => {
      document.title = 'Mac Kiffan';
    };
  }, [counts.new]);

  const dismissAlert = useCallback((id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id)), []);
  const applyOrder = useCallback((o: Order) => void ingest([o], { alert: false }), [ingest]);

  const value: FeedValue = {
    orders: list,
    loading,
    error,
    connection,
    lastSync,
    fresh,
    alerts,
    dismissAlert,
    counts,
    refresh: catchUp,
    applyOrder,
  };
  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

export function useOrdersFeed(): FeedValue {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error('useOrdersFeed outside OrdersFeedProvider');
  return ctx;
}

/** Re-render on notifier state changes. */
export function useNotifier() {
  useSyncExternalStore(
    (cb) => notifier.subscribe(cb),
    () => `${notifier.activated}|${notifier.leader}|${JSON.stringify(notifier.settings)}|${notifier.playedCount}|${notifier.desktopPermission}`,
  );
  return notifier;
}
