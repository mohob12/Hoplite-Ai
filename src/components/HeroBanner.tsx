import { useI18n } from '../lib/i18n';
import { useSettings } from '../lib/settings';
import { openStatus, useNow } from '../lib/openStatus';

/** Full-width 3:1 banner: graded storefront photo with the logo on the right side. */
export default function HeroBanner() {
  const { t } = useI18n();
  const settings = useSettings();
  const now = useNow();
  const status = settings ? openStatus(settings, now) : null;

  const timeLabel = (min: number) => {
    if (min === 0) return t('status.midnight');
    const h = Math.floor(min / 60);
    const m = String(min % 60).padStart(2, '0');
    return t('status.time', { h: String(h).padStart(2, '0'), m });
  };

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
        {status && (
          <span
            className={`open-status ${status.open ? 'is-open' : 'is-closed'}`}
            data-testid="open-status"
            data-open={status.open}
            role="status"
          >
            <span className="open-dot" aria-hidden="true" />
            <span>
              {status.open ? t('status.openNow') : t('status.closedNow')}
              <span className="open-sep" aria-hidden="true">
                {' · '}
              </span>
              {t(status.open ? 'status.closesAt' : 'status.opensAt', { time: timeLabel(status.next) })}
            </span>
          </span>
        )}
      </div>
    </section>
  );
}
