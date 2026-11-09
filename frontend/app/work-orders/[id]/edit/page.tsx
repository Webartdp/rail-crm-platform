'use client';

import { use, useEffect, useState } from 'react';
import RoleGuard from '../../../components/RoleGuard';
import WorkOrderForm from '../../../components/WorkOrderForm';
import { useI18n } from '../../../i18n';
import { getWorkOrder, updateWorkOrder, type WorkOrder } from '../../../../lib/work-orders';

type PageProps = { params: Promise<{ id: string }> };

export default function EditWorkOrderPage({ params }: PageProps) {
  const { t } = useI18n();
  const id = Number(use(params).id);
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getWorkOrder(id)
      .then((response) => setOrder(response.data))
      .catch((loadError) => setError(t('commonLoadFailed', { error: loadError instanceof Error ? loadError.message : t('commonUnknownError') })));
  }, [id]);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title={t('woEditTitle', { id })}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('woEditEyebrow')}</p>
            <h1>{t('woEditTitle', { id })}</h1>
            <p className="hero-text">{t('woEditHero')}</p>
          </div>
          <a className="action-button secondary" href={`/work-orders/${id}`}>{t('commonBack')}</a>
        </section>

        {error ? <p className="notice error" role="alert">{error}</p> : null}
        {!order && !error ? <section className="panel"><p className="hint">{t('commonLoadingDots')}</p></section> : null}
        {order ? (
          <WorkOrderForm
            initial={order}
            submitLabel={t('woSaveChanges')}
            onSubmit={async (input) => {
              await updateWorkOrder(id, input);
              window.location.href = `/work-orders/${id}`;
            }}
          />
        ) : null}
      </RoleGuard>
    </main>
  );
}
