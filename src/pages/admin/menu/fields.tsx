import { useI18n } from '../../../lib/i18n';

type Lang = 'ar' | 'fr' | 'en';
const LANGS: Lang[] = ['ar', 'fr', 'en'];

interface TrioProps {
  label: string;
  base: 'name' | 'description';
  values: object;
  onChange: (key: string, value: string) => void;
  required?: boolean;
  multiline?: boolean;
  optional?: boolean;
}

/** Three inputs (AR/FR/EN) for `${base}_${lang}` columns. */
export function LocalizedTrio({ label, base, values, onChange, required, multiline, optional }: TrioProps) {
  const { t } = useI18n();
  return (
    <div className="am-form-grid">
      {LANGS.map((l) => {
        const key = `${base}_${l}`;
        const common = {
          value: String((values as Record<string, unknown>)[key] ?? ''),
          dir: l === 'ar' ? ('rtl' as const) : ('ltr' as const),
          required,
          onChange: (e: { target: { value: string } }) => onChange(key, e.target.value),
        };
        return (
          <label className="field" key={l}>
            <span>
              {label} · {t(`am.lang.${l}`)}
              {optional && <em className="hint"> ({t('common.optional')})</em>}
            </span>
            {multiline ? <textarea className="textarea" {...common} /> : <input className="input" {...common} />}
          </label>
        );
      })}
    </div>
  );
}

export function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="row" style={{ gap: 12 }}>
      <label className="switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
        <span />
      </label>
      <span style={{ fontWeight: 600 }}>{label}</span>
    </div>
  );
}
