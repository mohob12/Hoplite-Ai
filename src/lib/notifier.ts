/**
 * Order alert engine for the admin dashboard.
 *
 * - Audio is synthesized with Web Audio (no asset), unlocked by an explicit
 *   user click to satisfy browser autoplay rules.
 * - Only one tab per browser plays sound / shows desktop notifications: the
 *   activated tab holding the Web Lock "mk-order-alerts" is the leader. Other
 *   tabs still update their UI.
 * - Each order ID alerts at most once per browser (localStorage claim), and
 *   chimes are queued so they never overlap.
 */

export interface NotifSettings {
  sound: boolean;
  volume: number; // 0..1
  desktop: boolean;
  auto: boolean;
}

type Listener = () => void;

const SETTINGS_KEY = 'mk.notif.settings';
const ACTIVATED_KEY = 'mk.notif.activatedOnce';
const CLAIM_PREFIX = 'mk.alerted.';
const LOCK_NAME = 'mk-order-alerts';

const defaults: NotifSettings = { sound: true, volume: 0.8, desktop: true, auto: true };

function loadSettings(): NotifSettings {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return { ...defaults };
  }
}

class Notifier {
  settings: NotifSettings = loadSettings();
  /** Audio unlocked in this tab (needs a user gesture each page load). */
  activated = false;
  /** This tab owns sound/desktop alerts for the browser. */
  leader = false;
  /** Count of chimes actually played in this tab (exposed for diagnostics/tests). */
  playedCount = 0;
  private ctx: AudioContext | null = null;
  private queue: Promise<void> = Promise.resolve();
  private pending = 0;
  private listeners = new Set<Listener>();
  private releaseLock: (() => void) | null = null;
  private fallbackLeader = false;

  get activatedBefore(): boolean {
    return localStorage.getItem(ACTIVATED_KEY) === '1';
  }

  get desktopPermission(): NotificationPermission | 'unsupported' {
    return 'Notification' in window ? Notification.permission : 'unsupported';
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  update(patch: Partial<NotifSettings>) {
    this.settings = { ...this.settings, ...patch };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    this.emit();
  }

  /** Must be called from a user gesture (click). */
  async activate(): Promise<void> {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!this.ctx && AC) this.ctx = new AC();
    if (this.ctx && this.ctx.state !== 'running') {
      try {
        await this.ctx.resume();
      } catch {
        /* resume can reject without a gesture; activation retried on next click */
      }
    }
    this.activated = !!this.ctx && this.ctx.state === 'running';
    if (this.activated) localStorage.setItem(ACTIVATED_KEY, '1');

    if (this.settings.desktop && this.desktopPermission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        /* ignore */
      }
    }
    if (this.activated) this.acquireLeadership();
    this.emit();
  }

  private acquireLeadership() {
    if (this.leader || this.releaseLock || this.fallbackLeader) return;
    if ('locks' in navigator && navigator.locks?.request) {
      navigator.locks
        .request(LOCK_NAME, () => {
          this.leader = true;
          this.emit();
          // Hold the lock for the life of the tab (or until deactivated).
          return new Promise<void>((resolve) => {
            this.releaseLock = resolve;
          });
        })
        .catch(() => {
          this.fallbackLeader = true;
          this.leader = true;
          this.emit();
        });
    } else {
      // No Web Locks: every activated tab may alert; per-order claims still dedupe.
      this.fallbackLeader = true;
      this.leader = true;
    }
  }

  /** Claim an order ID across tabs; returns false if already alerted. */
  claim(orderId: string): boolean {
    const key = CLAIM_PREFIX + orderId;
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, String(Date.now()));
    this.pruneClaims();
    return true;
  }

  private pruneClaims() {
    const cutoff = Date.now() - 3 * 24 * 3600 * 1000;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(CLAIM_PREFIX) && Number(localStorage.getItem(k)) < cutoff) localStorage.removeItem(k);
    }
  }

  /**
   * Alert for a new order. Returns true if this tab played/showed the alert.
   * Visual in-app alerts are handled by the caller in every tab.
   */
  alertNewOrder(order: { id: string; reference: string; title: string; body: string }): boolean {
    if (!this.settings.auto || !this.leader) return false;
    if (!this.claim(order.id)) return false;
    if (this.settings.sound && this.activated) this.enqueueChime();
    if (this.settings.desktop && this.desktopPermission === 'granted') {
      try {
        const n = new Notification(order.title, { body: order.body, tag: `mk-order-${order.id}`, icon: '/favicon.svg' });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch {
        /* some platforms only allow notifications from a service worker */
      }
    }
    return true;
  }

  private enqueueChime() {
    // Cap the backlog so a burst of orders doesn't ring for minutes.
    if (this.pending >= 3) return;
    this.pending++;
    this.queue = this.queue.then(async () => {
      await this.chime();
      this.pending--;
    });
  }

  testSound(): Promise<void> {
    return this.chime();
  }

  /** Two-tone "ding-dong" played twice (~1.6s). Resolves when finished. */
  private chime(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return Promise.resolve();
    const vol = Math.max(0, Math.min(1, this.settings.volume));
    const master = ctx.createGain();
    master.gain.value = vol;
    master.connect(ctx.destination);
    const t0 = ctx.currentTime + 0.02;
    const notes: [number, number][] = [
      [1318.5, 0],
      [987.8, 0.22],
      [1318.5, 0.8],
      [987.8, 1.02],
    ];
    for (const [freq, at] of notes) {
      for (const [mult, amp] of [
        [1, 0.55],
        [2, 0.12],
      ] as const) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq * mult;
        g.gain.setValueAtTime(0.0001, t0 + at);
        g.gain.exponentialRampToValueAtTime(amp, t0 + at + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.55);
        osc.connect(g).connect(master);
        osc.start(t0 + at);
        osc.stop(t0 + at + 0.6);
      }
    }
    this.playedCount++;
    (window as unknown as { __mkChimes?: number }).__mkChimes = this.playedCount;
    this.emit();
    return new Promise((resolve) => setTimeout(resolve, 1700));
  }
}

export const notifier = new Notifier();

// Once activated in a previous visit, re-unlock audio on the first interaction.
if (typeof window !== 'undefined') {
  const reunlock = () => {
    if (notifier.activatedBefore && !notifier.activated) void notifier.activate();
  };
  window.addEventListener('pointerdown', reunlock, { capture: true });
  window.addEventListener('keydown', reunlock, { capture: true });
}
