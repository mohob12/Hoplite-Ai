import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { formatDateTime } from '../../lib/format';
import { amError } from './menu/shared';
import './admin-manage.css';

type AppStatus = 'new' | 'reviewed' | 'archived';
const STATUSES: AppStatus[] = ['new', 'reviewed', 'archived'];

interface Application {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  position: string;
  message: string;
  status: AppStatus;
  created_at: string;
}

const badgeClass: Record<AppStatus, string> = {
  new: 'badge-yellow',
  reviewed: 'badge-dark',
  archived: 'badge-muted',
};

export default function ApplicationsAdmin() {
  const { t, locale } = useI18n();
  const [apps, setApps] = useState<Application[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | AppStatus>('all');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('employment_applications')
      .select('*')
      .order('created_at', { ascending: false });
    if (err) setError(amError(err, t));
    else {
      setError('');
      setApps(data as Application[]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => (apps ?? []).filter((a) => filter === 'all' || a.status === filter), [apps, filter]);
  const newCount = (apps ?? []).filter((a) => a.status === 'new').length;

  async function setStatus(a: Application, status: AppStatus) {
    setBusyId(a.id);
    const { error: err } = await supabase.from('employment_applications').update({ status }).eq('id', a.id);
    if (err) setError(amError(err, t));
    else await load();
    setBusyId(null);
  }

  async function remove(a: Application) {
    if (!window.confirm(t('am.app.confirmDelete', { name: a.full_name }))) return;
    setBusyId(a.id);
    const { error: err } = await supabase.from('employment_applications').delete().eq('id', a.id);
    if (err) setError(amError(err, t));
    else await load();
    setBusyId(null);
  }

  const toggleOpen = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="am-page">
      <div className="am-head">
        <h1>{t('am.app.title')}</h1>
        {newCount > 0 && <span className="badge badge-yellow">{t('am.app.newCount', { n: newCount })}</span>}
      </div>

      <div className="am-seg">
        {(['all', ...STATUSES] as const).map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-dark' : ''}`}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? t('common.all') : t(`am.app.status.${f}`)}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!apps && !error && <div className="muted">{t('common.loading')}</div>}
      {apps && shown.length === 0 && <div className="panel muted">{t('am.app.empty')}</div>}

      <div className="am-list">
        {shown.map((a) => {
          const expanded = open.has(a.id);
          return (
            <article className="panel am-item" key={a.id}>
              <div className="am-item-head">
                <strong>{a.full_name}</strong>
                <span className="badge">{a.position}</span>
                <span className={`badge ${badgeClass[a.status]}`}>{t(`am.app.status.${a.status}`)}</span>
                <span className="spacer" />
                <span className="muted small">{formatDateTime(a.created_at, locale)}</span>
              </div>
              <div className="am-meta">
                <a className="num" href={`tel:${a.phone.replace(/\s+/g, '')}`}>
                  {a.phone}
                </a>
                {a.email && <a href={`mailto:${a.email}`}>{a.email}</a>}
              </div>
              {a.message ? (
                <div>
                  <p className={`am-comment ${expanded ? '' : 'am-clamp'}`}>{a.message}</p>
                  {(a.message.length > 140 || a.message.includes('\n')) && (
                    <button className="btn btn-sm btn-ghost" onClick={() => toggleOpen(a.id)} aria-expanded={expanded}>
                      {expanded ? t('am.app.less') : t('am.app.more')}
                    </button>
                  )}
                </div>
              ) : (
                <p className="muted">{t('am.app.noMessage')}</p>
              )}
              <div className="row wrap">
                <label className="row small" style={{ gap: 8 }}>
                  <span className="muted">{t('am.app.setStatus')}</span>
                  <select
                    className="select"
                    style={{ width: 'auto', minHeight: 36 }}
                    value={a.status}
                    disabled={busyId === a.id}
                    onChange={(e) => setStatus(a, e.target.value as AppStatus)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(`am.app.status.${s}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="btn btn-sm btn-outline-red" disabled={busyId === a.id} onClick={() => remove(a)}>
                  {t('am.delete')}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
