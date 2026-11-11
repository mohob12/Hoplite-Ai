import { useI18n } from '../lib/i18n';
import credits from '../data/photoCredits.json';

interface Credit {
  product: string;
  url: string;
  title: string;
  creator: string;
  license: string;
  license_url: string;
  source: string;
}

export default function CreditsPage() {
  const { t } = useI18n();
  return (
    <div className="page page-narrow stack" style={{ gap: 16 }}>
      <h1>{t('credits.title')}</h1>
      <p className="muted">{t('credits.intro')}</p>
      <ul className="credits" data-testid="credits-list">
        {(credits as Credit[]).map((c) => (
          <li key={c.url} className="card credit">
            <img src={c.url} alt="" loading="lazy" />
            <div className="small" dir="ltr">
              <strong>{c.product}</strong>
              <div>
                <a href={c.source} target="_blank" rel="noreferrer">
                  {c.title}
                </a>
              </div>
              <div className="muted">
                © {c.creator} —{' '}
                {c.license_url ? (
                  <a href={c.license_url} target="_blank" rel="noreferrer">
                    {c.license}
                  </a>
                ) : (
                  c.license
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="muted small">{t('credits.other')}</p>
    </div>
  );
}
