import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/i18n';

export default function CareersPage() {
  const { t } = useI18n();
  const [f, setF] = useState({ full_name: '', phone: '', email: '', position: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setStatus('sending');
    const { error } = await supabase.from('employment_applications').insert({
      full_name: f.full_name.trim(),
      phone: f.phone.trim(),
      email: f.email.trim() || null,
      position: f.position.trim(),
      message: f.message.trim(),
    });
    setStatus(error ? 'error' : 'done');
  }

  return (
    <div className="page page-narrow stack" style={{ gap: 16 }}>
      <h1>{t('job.title')}</h1>
      <p className="muted">{t('job.intro')}</p>
      <form className="card card-pad stack" onSubmit={submit}>
        {status === 'done' ? (
          <div className="alert alert-info">{t('job.thanks')}</div>
        ) : (
          <>
            <label className="field">
              <span>{t('job.fullName')}</span>
              <input className="input" required minLength={2} maxLength={100} value={f.full_name} onChange={set('full_name')} />
            </label>
            <label className="field">
              <span>{t('job.phone')}</span>
              <input className="input" dir="ltr" style={{ textAlign: 'start' }} type="tel" required minLength={6} maxLength={20} value={f.phone} onChange={set('phone')} />
            </label>
            <label className="field">
              <span>
                {t('job.email')} <span className="hint">({t('common.optional')})</span>
              </span>
              <input className="input" dir="ltr" style={{ textAlign: 'start' }} type="email" maxLength={200} value={f.email} onChange={set('email')} />
            </label>
            <label className="field">
              <span>{t('job.position')}</span>
              <input className="input" required minLength={2} maxLength={100} value={f.position} onChange={set('position')} />
            </label>
            <label className="field">
              <span>{t('job.message')}</span>
              <textarea className="textarea" maxLength={2000} value={f.message} onChange={set('message')} />
            </label>
            {status === 'error' && <div className="alert alert-error">{t('common.error')}</div>}
            <button className="btn btn-primary" disabled={status === 'sending'}>
              {status === 'sending' ? t('common.saving') : t('job.submit')}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
