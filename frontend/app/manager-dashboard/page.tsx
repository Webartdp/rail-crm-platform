'use client';

import { useEffect, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { getManagerDashboard, type ManagerDashboard } from '../../lib/manager-dashboard';

function card(label: string, value: number, href: string) {
  return <a className="panel stat-card" href={href}><p className="eyebrow">{label}</p><h1>{value}</h1></a>;
}

export default function ManagerDashboardPage() {
  const [data, setData] = useState<ManagerDashboard | null>(null);
  const [message, setMessage] = useState('Загружаем панель менеджера...');

  async function load() {
    try {
      const response = await getManagerDashboard();
      setData(response.data);
      setMessage(`Загружено для ${response.data.generated_for.name} (${response.data.generated_for.role}).`);
    } catch (error) {
      setMessage('Не удалось загрузить панель менеджера. Нужен вход под manager или admin.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title="Доступ к панели менеджера">
        <section className="hero-card">
          <div>
            <p className="eyebrow">Менеджер</p>
            <h1>Панель менеджера</h1>
            <p className="hero-text">Обзор согласований, счетов, подписей и открытых заданий.</p>
            <p className="hint">{message}</p>
          </div>
          <button className="action-button primary" onClick={load} type="button">Обновить</button>
        </section>

        {data ? (
          <>
            <section className="stats-grid">
              {card('Ожидают согласования', data.counts.pending_approvals, '/approvals')}
              {card('Согласовано, но не выставлено', data.counts.approved_uninvoiced, '/billing')}
              {card('Нужна подпись', data.counts.documents_needing_signature, '/documents')}
              {card('Открытые задания', data.counts.open_work_orders, '/assignments')}
            </section>

            <section className="grid lower-grid">
              <div className="panel">
                <h2>Ожидают согласования</h2>
                <div className="table-row"><strong>Пара событий</strong><strong>Сотрудник</strong><strong>Статус</strong></div>
                {data.pending_approvals.length === 0 ? <p className="hint">Нет ожидающих согласований.</p> : null}
                {data.pending_approvals.map((item) => (
                  <div className="table-row" key={item.id}>
                    <span>{item.pair_type}<br /><small>Задание #{item.assignment_id}</small></span>
                    <span>#{item.employee_id}</span>
                    <span>{item.status}</span>
                  </div>
                ))}
                <a className="action-link" href="/approvals">Открыть согласование</a>
              </div>

              <div className="panel">
                <h2>Согласовано, но ещё не выставлено в счёт</h2>
                <div className="table-row"><strong>Пара событий</strong><strong>Сотрудник</strong><strong>Статус</strong></div>
                {data.approved_uninvoiced.length === 0 ? <p className="hint">Нет согласованных интервалов без счёта.</p> : null}
                {data.approved_uninvoiced.map((item) => (
                  <div className="table-row" key={item.id}>
                    <span>{item.pair_type}<br /><small>Задание #{item.assignment_id}</small></span>
                    <span>#{item.employee_id}</span>
                    <span>{item.status}</span>
                  </div>
                ))}
                <a className="action-link" href="/billing">Создать черновик счёта</a>
              </div>
            </section>

            <section className="grid lower-grid">
              <div className="panel">
                <h2>Документы, где нужна подпись</h2>
                <div className="table-row"><strong>Документ</strong><strong>Подписант</strong><strong>Статус</strong></div>
                {data.documents_needing_signature.length === 0 ? <p className="hint">Нет ожидающих подписей.</p> : null}
                {data.documents_needing_signature.map((item) => (
                  <div className="table-row" key={item.signature_id}>
                    <span>{item.document_title}<br /><small>Документ #{item.document_id}</small></span>
                    <span>{item.signer_name || '—'}<br /><small>{item.signer_email || '—'}</small></span>
                    <span>{item.status}<br /><a className="action-link" href={`/documents/${item.document_id}/print`}>Печать</a></span>
                  </div>
                ))}
                <a className="action-link" href="/documents">Открыть документы</a>
              </div>

              <div className="panel">
                <h2>Открытые задания</h2>
                <div className="table-row"><strong>Референс</strong><strong>Название</strong><strong>Статус</strong></div>
                {data.open_work_orders.length === 0 ? <p className="hint">Нет открытых заданий.</p> : null}
                {data.open_work_orders.map((item) => (
                  <div className="table-row" key={item.id}>
                    <span>{item.reference_number || `#${item.id}`}</span>
                    <span>{item.title}</span>
                    <span>{item.status || 'planned'}</span>
                  </div>
                ))}
                <a className="action-link" href="/assignments">Открыть задания</a>
              </div>
            </section>
          </>
        ) : (
          <section className="panel"><p className="hint">{message}</p></section>
        )}
      </RoleGuard>
    </main>
  );
}
