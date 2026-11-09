'use client';

import RoleGuard from '../components/RoleGuard';
import MailSettingsForm from '../components/MailSettingsForm';
import { useI18n } from '../i18n';

export default function MailSettingsPage() {
  const { t } = useI18n();

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['admin']} title={t('mailSettings')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('groupSettings')}</p>
            <h1>{t('mailSettings')}</h1>
            <p className="hero-text">{t('mailSettingsHero')}</p>
          </div>
        </section>
        <MailSettingsForm />
      </RoleGuard>
    </main>
  );
}
