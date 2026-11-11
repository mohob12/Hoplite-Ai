import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { refreshSettings } from '../../lib/settings';
import { useI18n } from '../../lib/i18n';
import type { RestaurantSettings } from '../../lib/types';
import { amError } from './menu/shared';
import './admin-manage.css';

type Form = Omit<RestaurantSettings, 'id'>;

const TEXT_FIELDS = ['name', 'phone', 'phone_secondary', 'email'] as const;
const LTR_FIELDS = new Set<string>(['phone', 'phone_secondary', 'email']);

export default function RestaurantSettingsForm() {
  const { t } = useI18n();
  const [form, setForm] = useState<Form | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: 'saved' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data, error } = await supabase.from('restaurant_settings').select('*').eq('id', 1).single();
      if (!alive) return;
      if (error || !data) setLoadError(amError(error, t));
      else {
        const { id: _id, ...rest } = data as RestaurantSettings;
        setForm(rest);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loadError) return <div className="alert alert-error">{loadError}</div>;
  if (!form) return <div className="panel muted">{t('common.loading')}</div>;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setStatus(null);
    setForm((f) => (f ? { ...f, [k]: v } : f));
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setStatus(null);
    const payload: Form = { ...form, name: form.name.trim() };
    const { error } = await supabase.from('restaurant_settings').update(payload).eq('id', 1);
    if (error) setStatus({ kind: 'error', msg: amError(error, t) });
    else {
      await refreshSettings();
      setStatus({ kind: 'saved', msg: t('common.saved') });
    }
    setBusy(false);
  }

  const textField = (k: (typeof TEXT_FIELDS)[number]) => (
    <label className="field" key={k}>
      <span>{t(`am.set.${k}`)}</span>
      <input
        className="input"
        value={form[k]}
        required={k === 'name'}
        type={k === 'email' ? 'email' : 'text'}
        dir={LTR_FIELDS.has(k) ? 'ltr' : undefined}
        style={LTR_FIELDS.has(k) ? { textAlign: 'start' } : undefined}
        onChange={(e) => set(k, e.target.value)}
      />
    </label>
  );

  return (
    <form className="panel stack" style={{ gap: 20 }} onSubmit={save}>
      <h2 style={{ marginBottom: 0 }}>{t('am.set.title')}</h2>

      <div className="am-form-grid two">{TEXT_FIELDS.map(textField)}</div>

      <div className="am-form-grid">
        {(['ar', 'fr', 'en'] as const).map((l) => (
          <label className="field" key={l}>
            <span>
              {t('am.set.address')} · {t(`am.lang.${l}`)}
            </span>
            <textarea
              className="textarea"
              dir={l === 'ar' ? 'rtl' : 'ltr'}
              value={form[`address_${l}`]}
              onChange={(e) => set(`address_${l}`, e.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="am-form-grid am-hours">
        {(['ar', 'fr', 'en'] as const).map((l) => (
          <label className="field" key={l}>
            <span>
              {t('am.set.hours')} · {t(`am.lang.${l}`)}
            </span>
            <textarea
              className="textarea"
              dir={l === 'ar' ? 'rtl' : 'ltr'}
              value={form[`opening_hours_${l}`]}
              onChange={(e) => set(`opening_hours_${l}`, e.target.value)}
            />
          </label>
        ))}
      </div>

      <div>
        <div className="toggle-row">
          <div>
            <strong>{t('am.set.ordering')}</strong>
            <p className="muted small">{t('am.set.orderingHint')}</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={form.ordering_enabled}
              onChange={(e) => set('ordering_enabled', e.target.checked)}
              aria-label={t('am.set.ordering')}
            />
            <span />
          </label>
        </div>
        <div className="toggle-row">
          <div>
            <strong>{t('am.set.delivery')}</strong>
            <p className="muted small">{t('am.set.deliveryHint')}</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={form.delivery_enabled}
              onChange={(e) => set('delivery_enabled', e.target.checked)}
              aria-label={t('am.set.delivery')}
            />
            <span />
          </label>
        </div>
      </div>

      {!form.ordering_enabled && <div className="alert alert-warn">{t('am.set.orderingOffWarn')}</div>}
      {status && (
        <div className={`alert ${status.kind === 'error' ? 'alert-error' : 'alert-info'}`} role="status">
          {status.msg}
        </div>
      )}
      <div className="row">
        <button className="btn btn-primary" disabled={busy}>
          {busy ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  );
}
