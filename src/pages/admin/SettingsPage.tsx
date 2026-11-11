import { useI18n } from '../../lib/i18n';
import { NotificationSettingsPanel } from '../../components/admin/StatusIndicators';
import RestaurantSettingsForm from './RestaurantSettingsForm';

export default function SettingsPage() {
  const { t } = useI18n();
  return (
    <>
      <h1>{t('admin.nav.settings')}</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, alignItems: 'start' }}>
        <NotificationSettingsPanel />
        <RestaurantSettingsForm />
      </div>
    </>
  );
}
