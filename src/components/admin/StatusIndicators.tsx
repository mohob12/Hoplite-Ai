import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';
import { POLL_INTERVAL_S, useNotifier, useOrdersFeed } from '../../lib/ordersFeed';
import { formatTime } from '../../lib/format';

export function ConnectionIndicator() {
  const { t, locale } = useI18n();
  const { connection, lastSync } = useOrdersFeed();
  const dot = connection === 'live' ? 'live' : connection === 'connecting' ? 'warn' : 'bad';
  const label =
    connection === 'live'
      ? t('conn.live')
      : connection === 'connecting'
        ? t('conn.connecting')
        : connection === 'polling'
          ? t('conn.polling', { s: POLL_INTERVAL_S })
          : t('conn.offline');
  return (
    <span className="status-pill" data-testid="connection-status" data-state={connection} role="status">
      <span className={`dot ${dot}`} />
      {label}
      {lastSync && (
        <span className="muted small">· {t('conn.lastCheck', { time: formatTime(lastSync.toISOString(), locale) })}</span>
      )}
    </span>
  );
}

export function NotificationIndicator() {
  const { t } = useI18n();
  const n = useNotifier();
  const on = n.activated && n.settings.auto && n.settings.sound;
  const label = !n.activated ? t('notif.inactive') : n.leader ? t('notif.active') : t('notif.otherTab');
  return (
    <Link
      to="/admin/settings"
      className="status-pill"
      style={{ textDecoration: 'none' }}
      data-testid="notification-status"
      data-active={n.activated ? 'true' : 'false'}
      data-leader={n.leader ? 'true' : 'false'}
    >
      <span className={`dot ${on && n.leader ? 'on' : n.activated ? 'live' : 'bad'}`} />
      {label}
    </Link>
  );
}

export function ActivateBanner() {
  const { t } = useI18n();
  const n = useNotifier();
  if (n.activated) return null;
  return (
    <div className="activate-banner" data-testid="activate-banner">
      <div style={{ fontSize: '1.8rem' }} aria-hidden="true">
        🔔
      </div>
      <div className="stack" style={{ gap: 2, flex: '1 1 260px' }}>
        <strong>{t('notif.activate')}</strong>
        <span className="small">{t('notif.activateHint')}</span>
      </div>
      <button className="btn btn-dark" onClick={() => void n.activate()} data-testid="activate-notifications">
        {t('notif.activate')}
      </button>
    </div>
  );
}

export function NotificationSettingsPanel() {
  const { t } = useI18n();
  const n = useNotifier();
  const s = n.settings;
  const denied = n.desktopPermission === 'denied';
  const unsupported = n.desktopPermission === 'unsupported';

  return (
    <section className="panel" data-testid="notification-settings">
      <h2>{t('notif.settings')}</h2>
      {!n.activated && (
        <div style={{ marginBottom: 12 }}>
          <button className="btn btn-dark" onClick={() => void n.activate()}>
            {t('notif.activate')}
          </button>
        </div>
      )}
      <Toggle label={t('notif.auto')} checked={s.auto} onChange={(v) => n.update({ auto: v })} testId="toggle-auto" />
      <Toggle label={t('notif.sound')} checked={s.sound} onChange={(v) => n.update({ sound: v })} testId="toggle-sound" />
      <div className="toggle-row">
        <label htmlFor="notif-volume" style={{ fontWeight: 600 }}>
          {t('notif.volume')} <span className="muted num">{Math.round(s.volume * 100)}%</span>
        </label>
        <input
          id="notif-volume"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={s.volume}
          onChange={(e) => n.update({ volume: Number(e.target.value) })}
          style={{ maxWidth: 220 }}
          data-testid="volume"
        />
      </div>
      <div className="toggle-row">
        <span style={{ fontWeight: 600 }}>{t('notif.test')}</span>
        <button
          className="btn btn-sm btn-yellow"
          onClick={async () => {
            if (!n.activated) await n.activate();
            await n.testSound();
          }}
          data-testid="test-sound"
        >
          ▶ {t('notif.test')}
        </button>
      </div>
      <Toggle
        label={t('notif.desktop')}
        checked={s.desktop && !denied && !unsupported}
        disabled={denied || unsupported}
        hint={denied || unsupported ? t('notif.desktopDenied') : undefined}
        onChange={async (v) => {
          n.update({ desktop: v });
          if (v && n.desktopPermission === 'default') await Notification.requestPermission();
          n.update({});
        }}
        testId="toggle-desktop"
      />
      <p className="muted small" style={{ marginTop: 10 }}>
        {t('notif.closedNote')}
      </p>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
  hint,
  testId,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  hint?: string;
  testId?: string;
}) {
  return (
    <div className="toggle-row">
      <div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        {hint && <div className="muted small">{hint}</div>}
      </div>
      <label className="switch">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={label}
          data-testid={testId}
        />
        <span />
      </label>
    </div>
  );
}

/** Prominent pop-up for orders that just arrived (shown in every open tab). */
export function NewOrderAlert() {
  const { t, locale } = useI18n();
  const { alerts, dismissAlert } = useOrdersFeed();
  const top = alerts[0];

  useEffect(() => {
    if (!top) return;
    const id = setTimeout(() => dismissAlert(top.id), 20_000);
    return () => clearTimeout(id);
  }, [top, dismissAlert]);

  if (!top) return null;
  return (
    <div className="new-order-alert" role="alert" data-testid="new-order-alert">
      <div style={{ fontSize: '1.8rem' }} aria-hidden="true">
        🔔
      </div>
      <div className="stack" style={{ gap: 2, flex: 1 }}>
        <span className="big num">{t('dash.newOrderToast', { ref: top.reference })}</span>
        <span>
          {t(`type.${top.orderType}`)} · {t('dash.receivedAt', { time: formatTime(top.createdAt, locale) })}
        </span>
        {alerts.length > 1 && <span className="small">+{alerts.length - 1}</span>}
      </div>
      <button className="icon-btn" onClick={() => dismissAlert(top.id)} aria-label={t('common.close')}>
        ✕
      </button>
    </div>
  );
}

/** Relative clock that re-renders every 30s (for "x min ago"). */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
