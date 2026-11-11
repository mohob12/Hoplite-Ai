import { useI18n } from '../lib/i18n';

/** Full-width 3:1 banner: graded storefront photo with the logo on the right side. */
export default function HeroBanner() {
  const { t } = useI18n();
  return (
    <section className="hero-banner" data-testid="hero-banner">
      <img
        className="hero-banner-photo"
        src="/brand/banner.jpg"
        srcSet="/brand/banner-768.jpg 768w, /brand/banner.jpg 1360w"
        sizes="100vw"
        alt=""
        fetchPriority="high"
      />
      <div className="hero-banner-brand">
        <img src="/brand/logo@banner.png" alt="Mac Kiffan" width={792} height={240} />
        <span className="hero-banner-tag">{t('app.tagline')}</span>
      </div>
    </section>
  );
}
