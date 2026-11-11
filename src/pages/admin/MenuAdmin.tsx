import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { formatDA, loc } from '../../lib/format';
import type { Category, Product } from '../../lib/types';
import CategoriesPanel from './menu/CategoriesPanel';
import ProductEditor from './menu/ProductEditor';
import { amError, bySort, hasPending, isOrderable, type MenuData } from './menu/shared';
import './admin-manage.css';

export default function MenuAdmin() {
  const { t, locale } = useI18n();
  const [data, setData] = useState<MenuData | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);

  const load = useCallback(async () => {
    const [cats, prods] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*, product_variants(*), product_extras(*), product_images(*)').order('sort_order'),
    ]);
    const err = cats.error ?? prods.error;
    if (err) {
      setError(amError(err, t));
      return;
    }
    setError('');
    setData({ categories: cats.data as Category[], products: prods.data as Product[] });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingProducts = useMemo(() => (data?.products ?? []).filter(hasPending), [data]);
  const productCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of data?.products ?? []) m[p.category_id] = (m[p.category_id] ?? 0) + 1;
    return m;
  }, [data]);

  const groups = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return [...data.categories]
      .sort(bySort)
      .filter((c) => !catFilter || c.id === catFilter)
      .map((c) => ({
        category: c,
        products: data.products
          .filter((p) => p.category_id === c.id)
          .filter((p) => !pendingOnly || hasPending(p))
          .filter(
            (p) =>
              !q ||
              [p.name_ar, p.name_fr, p.name_en].some((n) => n.toLowerCase().includes(q)),
          )
          .sort(bySort),
      }))
      .filter((g) => g.products.length > 0);
  }, [data, search, catFilter, pendingOnly]);

  const editingProduct = editing && editing !== 'new' ? (data?.products.find((p) => p.id === editing) ?? null) : null;
  const closeEditor = useCallback(() => setEditing(null), []);

  if (error && !data) {
    return (
      <div className="am-page">
        <h1>{t('am.menu.title')}</h1>
        <div className="alert alert-error">{error}</div>
        <div>
          <button className="btn" onClick={() => void load()}>
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="am-page">
        <h1>{t('am.menu.title')}</h1>
        <div className="muted">{t('common.loading')}</div>
      </div>
    );
  }

  const priceRange = (p: Product) => {
    const prices = p.product_variants.filter((v) => v.verification === 'verified').map((v) => v.price);
    if (!prices.length) return null;
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    return lo === hi ? formatDA(lo, locale) : `${formatDA(lo, locale)} – ${formatDA(hi, locale)}`;
  };

  return (
    <div className="am-page">
      <div className="am-head">
        <h1>{t('am.menu.title')}</h1>
        <button className="btn btn-primary" disabled={data.categories.length === 0} onClick={() => setEditing('new')}>
          + {t('am.prod.new')}
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      {pendingProducts.length > 0 && (
        <section className="panel am-pending" aria-live="polite">
          <h2>
            <span className="badge badge-yellow">{pendingProducts.length}</span>
            {t('am.pend.title')}
          </h2>
          <p>{t('am.pend.body')}</p>
          <div className="am-pending-list">
            {pendingProducts.map((p) => (
              <button className="am-pending-item" key={p.id} onClick={() => setEditing(p.id)}>
                <strong>{loc(p, 'name', locale)}</strong>
                <span className="row wrap" style={{ gap: 6 }}>
                  {[...p.product_variants]
                    .filter((v) => v.verification === 'pending')
                    .sort(bySort)
                    .map((v) => (
                      <span className="badge badge-yellow num" key={v.id}>
                        {formatDA(v.price, locale)}
                      </span>
                    ))}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <CategoriesPanel categories={data.categories} productCounts={productCounts} reload={load} />

      <section className="stack" style={{ gap: 18 }}>
        <div className="am-filters">
          <label className="field">
            <span>{t('common.search')}</span>
            <input className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <label className="field">
            <span>{t('am.prod.category')}</span>
            <select className="select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="">{t('common.all')}</option>
              {[...data.categories].sort(bySort).map((c) => (
                <option key={c.id} value={c.id}>
                  {loc(c, 'name', locale)}
                </option>
              ))}
            </select>
          </label>
          <label className="check" style={{ minHeight: 46 }}>
            <input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} />
            <span>{t('am.filter.pendingOnly')}</span>
          </label>
        </div>

        {groups.length === 0 && <div className="panel muted">{t('am.menu.empty')}</div>}

        {groups.map(({ category, products }) => (
          <div className="panel am-group" key={category.id}>
            <div className="am-group-title">
              {loc(category, 'name', locale)}
              {!category.is_active && <span className="badge badge-muted">{t('am.cat.inactive')}</span>}
              <span className="muted small">({products.length})</span>
            </div>
            <div>
              {products.map((p) => {
                const img = [...p.product_images].sort(bySort)[0];
                const range = priceRange(p);
                return (
                  <button className="am-prod-row" key={p.id} onClick={() => setEditing(p.id)}>
                    {img ? (
                      <img className="am-thumb" src={img.url} alt="" loading="lazy" />
                    ) : (
                      <span className="am-thumb empty">{t('am.img.noneShort')}</span>
                    )}
                    <span className="am-prod-main">
                      <span className="am-prod-name">{loc(p, 'name', locale)}</span>
                      <span className="am-badges">
                        {hasPending(p) && <span className="badge badge-yellow">{t('am.badge.pending')}</span>}
                        {!p.is_published && <span className="badge badge-dark">{t('am.badge.unpublished')}</span>}
                        {!p.is_available && <span className="badge badge-muted">{t('am.badge.unavailable')}</span>}
                        {p.is_published && !isOrderable(p) && (
                          <span className="badge badge-solid-red">{t('am.badge.notOrderable')}</span>
                        )}
                      </span>
                    </span>
                    <span className="am-price num">{range ?? '—'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {editing && (editing === 'new' || editingProduct) && (
        <ProductEditor
          key={editing}
          product={editingProduct}
          categories={data.categories}
          defaultCategoryId={catFilter || [...data.categories].sort(bySort)[0]?.id || ''}
          reload={load}
          onClose={closeEditor}
          onCreated={(id) => setEditing(id)}
        />
      )}
    </div>
  );
}
