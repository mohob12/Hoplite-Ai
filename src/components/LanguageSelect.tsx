import { LOCALES, useI18n } from '../lib/i18n';
import type { Locale } from '../lib/types';

export default function LanguageSelect({ className = 'lang-select' }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <select
      className={className}
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      aria-label="Language / Langue / اللغة"
      data-testid="lang-select"
    >
      {LOCALES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
