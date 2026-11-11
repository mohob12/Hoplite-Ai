import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';
import { formatDA, loc } from '../lib/format';
import { useSettings } from '../lib/settings';
import ProductModal, { orderableVariants, productImage } from '../components/ProductModal';
import CartPopup from '../components/CartPopup';
import { ImagePlaceholder } from '../components/Logo';
import HeroBanner from '../components/HeroBanner';
import { matchesQuery, productHaystack } from '../lib/search';
import type { Category, Product } from '../lib/types';

export default function MenuPage() {
  const { t, locale } = useI18n();
  const settings = useSettings();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [selected, setSelected] = useState<Product | null>(null);
  const [activeCat, setActiveCat] = useState<string>('');
  const [added, setAdded] = useState<{ key: string; name: string } | null>(null);

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

  // The tab bar is transparent over the page pattern and only gets a backdrop once stuck.
  const tabsSentinel = useRef<HTMLDivElement>(null);
  const [tabsStuck, setTabsStuck] = useState(false);
  const hasTabs = state === 'ok';
  useEffect(() => {
    const el = tabsSentinel.current;
    if (!el) return;
    const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;
    const io = new IntersectionObserver(([e]) => setTabsStuck(!e.isIntersecting && e.boundingClientRect.top < headerH + 1), {
      rootMargin: `-${headerH + 1}px 0px 0px 0px`,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasTabs]);

  const allSections = useMemo(
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

  const [query, setQuery] = useState('');
  const searching = query.trim().length > 0;
  const haystacks = useMemo(() => {
    const m = new Map<string, string>();
    for (const { cat, items } of allSections) for (const p of items) m.set(p.id, productHaystack(p, cat));
    return m;
  }, [allSections]);
  const sections = useMemo(
    () =>
      searching
        ? allSections
            .map((s) => ({ ...s, items: s.items.filter((p) => matchesQuery(haystacks.get(p.id) ?? '', query)) }))
            .filter((s) => s.items.length > 0)
        : allSections,
    [allSections, haystacks, query, searching],
  );
  const resultCount = sections.reduce((n, s) => n + s.items.length, 0);

  const closePopup = useCallback(() => setAdded(null), []);

  const jump = (id: string) => {
    setActiveCat(id);
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
    <HeroBanner />
    <div className="container">
      <section className="hero">
        <h1>
          {t('menu.title')} <span className="accent">Mac Kiffan</span>
        </h1>
        <p>{t('menu.subtitle')}</p>
        <div className="hero-strip" />
        {allSections.length > 0 && (
          <div className="menu-search" role="search">
            <SearchIcon />
            <input
              type="search"
              className="input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
              placeholder={t('menu.searchPlaceholder')}
              aria-label={t('menu.search')}
              enterKeyHint="search"
              autoComplete="off"
              data-testid="menu-search"
            />
            {searching && (
              <button type="button" className="menu-search-clear" onClick={() => setQuery('')} aria-label={t('menu.searchClear')}>
                ×
              </button>
            )}
          </div>
        )}
        {searching && (
          <p className="menu-search-count" aria-live="polite" data-testid="menu-search-count">
            {resultCount > 0 ? t('menu.searchCount', { n: resultCount }) : ''}
          </p>
        )}
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
      {state === 'ok' && allSections.length === 0 && <p className="muted">{t('menu.empty')}</p>}
      {searching && sections.length === 0 && (
        <div className="panel menu-search-empty" data-testid="menu-search-empty">
          <p>{t('menu.searchNone', { q: query.trim() })}</p>
          <button type="button" className="btn btn-sm" onClick={() => setQuery('')}>
            {t('menu.searchClear')}
          </button>
        </div>
      )}

      {allSections.length > 0 && <div ref={tabsSentinel} aria-hidden="true" />}
      {sections.length > 0 && (
        <nav className={`cat-tabs ${tabsStuck ? 'stuck' : ''}`} aria-label={t('menu.title')}>
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
                    {img ? <img src={img} alt={name} loading="lazy" /> : <ImagePlaceholder />}
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
                        {new Set(prices).size > 1 && <small>{t('menu.from')}</small>}
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
          onAdded={(key, name) => {
            setSelected(null);
            setAdded({ key, name });
          }}
        />
      )}

      {added && <CartPopup addedKey={added.key} addedName={added.name} onClose={closePopup} />}
    </div>
    </>
  );
}

function SearchIcon() {
  return (
    <svg className="menu-search-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
