import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { LOCALES, useI18n } from '../lib/i18n';
import type { Locale } from '../lib/types';

const BADGE: Record<Locale, string> = { ar: 'ع', fr: 'Fr', en: 'En' };

export default function LanguageSelect({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const current = LOCALES.find((l) => l.code === locale)!;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    // Focus the active language so arrow keys start from it.
    itemRefs.current[LOCALES.findIndex((l) => l.code === locale)]?.focus();
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, locale]);

  const choose = (code: Locale) => {
    setLocale(code);
    setOpen(false);
    btnRef.current?.focus();
  };

  const onMenuKey = (e: KeyboardEvent) => {
    const i = itemRefs.current.findIndex((el) => el === document.activeElement);
    if (e.key === 'Escape') {
      setOpen(false);
      btnRef.current?.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = LOCALES.length;
      itemRefs.current[(i + (e.key === 'ArrowDown' ? 1 : n - 1)) % n]?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div className={`lang ${open ? 'open' : ''} ${compact ? 'compact' : ''}`} ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="lang-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Language / Langue / اللغة: ${current.label}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        data-testid="lang-select"
      >
        <GlobeIcon />
        <span className="lang-current">{current.label}</span>
        <span className="lang-code" aria-hidden="true">
          {locale.toUpperCase()}
        </span>
        <svg className="lang-chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="lang-menu" id={menuId} role="listbox" aria-label="Language" onKeyDown={onMenuKey}>
          {LOCALES.map((l, i) => {
            const active = l.code === locale;
            return (
              <button
                key={l.code}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="option"
                aria-selected={active}
                lang={l.code}
                dir={l.code === 'ar' ? 'rtl' : 'ltr'}
                className={`lang-item ${active ? 'active' : ''}`}
                onClick={() => choose(l.code)}
                data-testid={`lang-${l.code}`}
              >
                <span className={`lang-badge ${l.code === 'ar' ? 'ar' : ''}`}>{BADGE[l.code]}</span>
                <span className="lang-name">{l.label}</span>
                {active && (
                  <svg className="lang-check" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg className="lang-globe" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" strokeLinejoin="round" />
    </svg>
  );
}
