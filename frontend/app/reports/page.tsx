'use client';

import RoleGuard from '../components/RoleGuard';
import TimesheetView from '../components/TimesheetView';
import { useI18n } from '../i18n';

export default function ReportsPage() {
  const { t } = useI18n();

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['employee', 'manager', 'admin']} title={t('tsTitle')}>
        <TimesheetView heading={t('tsTitle')} intro={t('tsIntroManager')} />
      </RoleGuard>
    </main>
  );
}
