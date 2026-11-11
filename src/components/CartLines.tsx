import { useI18n } from '../lib/i18n';
import { MAX_QTY, lineUnitTotal, useCart } from '../lib/cart';
import { formatDA, loc } from '../lib/format';

/** Cart items with quantity controls and delete; shared by the cart drawer and the post-add popup. */
export default function CartLines({ highlightKey }: { highlightKey?: string | null }) {
  const { t, locale } = useI18n();
  const cart = useCart();
  return (
    <div className="stack" style={{ gap: 8 }}>
      {cart.lines.map((l) => {
        const name = loc(l.product, 'name', locale);
        return (
          <div key={l.key} className={`cart-line ${highlightKey === l.key ? 'just-added' : ''}`} data-testid="cart-line">
            {l.image && <img src={l.image} alt="" />}
            <div className="info">
              <div className="row" style={{ alignItems: 'flex-start', gap: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="name">{name}</div>
                  {l.variant && <div className="meta">{loc(l.variant, 'name', locale)}</div>}
                  {l.extras.length > 0 && <div className="meta">+ {l.extras.map((x) => loc(x, 'name', locale)).join('، ')}</div>}
                  <div className="meta num">{formatDA(lineUnitTotal(l), locale)}</div>
                </div>
                <button
                  type="button"
                  className="line-remove"
                  onClick={() => cart.remove(l.key)}
                  aria-label={`${t('cart.remove')}: ${name}`}
                  title={t('cart.remove')}
                  data-testid="line-remove"
                >
                  <TrashIcon />
                </button>
              </div>
              <div className="row" style={{ marginTop: 6 }}>
                <div className="qty">
                  <button
                    type="button"
                    onClick={() => cart.setQuantity(l.key, l.quantity - 1)}
                    aria-label={t('cart.decrease')}
                    data-testid="line-dec"
                  >
                    −
                  </button>
                  <span className="num" data-testid="line-qty">
                    {l.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => cart.setQuantity(l.key, l.quantity + 1)}
                    disabled={l.quantity >= MAX_QTY}
                    aria-label={t('cart.increase')}
                    data-testid="line-inc"
                  >
                    +
                  </button>
                </div>
                <div className="spacer" />
                <strong className="num" data-testid="line-total">
                  {formatDA(lineUnitTotal(l) * l.quantity, locale)}
                </strong>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}
