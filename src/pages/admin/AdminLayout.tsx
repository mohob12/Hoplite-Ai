import type { ReactNode } from 'react';
import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { supabase } from '../../lib/supabase';
import { OrdersFeedProvider, useOrdersFeed } from '../../lib/ordersFeed';
import Logo from '../../components/Logo';
import LanguageSelect from '../../components/LanguageSelect';
import { ConnectionIndicator, NotificationIndicator, NewOrderAlert } from '../../components/admin/StatusIndicators';

export function AdminGuard({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { t } = useI18n();
  if (auth.status === 'loading') return <div className="login-wrap muted">{t('common.loading')}</div>;
  if (auth.status !== 'admin') return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

export default function AdminLayout() {
  return (
    <AdminGuard>
      <OrdersFeedProvider>
        <Shell />
      </OrdersFeedProvider>
    </AdminGuard>
  );
}

function Shell() {
  const { t } = useI18n();
  const { counts } = useOrdersFeed();
  const links = [
    { to: '/admin', end: true, label: t('admin.nav.dashboard'), count: counts.new },
    { to: '/admin/orders', label: t('admin.nav.history') },
    { to: '/admin/menu', label: t('admin.nav.menu') },
    { to: '/admin/settings', label: t('admin.nav.settings') },
    { to: '/admin/reviews', label: t('admin.nav.reviews') },
    { to: '/admin/applications', label: t('admin.nav.applications') },
  ];

  return (
    <div className="admin">
      <aside className="admin-side">
        <Logo to="/admin" />
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
              {!!l.count && <span className="nav-count">{l.count}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="spacer" />
        <a href="/" target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">
          {t('admin.viewSite')}
        </a>
        <button className="btn btn-sm" onClick={() => supabase.auth.signOut()}>
          {t('admin.signOut')}
        </button>
      </aside>
      <div className="admin-main">
        <nav className="admin-mobile-nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
              {!!l.count && ` (${l.count})`}
            </NavLink>
          ))}
        </nav>
        <div className="admin-top">
          <ConnectionIndicator />
          <NotificationIndicator />
          <div className="spacer" />
          <LanguageSelect />
          <button className="btn btn-sm mobile-only" onClick={() => supabase.auth.signOut()}>
            {t('admin.signOut')}
          </button>
        </div>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
      <NewOrderAlert />
    </div>
  );
}
