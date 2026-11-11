import { lazy, Suspense, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import PublicLayout from './components/PublicLayout';
import MenuPage from './pages/MenuPage';
import OrderPage from './pages/OrderPage';
import ReviewsPage from './pages/ReviewsPage';
import CareersPage from './pages/CareersPage';

// Admin code is split out so customers only download the storefront.
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminGuard = lazy(() => import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminGuard })));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const OrderHistory = lazy(() => import('./pages/admin/OrderHistory'));
const OrderDetail = lazy(() => import('./pages/admin/OrderDetail'));
const Receipt = lazy(() => import('./pages/admin/Receipt'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));
const MenuAdmin = lazy(() => import('./pages/admin/MenuAdmin'));
const ReviewsAdmin = lazy(() => import('./pages/admin/ReviewsAdmin'));
const ApplicationsAdmin = lazy(() => import('./pages/admin/ApplicationsAdmin'));

const L = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<div className="login-wrap muted">…</div>}>{children}</Suspense>
);

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<MenuPage />} />
        <Route path="order/:reference" element={<OrderPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="careers" element={<CareersPage />} />
      </Route>
      <Route path="admin/login" element={<L><AdminLogin /></L>} />
      <Route
        path="admin/orders/:id/print"
        element={
          <L>
            <AdminGuard>
              <Receipt />
            </AdminGuard>
          </L>
        }
      />
      <Route path="admin" element={<L><AdminLayout /></L>}>
        <Route index element={<L><Dashboard /></L>} />
        <Route path="orders" element={<L><OrderHistory /></L>} />
        <Route path="orders/:id" element={<L><OrderDetail /></L>} />
        <Route path="menu" element={<L><MenuAdmin /></L>} />
        <Route path="settings" element={<L><SettingsPage /></L>} />
        <Route path="reviews" element={<L><ReviewsAdmin /></L>} />
        <Route path="applications" element={<L><ApplicationsAdmin /></L>} />
      </Route>
      <Route path="*" element={<PublicLayout />}>
        <Route path="*" element={<MenuPage />} />
      </Route>
    </Routes>
  );
}
