'use client';

import { useEffect, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { useI18n } from '../i18n';
import { apiRequest } from '../../lib/http';

type AuditItem = {
  id: number;
  user_id?: number | null;
  employee_id?: number | null;
  action: string;
  entity_type?: string | null;
  entity_id?: number | null;
  payload?: string | null;
  created_at: string;
};

export default function AuditPage() {
  const { t, fmt, has } = useI18n();
  const [items, setItems] = useState<AuditItem[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ data: AuditItem[] }>('/audit')
      .then((response) => {
        setItems(response.data);
        setMessage(response.data.length === 0 ? t('auditNone') : '');
      })
      .catch((error) => setMessage(t('commonLoadFailed', { error: error instanceof Error ? error.message : t('commonUnknownError') })))
      .finally(() => setLoading(false));
  }, []);

  const actionLabel = (action: string) => (has(`audit_${action}`) ? t(`audit_${action}`) : action);
  const entityLabel = (type?: string | null) => (type && has(`auditEntity_${type}`) ? t(`auditEntity_${type}`) : type || '—');

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title={t('auditTitle')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('auditEyebrow')}</p>
            <h1>{t('auditTitle')}</h1>
            <p className="hero-text">{t('auditHero')}</p>
          </div>
        </section>

        <section className="panel">
          {loading ? <p className="hint">{t('commonLoadingDots')}</p> : null}
          {message ? <p className="hint">{message}</p> : null}
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('commonTime')}</th>
                  <th>{t('auditAction')}</th>
                  <th>{t('auditEntity')}</th>
                  <th>{t('auditUser')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{fmt.dateTime(item.created_at)}</td>
                    <td>{actionLabel(item.action)}</td>
                    <td>{entityLabel(item.entity_type)}{item.entity_id ? ` #${item.entity_id}` : ''}</td>
                    <td>{item.user_id ? `#${item.user_id}` : item.employee_id ? t('commonEmployeeNumber', { id: item.employee_id }) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </RoleGuard>
    </main>
  );
}
