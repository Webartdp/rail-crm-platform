'use client';

import RoleGuard from '../components/RoleGuard';
import TimesheetView from '../components/TimesheetView';
import { useI18n } from '../i18n';

export default function MyTimePage() {
  const { t } = useI18n();

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['employee', 'manager', 'admin']} title={t('mtTitle')}>
        <TimesheetView heading={t('mtTitle')} intro={t('tsIntroEmployee')} />
      </RoleGuard>
    </main>
  );
}
