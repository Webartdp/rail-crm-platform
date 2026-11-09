'use client';

import EmployeeForm from '../../components/EmployeeForm';
import RoleGuard from '../../components/RoleGuard';
import { useI18n } from '../../i18n';
import { createEmployeeProfile } from '../../../lib/employee-profiles';

export default function NewEmployeePage() {
  const { t } = useI18n();

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['admin']} title={t('empNewTitle')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('empEyebrow')}</p>
            <h1>{t('empNewTitle')}</h1>
            <p className="hero-text">{t('empNewHero')}</p>
          </div>
          <a className="action-link" href="/employees">{t('empBackToList')}</a>
        </section>

        <EmployeeForm
          submitLabel={t('empCreate')}
          onSubmit={async (input) => {
            const response = await createEmployeeProfile(input);
            const id = (response as { data?: { id?: number } })?.data?.id;
            if (id) window.location.href = `/employees/${id}/edit`;
          }}
        />
      </RoleGuard>
    </main>
  );
}
