import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../lib/i18n';
import { formatDA, loc } from '../lib/format';
import { MAX_QTY, useCart } from '../lib/cart';
import { useSettings } from '../lib/settings';
import type { Product, Variant } from '../lib/types';

/** Variants a customer may pick: verified only (admins viewing the site also receive pending rows). */
export function orderableVariants(p: Product): Variant[] {
  return p.product_variants
    .filter((v) => v.verification === 'verified' && v.is_available)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function productImage(p: Product): string | undefined {
  return [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
}

export default function ProductModal({
  product,
  onClose,
  onAdded,
}: {
  product: Product;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { t, locale } = useI18n();
  const { add } = useCart();
  const settings = useSettings();
  const verified = useMemo(
    () => product.product_variants.filter((v) => v.verification === 'verified').sort((a, b) => a.sort_order - b.sort_order),
    [product],
  );
  const choosable = verified.length > 1;
  const extras = useMemo(
    () => product.product_extras.filter((e) => e.is_available).sort((a, b) => a.sort_order - b.sort_order),
    [product],
  );
  const [variantId, setVariantId] = useState<string | null>(() => {
    const avail = orderableVariants(product);
    return verified.length === 1 && avail.length === 1 ? avail[0].id : null;
  });
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const variant = verified.find((v) => v.id === variantId) ?? null;
  const chosenExtras = extras.filter((e) => extraIds.includes(e.id));
  const unit = (variant?.price ?? 0) + chosenExtras.reduce((s, e) => s + e.price, 0);
  const canOrder = product.is_available && settings?.ordering_enabled !== false;
  const name = loc(product, 'name', locale);
  const img = productImage(product);

  function submit() {
    if (!variant) return;
    add({
      productId: product.id,
      variantId: variant.id,
      product: { name_ar: product.name_ar, name_fr: product.name_fr, name_en: product.name_en },
      variant: choosable ? { name_ar: variant.name_ar, name_fr: variant.name_fr, name_en: variant.name_en } : null,
      unitPrice: variant.price,
      extras: chosenExtras.map((e) => ({ id: e.id, name_ar: e.name_ar, name_fr: e.name_fr, name_en: e.name_en, price: e.price })),
      quantity: qty,
      image: img,
    });
    onAdded();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={name}
        onClick={(e) => e.stopPropagation()}
        data-testid="product-modal"
      >
        <div className="modal-head">
          {img && <img className="modal-img" src={img} alt={name} />}
          <button className="icon-btn modal-close" onClick={onClose} aria-label={t('common.close')}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="stack" style={{ gap: 4 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{name}</h2>
            {loc(product, 'description', locale) && <p className="muted">{loc(product, 'description', locale)}</p>}
            {!choosable && variant && (
              <div className="dish-price num" style={{ fontSize: '1.2rem' }}>
                {formatDA(variant.price, locale)}
              </div>
            )}
          </div>

          {choosable && (
            <fieldset className="opt-group" style={{ border: 0, padding: 0, margin: 0 }}>
              <h3>
                {t('pm.chooseVariant')} <span className="badge badge-red">{t('pm.required')}</span>
              </h3>
              {verified.map((v) => {
                const disabled = !v.is_available;
                const vdesc = loc(v, 'description', locale);
                return (
                  <label
                    key={v.id}
                    className={`opt ${variantId === v.id ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                    data-testid="variant-option"
                  >
                    <input
                      type="radio"
                      name="variant"
                      value={v.id}
                      checked={variantId === v.id}
                      disabled={disabled}
                      onChange={() => setVariantId(v.id)}
                    />
                    <span>
                      <strong>{loc(v, 'name', locale)}</strong>
                      {vdesc && <span className="muted small"> — {vdesc}</span>}
                      {disabled && <span className="muted small"> ({t('menu.unavailable')})</span>}
                    </span>
                    <span className="opt-price num">{formatDA(v.price, locale)}</span>
                  </label>
                );
              })}
            </fieldset>
          )}

          {extras.length > 0 && (
            <fieldset className="opt-group" style={{ border: 0, padding: 0, margin: 0 }}>
              <h3>
                {t('pm.extras')} <span className="muted small">({t('common.optional')})</span>
              </h3>
              {extras.map((e) => {
                const on = extraIds.includes(e.id);
                return (
                  <label key={e.id} className={`opt ${on ? 'selected' : ''}`} data-testid="extra-option">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setExtraIds((prev) => (on ? prev.filter((x) => x !== e.id) : [...prev, e.id]))}
                    />
                    <span>{loc(e, 'name', locale)}</span>
                    <span className="opt-price num">+{formatDA(e.price, locale)}</span>
                  </label>
                );
              })}
            </fieldset>
          )}

          <div className="row">
            <strong>{t('pm.quantity')}</strong>
            <div className="spacer" />
            <div className="qty">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="−">
                −
              </button>
              <span className="num" data-testid="modal-qty">
                {qty}
              </span>
              <button onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))} aria-label="+">
                +
              </button>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button
            className="btn btn-primary btn-block"
            disabled={!variant || !canOrder}
            onClick={submit}
            data-testid="add-to-cart"
          >
            {!canOrder ? (
              t('menu.unavailable')
            ) : variant ? (
              <>
                {t('pm.add')} · <span className="num" data-testid="modal-total">{formatDA(unit * qty, locale)}</span>
              </>
            ) : (
              t('pm.selectFirst')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
