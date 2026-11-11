import { useState, type FormEvent } from 'react';
import { supabase } from '../../../lib/supabase';
import { useI18n } from '../../../lib/i18n';
import { loc } from '../../../lib/format';
import type { Category } from '../../../lib/types';
import { LocalizedTrio, SwitchField } from './fields';
import { amError, bySort, parseIntOr } from './shared';

interface FormState {
  name_ar: string;
  name_fr: string;
  name_en: string;
  sort_order: string;
  is_active: boolean;
}

function CategoryForm({
  category,
  nextSort,
  onDone,
  onCancel,
}: {
  category: Category | null;
  nextSort: number;
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [f, setF] = useState<FormState>(() => ({
    name_ar: category?.name_ar ?? '',
    name_fr: category?.name_fr ?? '',
    name_en: category?.name_en ?? '',
    sort_order: String(category?.sort_order ?? nextSort),
    is_active: category?.is_active ?? true,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string | boolean) => {
    setError('');
    setF((s) => ({ ...s, [k]: v }));
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!f.name_ar.trim() || !f.name_fr.trim() || !f.name_en.trim()) return setError(t('am.err.namesRequired'));
    setBusy(true);
    const payload = {
      name_ar: f.name_ar.trim(),
      name_fr: f.name_fr.trim(),
      name_en: f.name_en.trim(),
      sort_order: parseIntOr(f.sort_order),
      is_active: f.is_active,
    };
    const { error: err } = category
      ? await supabase.from('categories').update(payload).eq('id', category.id)
      : await supabase.from('categories').insert(payload);
    if (err) {
      setError(amError(err, t));
      setBusy(false);
      return;
    }
    await onDone();
    setBusy(false);
    onCancel();
  }

  return (
    <form className="am-card" onSubmit={save}>
      <LocalizedTrio label={t('am.cat.name')} base="name" values={f} onChange={set} required />
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
        <div style={{ alignSelf: 'end', paddingBottom: 8 }}>
          <SwitchField label={t('am.cat.active')} checked={f.is_active} onChange={(v) => set('is_active', v)} />
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="am-card-actions">
        <button className="btn btn-primary btn-sm" disabled={busy}>
          {busy ? t('common.saving') : t('common.save')}
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}

export default function CategoriesPanel({
  categories,
  productCounts,
  reload,
}: {
  categories: Category[];
  productCounts: Record<string, number>;
  reload: () => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [error, setError] = useState('');
  const sorted = [...categories].sort(bySort);
  const nextSort = sorted.reduce((m, c) => Math.max(m, c.sort_order), 0) + 1;

  async function remove(c: Category) {
    if (!window.confirm(t('am.cat.confirmDelete', { name: loc(c, 'name', locale) }))) return;
    setError('');
    const { error: err } = await supabase.from('categories').delete().eq('id', c.id);
    if (err) setError(err.code === '23503' ? t('am.cat.hasProducts') : amError(err, t));
    else await reload();
  }

  return (
    <section className="panel stack" style={{ gap: 16 }}>
      <div className="row">
        <h2 style={{ margin: 0 }}>
          {t('am.cat.title')} <span className="muted small">({categories.length})</span>
        </h2>
        <span className="spacer" />
        <button className="btn btn-sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? t('am.cat.hide') : t('am.cat.manage')}
        </button>
      </div>
      {open && (
        <>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="am-cat-list">
            {sorted.map((c) =>
              editing === c.id ? (
                <CategoryForm key={c.id} category={c} nextSort={nextSort} onDone={reload} onCancel={() => setEditing(null)} />
              ) : (
                <div className="am-cat-row" key={c.id}>
                  <span className="muted num">{c.sort_order}</span>
                  <span className="am-cat-name">{loc(c, 'name', locale)}</span>
                  <span className="muted small">{t('am.cat.products', { n: productCounts[c.id] ?? 0 })}</span>
                  {!c.is_active && <span className="badge badge-muted">{t('am.cat.inactive')}</span>}
                  <button className="btn btn-sm" onClick={() => setEditing(c.id)}>
                    {t('am.edit')}
                  </button>
                  <button className="btn btn-sm btn-outline-red" onClick={() => remove(c)}>
                    {t('am.delete')}
                  </button>
                </div>
              ),
            )}
          </div>
          {editing === 'new' ? (
            <CategoryForm category={null} nextSort={nextSort} onDone={reload} onCancel={() => setEditing(null)} />
          ) : (
            <div>
              <button className="btn btn-sm btn-dark" onClick={() => setEditing('new')}>
                + {t('am.cat.add')}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
