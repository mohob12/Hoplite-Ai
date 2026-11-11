import { useEffect, useRef } from 'react';
import { useI18n } from '../lib/i18n';
import { useCart } from '../lib/cart';
import { useSettings } from '../lib/settings';
import { formatDA } from '../lib/format';
import CartLines from './CartLines';

/**
 * Shown right after a dish is added: the whole cart, editable in place,
 * with "add more" (back to the menu) and "checkout" (opens the cart drawer).
 */
export default function CartPopup({ addedKey, addedName, onClose }: { addedKey: string | null; addedName: string; onClose: () => void }) {
  const { t, locale } = useI18n();
  const cart = useCart();
  const settings = useSettings();
  const moreRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    moreRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const empty = cart.lines.length === 0;
  const deliveryOn = settings?.delivery_enabled !== false;

  const checkout = () => {
    onClose();
    cart.setOpen(true);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal cart-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-popup-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="cart-popup"
      >
        <header className="cp-head">
          <span className="cp-check" aria-hidden="true">
            ✓
          </span>
          <div className="stack" style={{ gap: 0, flex: 1, minWidth: 0 }}>
            <h2 id="cart-popup-title">{t('cp.title')}</h2>
            {addedName && !empty && <span className="small muted cp-added">{t('cp.added', { name: addedName })}</span>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            ✕
          </button>
        </header>

        <div className="cp-body">
          {empty ? (
            <p className="muted" style={{ textAlign: 'center', padding: '28px 0' }} data-testid="cart-popup-empty">
              {t('cart.empty')}
            </p>
          ) : (
            <>
              <div className="cp-count small muted">{t('cp.items', { n: cart.count })}</div>
              <CartLines highlightKey={addedKey} />
            </>
          )}
        </div>

        {!empty && (
          <div className="cp-summary summary" data-testid="cart-popup-summary">
            <div className="line">
              <span>{t('sum.subtotal')}</span>
              <strong className="num" data-testid="cart-popup-subtotal">
                {formatDA(cart.subtotal, locale)}
              </strong>
            </div>
            {deliveryOn && (
              <div className="line">
                <span>{t('sum.deliveryFee')}</span>
                <span className="cp-fee" data-testid="cart-popup-fee">
                  {t('cp.feeNote')}
                </span>
              </div>
            )}
            <div className="small muted">💵 {t('pay.label')}</div>
          </div>
        )}

        <footer className="cp-foot">
          <button ref={moreRef} type="button" className="btn btn-outline-red cp-more" onClick={onClose} data-testid="cart-popup-continue">
            <span aria-hidden="true">＋</span> {t('cp.more')}
          </button>
          {!empty && (
            <button type="button" className="btn btn-primary cp-go" onClick={checkout} data-testid="cart-popup-checkout">
              {t('cp.checkout')} <span aria-hidden="true">·</span> <span className="num">{formatDA(cart.subtotal, locale)}</span>
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
