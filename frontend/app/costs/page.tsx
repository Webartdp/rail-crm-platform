'use client';

import { useEffect, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { useI18n } from '../i18n';
import { getWorkEventCosts, type WorkEventCost } from '../../lib/costs';

export default function CostsPage() {
  const { t, fmt } = useI18n();
  const [items, setItems] = useState<WorkEventCost[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkEventCosts()
      .then((response) => {
        setItems(response.data);
        setMessage(response.data.length === 0 ? t('billNoItems') : '');
      })
      .catch((error) => setMessage(t('commonLoadFailed', { error: error instanceof Error ? error.message : t('commonUnknownError') })))
      .finally(() => setLoading(false));
  }, []);

  const total = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title={t('costsTitle')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('billEyebrow')}</p>
            <h1>{t('costsTitle')}</h1>
            <p className="hero-text">{t('costsHero')}</p>
          </div>
          <div className="status-pill">{t('commonTotal')}: {fmt.money(total)}</div>
        </section>

        <section className="panel">
          {loading ? <p className="hint">{t('commonLoadingDots')}</p> : null}
          {message ? <p className="hint">{message}</p> : null}
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('commonType')}</th>
                  <th>{t('commonEmployee')}</th>
                  <th>{t('commonAssignment')}</th>
                  <th className="num">{t('billHours')}</th>
                  <th className="num">{t('billRate')}</th>
                  <th className="num">{t('billCoefficient')}</th>
                  <th className="num">{t('billAmount')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={`${item.type}-${item.employee_id}-${item.assignment_id}-${index}`}>
                    <td>{t(`costType_${item.type}`)}</td>
                    <td>{t('commonEmployeeNumber', { id: item.employee_id })}</td>
                    <td>{t('commonAssignmentNumber', { id: item.assignment_id })}</td>
                    <td className="num">{fmt.number(item.hours, 2)}</td>
                    <td className="num">{fmt.money(item.hourly_rate)}</td>
                    <td className="num">×{fmt.number(item.coefficient, 2)}</td>
                    <td className="num"><strong>{fmt.money(item.amount)}</strong></td>
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
