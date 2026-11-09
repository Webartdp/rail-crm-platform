'use client';

import { useEffect, useState } from 'react';
import RoleGuard from '../../components/RoleGuard';
import WorkOrderForm from '../../components/WorkOrderForm';
import { useI18n } from '../../i18n';
import { createWorkOrder } from '../../../lib/work-orders';

export default function NewWorkOrderPage() {
  const { t } = useI18n();
  const [preset, setPreset] = useState<{ clientId?: number; objectId?: number; date?: string; employeeId?: number } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPreset({
      clientId: Number(params.get('client')) || undefined,
      objectId: Number(params.get('object')) || undefined,
      date: /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') || undefined : undefined,
      employeeId: Number(params.get('employee')) || undefined,
    });
  }, []);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title={t('woNewTitle')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('woNewEyebrow')}</p>
            <h1>{t('woNewTitle')}</h1>
            <p className="hero-text">{t('woNewHero')}</p>
          </div>
          <a className="action-button secondary" href="/assignments">{t('woBackToAssignments')}</a>
        </section>

        {preset ? (
          <WorkOrderForm
            preset={preset}
            submitLabel={t('woSaveAssignment')}
            onSubmit={async (input) => {
              const response = await createWorkOrder(input);
              window.location.href = `/work-orders/${response.data.id}`;
            }}
          />
        ) : null}
      </RoleGuard>
    </main>
  );
}
