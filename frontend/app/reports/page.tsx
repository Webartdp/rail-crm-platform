'use client';

import { useI18n } from '../i18n';

export default function ReportsPage() {
  const { t } = useI18n();

  return (
    <main className="page-shell">
      <section className="panel" style={{ padding: '1.25rem' }}>
        <p className="eyebrow">{t('reports')}</p>
        <h1 style={{ margin: '0.2rem 0 0.5rem' }}>{t('reportsTitle')}</h1>
        <p style={{ color: '#64748b', maxWidth: 680 }}>
          {t('reportsEmpty')}
        </p>
      </section>
    </main>
  );
}
