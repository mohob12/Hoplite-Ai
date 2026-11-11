import { useState, type FormEvent } from 'react';
import { supabase } from '../../../lib/supabase';
import { useI18n } from '../../../lib/i18n';
import { formatDA, loc } from '../../../lib/format';
import type { Product, Variant, Verification } from '../../../lib/types';
import { LocalizedTrio, SwitchField } from './fields';
import { amError, bySort, hasAllNames, parseDA } from './shared';

interface FormState {
  name_ar: string;
  name_fr: string;
  name_en: string;
  description_ar: string;
  description_fr: string;
  description_en: string;
  price: string;
  is_available: boolean;
  verification: Verification;
}

const PRESETS: { key: string; ar: string; fr: string; en: string }[] = [
  { key: 'normal', ar: 'عادي', fr: 'Normal', en: 'Regular' },
  { key: 'small', ar: 'صغير', fr: 'Petit', en: 'Small' },
  { key: 'large', ar: 'كبير', fr: 'Grand', en: 'Large' },
];

function initial(v: Variant | null): FormState {
  return {
    name_ar: v?.name_ar ?? '',
    name_fr: v?.name_fr ?? '',
    name_en: v?.name_en ?? '',
    description_ar: v?.description_ar ?? '',
    description_fr: v?.description_fr ?? '',
    description_en: v?.description_en ?? '',
    price: v ? String(v.price) : '',
    is_available: v?.is_available ?? true,
    verification: v?.verification ?? 'pending',
  };
}

function VariantForm({
  variant,
  productId,
  nextSort,
  autoOpen,
  onDone,
  onCancel,
}: {
  variant: Variant | null;
  productId: string;
  nextSort: number;
  autoOpen?: boolean;
  onDone: () => Promise<void>;
  onCancel?: () => void;
}) {
  const { t, locale } = useI18n();
  const [f, setF] = useState<FormState>(() => initial(variant));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(autoOpen ?? !variant);

  const set = (k: string, v: string | boolean) => {
    setError('');
    setF((s) => ({ ...s, [k]: v }));
  };
  const pending = f.verification === 'pending';

  function save(e: FormEvent) {
    e.preventDefault();
    return persist(f.verification);
  }

  async function persist(verification: Verification) {
    const price = parseDA(f.price);
    if (price === null) return setError(t('am.err.price'));
    if (verification === 'verified' && !hasAllNames(f)) return setError(t('am.err.verifiedNeedsNames'));
    setBusy(true);
    const payload = {
      name_ar: f.name_ar.trim(),
      name_fr: f.name_fr.trim(),
      name_en: f.name_en.trim(),
      description_ar: f.description_ar.trim(),
      description_fr: f.description_fr.trim(),
      description_en: f.description_en.trim(),
      price,
      is_available: f.is_available,
      verification,
    };
    const { error: err } = variant
      ? await supabase.from('product_variants').update(payload).eq('id', variant.id)
      : await supabase.from('product_variants').insert({ ...payload, product_id: productId, sort_order: nextSort });
    if (err) {
      setError(amError(err, t));
      setBusy(false);
      return;
    }
    if (verification !== f.verification) set('verification', verification);
    await onDone();
    setBusy(false);
    if (variant) setOpen(false);
    else onCancel?.();
  }

  async function remove() {
    if (!variant || !window.confirm(t('am.var.confirmDelete'))) return;
    setBusy(true);
    const { error: err } = await supabase.from('product_variants').delete().eq('id', variant.id);
    if (err) {
      setError(amError(err, t));
      setBusy(false);
      return;
    }
    await onDone();
  }

  if (variant && !open) {
    const label = loc(variant, 'name', locale);
    return (
      <div className={`am-card ${variant.verification === 'pending' ? 'pending' : ''}`}>
        <div className="row wrap">
          <strong>{label || t('am.var.unnamed')}</strong>
          <span className="am-price num">{formatDA(variant.price, locale)}</span>
          <span className={`badge ${variant.verification === 'pending' ? 'badge-yellow' : 'badge-dark'}`}>
            {variant.verification === 'pending' ? t('am.var.pending') : t('am.var.verified')}
          </span>
          {!variant.is_available && <span className="badge badge-muted">{t('am.badge.unavailable')}</span>}
          <span className="spacer" />
          <button className="btn btn-sm" onClick={() => setOpen(true)}>
            {t('am.edit')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className={`am-card ${variant && pending ? 'pending' : ''}`} onSubmit={save}>
      {variant && pending && <div className="alert alert-warn">{t('am.var.pendingHint')}</div>}
      <div className="am-quick">
        <span className="muted small">{t('am.var.quickNames')}</span>
        {PRESETS.map((p) => (
          <button
            type="button"
            key={p.key}
            className="btn btn-sm"
            onClick={() => setF((s) => ({ ...s, name_ar: p.ar, name_fr: p.fr, name_en: p.en }))}
          >
            {t(`am.var.preset.${p.key}`)}
          </button>
        ))}
      </div>
      <LocalizedTrio label={t('am.var.name')} base="name" values={f} onChange={set} />
      <LocalizedTrio label={t('am.var.description')} base="description" values={f} onChange={set} optional />
      <div className="am-form-grid two">
        <label className="field">
          <span>{t('am.var.price')}</span>
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
        <label className="field">
          <span>{t('am.var.verification')}</span>
          <select
            className="select"
            value={f.verification}
            onChange={(e) => set('verification', e.target.value)}
          >
            <option value="pending">{t('am.var.pending')}</option>
            <option value="verified">{t('am.var.verified')}</option>
          </select>
        </label>
      </div>
      <SwitchField label={t('am.var.available')} checked={f.is_available} onChange={(v) => set('is_available', v)} />
      {error && <div className="alert alert-error">{error}</div>}
      <div className="am-card-actions">
        <button className="btn btn-primary btn-sm" disabled={busy}>
          {busy ? t('common.saving') : t('common.save')}
        </button>
        {!pending || !variant ? null : (
          <button
            type="button"
            className="btn btn-yellow btn-sm"
            disabled={busy}
            onClick={() => persist('verified')}
          >
            {t('am.var.markVerified')}
          </button>
        )}
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          disabled={busy}
          onClick={() => {
            if (variant) {
              setF(initial(variant));
              setError('');
              setOpen(false);
            } else onCancel?.();
          }}
        >
          {t('common.cancel')}
        </button>
        <span className="spacer" />
        {variant && (
          <button type="button" className="btn btn-sm btn-outline-red" disabled={busy} onClick={remove}>
            {t('am.delete')}
          </button>
        )}
      </div>
    </form>
  );
}

export default function VariantsSection({ product, reload }: { product: Product; reload: () => Promise<void> }) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const variants = [...product.product_variants].sort(bySort);
  const nextSort = variants.reduce((m, v) => Math.max(m, v.sort_order), -1) + 1;

  return (
    <section className="am-section">
      <h3>{t('am.var.title')}</h3>
      <p className="muted small">{t('am.var.help')}</p>
      {variants.length === 0 && <div className="alert alert-warn">{t('am.var.none')}</div>}
      {variants.map((v) => (
        <VariantForm key={v.id} variant={v} productId={product.id} nextSort={nextSort} onDone={reload} />
      ))}
      {adding ? (
        <VariantForm
          variant={null}
          productId={product.id}
          nextSort={nextSort}
          onDone={reload}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <div>
          <button className="btn btn-sm" onClick={() => setAdding(true)}>
            + {t('am.var.add')}
          </button>
        </div>
      )}
    </section>
  );
}
