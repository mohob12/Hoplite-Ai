import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import Logo from '../../components/Logo';
import LanguageSelect from '../../components/LanguageSelect';

export default function AdminLogin() {
  const { t } = useI18n();
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (auth.status === 'admin') return <Navigate to="/admin" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(t('admin.badLogin'));
    else navigate('/admin', { replace: true });
  }

  return (
    <div className="login-wrap">
      <form className="card card-pad login-card stack" onSubmit={submit}>
        <div className="row">
          <Logo />
          <div className="spacer" />
          <LanguageSelect />
        </div>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{t('admin.login')}</h1>
        {auth.status === 'not_admin' && <div className="alert alert-error">{t('admin.notAdmin')}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <label className="field">
          <span>{t('admin.email')}</span>
          <input
            className="input"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            name="email"
          />
        </label>
        <label className="field">
          <span>{t('admin.password')}</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            name="password"
          />
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? t('common.loading') : t('admin.signIn')}
        </button>
      </form>
    </div>
  );
}
