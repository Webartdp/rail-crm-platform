'use client';

import { use, useEffect, useState } from 'react';
import EmployeeForm from '../../../components/EmployeeForm';
import RoleGuard from '../../../components/RoleGuard';
import { useI18n } from '../../../i18n';
import { employeeProfileName, getEmployeeProfile, updateEmployeeProfile, type EmployeeProfile } from '../../../../lib/employee-profiles';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function EditEmployeePage({ params }: PageProps) {
  const { t } = useI18n();
  const resolvedParams = use(params);
  const id = Number(resolvedParams.id);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getEmployeeProfile(id)
      .then((response) => setProfile(response.data))
      .catch((loadError) => setError(t('commonLoadFailed', { error: loadError instanceof Error ? loadError.message : t('commonUnknownError') })));
  }, [id]);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['admin']} title={t('empEditTitle')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('empEyebrow')}</p>
            <h1>{profile ? employeeProfileName(profile) : t('empEditTitleId', { id })}</h1>
            <p className="hero-text">{t('empEditHero')}</p>
          </div>
          <a className="action-link" href="/employees">{t('empBackToList')}</a>
        </section>

        {error ? <p className="notice error" role="alert">{error}</p> : null}
        {!profile && !error ? <section className="panel"><p className="hint">{t('commonLoadingDots')}</p></section> : null}
        {profile ? (
          <EmployeeForm
            initial={profile}
            submitLabel={t('commonSave')}
            onSubmit={async (input) => {
              const response = await updateEmployeeProfile(id, input);
              const updated = (response as { data?: EmployeeProfile })?.data;
              if (updated) setProfile(updated);
            }}
          />
        ) : null}
      </RoleGuard>
    </main>
  );
}
