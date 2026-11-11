import { useState, type FormEvent } from 'react';
import { supabase } from '../../../lib/supabase';
import { useI18n } from '../../../lib/i18n';
import { formatDA, loc } from '../../../lib/format';
import type { Extra, Product } from '../../../lib/types';
import { LocalizedTrio, SwitchField } from './fields';
import { amError, bySort, parseDA } from './shared';

interface FormState {
  name_ar: string;
  name_fr: string;
  name_en: string;
  price: string;
  is_available: boolean;
}

function ExtraForm({
  extra,
  productId,
  nextSort,
  onDone,
  onCancel,
}: {
  extra: Extra | null;
  productId: string;
  nextSort: number;
  onDone: () => Promise<void>;
  onCancel?: () => void;
}) {
  const { t, locale } = useI18n();
  const [f, setF] = useState<FormState>(() => ({
    name_ar: extra?.name_ar ?? '',
    name_fr: extra?.name_fr ?? '',
    name_en: extra?.name_en ?? '',
    price: extra ? String(extra.price) : '0',
    is_available: extra?.is_available ?? true,
  }));
  const [open, setOpen] = useState(!extra);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string | boolean) => {
    setError('');
    setF((s) => ({ ...s, [k]: v }));
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    const price = parseDA(f.price);
    if (price === null) return setError(t('am.err.price'));
    if (!f.name_ar.trim() || !f.name_fr.trim() || !f.name_en.trim()) return setError(t('am.err.namesRequired'));
    setBusy(true);
    const payload = {
      name_ar: f.name_ar.trim(),
      name_fr: f.name_fr.trim(),
      name_en: f.name_en.trim(),
      price,
      is_available: f.is_available,
    };
    const { error: err } = extra
      ? await supabase.from('product_extras').update(payload).eq('id', extra.id)
      : await supabase.from('product_extras').insert({ ...payload, product_id: productId, sort_order: nextSort });
    if (err) {
      setError(amError(err, t));
      setBusy(false);
      return;
    }
    await onDone();
    setBusy(false);
    if (extra) setOpen(false);
    else onCancel?.();
  }

  async function remove() {
    if (!extra || !window.confirm(t('am.extra.confirmDelete'))) return;
    setBusy(true);
    const { error: err } = await supabase.from('product_extras').delete().eq('id', extra.id);
    if (err) {
      setError(amError(err, t));
      setBusy(false);
      return;
    }
    await onDone();
  }

  if (extra && !open) {
    return (
      <div className="am-card">
        <div className="row wrap">
          <strong>{loc(extra, 'name', locale)}</strong>
          <span className="am-price num">+{formatDA(extra.price, locale)}</span>
          {!extra.is_available && <span className="badge badge-muted">{t('am.badge.unavailable')}</span>}
          <span className="spacer" />
          <button className="btn btn-sm" onClick={() => setOpen(true)}>
            {t('am.edit')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="am-card" onSubmit={save}>
      <LocalizedTrio label={t('am.extra.name')} base="name" values={f} onChange={set} />
      <label className="field" style={{ maxWidth: 240 }}>
        <span>{t('am.extra.price')}</span>
        <input
          className="input"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          required
          value={f.price}
          onChange={(e) => set('price', e.target.value)}
        />
      </label>
      <SwitchField label={t('am.extra.available')} checked={f.is_available} onChange={(v) => set('is_available', v)} />
      {error && <div className="alert alert-error">{error}</div>}
      <div className="am-card-actions">
        <button className="btn btn-primary btn-sm" disabled={busy}>
          {busy ? t('common.saving') : t('common.save')}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          disabled={busy}
          onClick={() => {
            if (extra) setOpen(false);
            else onCancel?.();
          }}
        >
          {t('common.cancel')}
        </button>
        <span className="spacer" />
        {extra && (
          <button type="button" className="btn btn-sm btn-outline-red" disabled={busy} onClick={remove}>
            {t('am.delete')}
          </button>
        )}
      </div>
    </form>
  );
}

export default function ExtrasSection({ product, reload }: { product: Product; reload: () => Promise<void> }) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const extras = [...product.product_extras].sort(bySort);
  const nextSort = extras.reduce((m, x) => Math.max(m, x.sort_order), -1) + 1;

  return (
    <section className="am-section">
      <h3>{t('am.extra.title')}</h3>
      <p className="muted small">{t('am.extra.help')}</p>
      {extras.map((x) => (
        <ExtraForm key={x.id} extra={x} productId={product.id} nextSort={nextSort} onDone={reload} />
      ))}
      {adding ? (
        <ExtraForm
          extra={null}
          productId={product.id}
          nextSort={nextSort}
          onDone={reload}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <div>
          <button className="btn btn-sm" onClick={() => setAdding(true)}>
            + {t('am.extra.add')}
          </button>
        </div>
      )}
    </section>
  );
}
