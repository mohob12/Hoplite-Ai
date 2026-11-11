import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../../lib/supabase';
import { useI18n } from '../../../lib/i18n';
import { loc } from '../../../lib/format';
import type { Category, Product } from '../../../lib/types';
import { LocalizedTrio, SwitchField } from './fields';
import VariantsSection from './VariantsSection';
import ExtrasSection from './ExtrasSection';
import ImagesSection from './ImagesSection';
import { amError, isOrderable, parseDA, parseIntOr } from './shared';

interface Props {
  product: Product | null;
  categories: Category[];
  defaultCategoryId: string;
  reload: () => Promise<void>;
  onClose: () => void;
  onCreated: (id: string) => void;
}

interface FormState {
  category_id: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  description_ar: string;
  description_fr: string;
  description_en: string;
  is_available: boolean;
  is_published: boolean;
  sort_order: string;
  first_price: string;
}

export default function ProductEditor({ product, categories, defaultCategoryId, reload, onClose, onCreated }: Props) {
  const { t, locale } = useI18n();
  const [f, setF] = useState<FormState>(() => ({
    category_id: product?.category_id ?? defaultCategoryId,
    name_ar: product?.name_ar ?? '',
    name_fr: product?.name_fr ?? '',
    name_en: product?.name_en ?? '',
    description_ar: product?.description_ar ?? '',
    description_fr: product?.description_fr ?? '',
    description_en: product?.description_en ?? '',
    is_available: product?.is_available ?? true,
    is_published: product?.is_published ?? true,
    sort_order: String(product?.sort_order ?? 0),
    first_price: '',
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k: string, v: string | boolean) => {
    setError('');
    setSaved(false);
    setF((s) => ({ ...s, [k]: v }));
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!f.category_id) return setError(t('am.err.category'));
    if (!f.name_ar.trim() || !f.name_fr.trim() || !f.name_en.trim()) return setError(t('am.err.namesRequired'));
    let firstPrice: number | null = null;
    if (!product && f.first_price.trim()) {
      firstPrice = parseDA(f.first_price);
      if (firstPrice === null) return setError(t('am.err.price'));
    }
    setBusy(true);
    const payload = {
      category_id: f.category_id,
      name_ar: f.name_ar.trim(),
      name_fr: f.name_fr.trim(),
      name_en: f.name_en.trim(),
      description_ar: f.description_ar.trim(),
      description_fr: f.description_fr.trim(),
      description_en: f.description_en.trim(),
      is_available: f.is_available,
      is_published: f.is_published,
      sort_order: parseIntOr(f.sort_order),
    };
    if (product) {
      const { error: err } = await supabase.from('products').update(payload).eq('id', product.id);
      if (err) setError(amError(err, t));
      else {
        await reload();
        setSaved(true);
      }
    } else {
      const { data, error: err } = await supabase.from('products').insert(payload).select('id').single();
      if (err || !data) setError(amError(err, t));
      else {
        if (firstPrice !== null) {
          const { error: vErr } = await supabase.from('product_variants').insert({
            product_id: data.id,
            name_ar: 'عادي',
            name_fr: 'Normal',
            name_en: 'Regular',
            price: firstPrice,
            verification: 'verified',
            sort_order: 0,
          });
          if (vErr) setError(amError(vErr, t));
        }
        await reload();
        onCreated(data.id);
      }
    }
    setBusy(false);
  }

  async function remove() {
    if (!product || !window.confirm(t('am.prod.confirmDelete', { name: loc(product, 'name', locale) }))) return;
    setBusy(true);
    const { error: err } = await supabase.from('products').delete().eq('id', product.id);
    if (err) {
      setError(amError(err, t));
      setBusy(false);
      return;
    }
    await reload();
    onClose();
  }

  const notOrderable = product && f.is_published && !isOrderable(product);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t('am.prod.edit')}>
      <div className="modal am-modal">
        <div className="am-modal-head">
          <h2>{product ? loc(product, 'name', locale) : t('am.prod.new')}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            ✕
          </button>
        </div>
        <div className="modal-body" style={{ gap: 22 }}>
          <form className="stack" style={{ gap: 18 }} onSubmit={save}>
            <label className="field" style={{ maxWidth: 360 }}>
              <span>{t('am.prod.category')}</span>
              <select
                className="select"
                required
                value={f.category_id}
                onChange={(e) => set('category_id', e.target.value)}
              >
                {!f.category_id && <option value="" />}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {loc(c, 'name', locale)}
                  </option>
                ))}
              </select>
            </label>
            <LocalizedTrio label={t('am.prod.name')} base="name" values={f} onChange={set} required />
            <LocalizedTrio label={t('am.prod.description')} base="description" values={f} onChange={set} multiline optional />
            <div className="am-check-row">
              <SwitchField label={t('am.prod.available')} checked={f.is_available} onChange={(v) => set('is_available', v)} />
              <SwitchField label={t('am.prod.published')} checked={f.is_published} onChange={(v) => set('is_published', v)} />
            </div>
            <div className="am-form-grid two">
              <label className="field">
                <span>{t('am.sortOrder')}</span>
                <input
                  className="input"
                  type="number"
                  step={1}
                  value={f.sort_order}
                  onChange={(e) => set('sort_order', e.target.value)}
                />
              </label>
              {!product && (
                <label className="field">
                  <span>
                    {t('am.prod.firstPrice')} <em className="hint">({t('common.optional')})</em>
                  </span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={f.first_price}
                    onChange={(e) => set('first_price', e.target.value)}
                  />
                </label>
              )}
            </div>
            {!product && <p className="am-note">{t('am.prod.createHint')}</p>}
            {notOrderable && <div className="alert alert-warn">{t('am.prod.notOrderableHint')}</div>}
            {error && <div className="alert alert-error">{error}</div>}
            {saved && <div className="alert alert-info" role="status">{t('common.saved')}</div>}
            <div className="am-card-actions">
              <button className="btn btn-primary" disabled={busy}>
                {busy ? t('common.saving') : product ? t('common.save') : t('am.prod.create')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                {t('common.close')}
              </button>
              <span className="spacer" />
              {product && (
                <button type="button" className="btn btn-outline-red" disabled={busy} onClick={remove}>
                  {t('am.delete')}
                </button>
              )}
            </div>
          </form>

          {product && (
            <>
              <VariantsSection product={product} reload={reload} />
              <ExtrasSection product={product} reload={reload} />
              <ImagesSection product={product} reload={reload} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
