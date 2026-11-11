import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import { formatDA, loc } from '../lib/format';
import { useSettings } from '../lib/settings';
import ProductModal, { orderableVariants, productImage } from '../components/ProductModal';
import type { Category, Product } from '../lib/types';

export default function MenuPage() {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [selected, setSelected] = useState<Product | null>(null);
  const [activeCat, setActiveCat] = useState<string>('');
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(async () => {
    setState('loading');
    const [c, p] = await Promise.all([
      supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
      supabase
        .from('products')
        .select('*, product_variants(*), product_extras(*), product_images(*)')
        .eq('is_published', true)
        .order('sort_order'),
    ]);
    if (c.error || p.error) {
      setState('error');
      return;
    }
    setCategories(c.data as Category[]);
    setProducts(p.data as Product[]);
    setState('ok');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sections = useMemo(
    () =>
      categories
        .map((c) => ({
          cat: c,
          items: products.filter(
            (p) => p.category_id === c.id && p.product_variants.some((v) => v.verification === 'verified'),
          ),
        }))
        .filter((s) => s.items.length > 0),
    [categories, products],
  );

  const showToast = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  };

  const jump = (id: string) => {
    setActiveCat(id);
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="container">
      <section className="hero">
        <h1>
          {t('menu.title')} <span className="accent">Mac Kiffan</span>
        </h1>
        <p>{t('menu.subtitle')}</p>
        <div className="hero-strip" />
      </section>

      {settings && !settings.ordering_enabled && <div className="alert alert-warn">{t('menu.orderingOff')}</div>}

      {state === 'loading' && <p className="muted">{t('common.loading')}</p>}
      {state === 'error' && (
        <div className="alert alert-error row">
          <span>{t('menu.loadError')}</span>
          <div className="spacer" />
          <button className="btn btn-sm" onClick={() => void load()}>
            {t('common.retry')}
          </button>
        </div>
      )}
      {state === 'ok' && sections.length === 0 && <p className="muted">{t('menu.empty')}</p>}

      {sections.length > 0 && (
        <nav className="cat-tabs" aria-label={t('menu.title')}>
          {sections.map(({ cat }) => (
            <button key={cat.id} className={`cat-tab ${activeCat === cat.id ? 'active' : ''}`} onClick={() => jump(cat.id)}>
              {loc(cat, 'name', locale)}
            </button>
          ))}
        </nav>
      )}

      {sections.map(({ cat, items }) => (
        <section key={cat.id} id={`cat-${cat.id}`} className="menu-section">
          <h2>{loc(cat, 'name', locale)}</h2>
          <div className="menu-grid">
            {items.map((p) => {
              const variants = orderableVariants(p);
              const available = p.is_available && variants.length > 0;
              const prices = variants.map((v) => v.price);
              const min = prices.length ? Math.min(...prices) : 0;
              const img = productImage(p);
              const name = loc(p, 'name', locale);
              return (
                <article key={p.id} className="dish" data-testid="dish" data-name={p.name_fr}>
                  <button
                    className="dish-img"
                    onClick={() => setSelected(p)}
                    aria-label={name}
                    data-testid="dish-open"
                  >
                    {img ? <img src={img} alt={name} loading="lazy" /> : null}
                    {available ? (
                      <span className="plus" aria-hidden="true">
                        +
                      </span>
                    ) : (
                      <span className="soldout">{t('menu.unavailable')}</span>
                    )}
                  </button>
                  <div className="dish-body">
                    <div className="dish-name">{name}</div>
                    <div className="dish-desc">{loc(p, 'description', locale)}</div>
                    {available && (
                      <div className="dish-price">
                        {prices.length > 1 && <small>{t('menu.from')}</small>}
                        <span className="num">{formatDA(min, locale)}</span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {selected && (
        <ProductModal
          product={selected}
          onClose={() => setSelected(null)}
          onAdded={() => {
            setSelected(null);
            showToast(t('pm.added'));
          }}
        />
      )}

      {toast && (
        <div className="toast-wrap" aria-live="polite">
          <div className="toast">✓ {toast}</div>
        </div>
      )}
    </div>
  );
}
