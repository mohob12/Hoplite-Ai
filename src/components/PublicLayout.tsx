import { NavLink, Outlet } from 'react-router-dom';
import Logo from './Logo';
import LanguageSelect from './LanguageSelect';
import CartDrawer from './CartDrawer';
import SocialLinks from './SocialLinks';
import { useI18n } from '../lib/i18n';
import { useCart } from '../lib/cart';
import { useSettings } from '../lib/settings';
import { loc } from '../lib/format';

export default function PublicLayout() {
  const { t, locale } = useI18n();
  const { count, setOpen } = useCart();
  const settings = useSettings();

  return (
    <>
      <header className="site-header">
        <div className="container">
          <Logo />
          <nav className="site-nav">
            <NavLink to="/" end>
              {t('nav.menu')}
            </NavLink>
            <NavLink to="/reviews">{t('nav.reviews')}</NavLink>
            <NavLink to="/careers">{t('nav.careers')}</NavLink>
          </nav>
          <div className="spacer" />
          <LanguageSelect />
          <button
            className="btn btn-primary cart-btn"
            onClick={() => setOpen(true)}
            aria-label={t('nav.cart')}
            data-testid="open-cart"
          >
            <CartIcon />
            <span className="hide-sm">{t('nav.cart')}</span>
            {count > 0 && (
              <span className="cart-count" data-testid="cart-count">
                {count}
              </span>
            )}
          </button>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="site-footer" data-testid="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand stack">
            <Logo />
            <p className="footer-tagline">{t('app.tagline')}</p>
            <nav className="row wrap small mobile-only footer-nav">
              <NavLink to="/reviews">{t('nav.reviews')}</NavLink>
              <NavLink to="/careers">{t('nav.careers')}</NavLink>
            </nav>
          </div>
          {settings && (
            <>
              <div>
                <h4>{t('footer.address')}</h4>
                <p>{loc(settings, 'address', locale)}</p>
              </div>
              <div>
                <h4>{t('footer.hours')}</h4>
                <p>{loc(settings, 'opening_hours', locale)}</p>
              </div>
              <div>
                <h4>{t('footer.phone')}</h4>
                <a href={`tel:${settings.phone.replace(/\s/g, '')}`} className="num footer-phone">
                  {settings.phone}
                </a>
              </div>
              {(settings.facebook_url || settings.instagram_url || settings.tiktok_url) && (
                <div>
                  <h4>{t('footer.follow')}</h4>
                  <SocialLinks
                    links={{
                      facebook: settings.facebook_url,
                      instagram: settings.instagram_url,
                      tiktok: settings.tiktok_url,
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </footer>

      <CartDrawer />
    </>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="20" r="1.4" fill="currentColor" />
      <circle cx="17" cy="20" r="1.4" fill="currentColor" />
    </svg>
  );
}
