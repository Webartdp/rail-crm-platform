'use client';

import { useEffect, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { getManagerDashboard, type ManagerDashboard } from '../../lib/manager-dashboard';

function card(label: string, value: number, href: string) {
  return <a className="panel stat-card" href={href}><p className="eyebrow">{label}</p><h1>{value}</h1></a>;
}

export default function ManagerDashboardPage() {
  const [data, setData] = useState<ManagerDashboard | null>(null);
  const [message, setMessage] = useState('Loading manager dashboard...');

  async function load() {
    try {
      const response = await getManagerDashboard();
      setData(response.data);
      setMessage(`Loaded for ${response.data.generated_for.name} (${response.data.generated_for.role}).`);
    } catch (error) {
      setMessage('Could not load manager dashboard. Manager/admin login required.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title="Manager dashboard access">
        <section className="hero-card">
          <div>
            <p className="eyebrow">Manager</p>
            <h1>Manager Dashboard</h1>
            <p className="hero-text">Operational overview for approvals, billing, signatures and open work orders.</p>
            <p className="hint">{message}</p>
          </div>
          <button className="action-button primary" onClick={load} type="button">Refresh</button>
        </section>

        {data ? (
          <>
            <section className="stats-grid">
              {card('Pending approvals', data.counts.pending_approvals, '/approvals')}
              {card('Approved not invoiced', data.counts.approved_uninvoiced, '/billing')}
              {card('Need signature', data.counts.documents_needing_signature, '/documents')}
              {card('Open work orders', data.counts.open_work_orders, '/assignments')}
            </section>

            <section className="grid lower-grid">
              <div className="panel">
                <h2>Pending approvals</h2>
                <div className="table-row"><strong>Pair</strong><strong>Employee</strong><strong>Status</strong></div>
                {data.pending_approvals.length === 0 ? <p className="hint">No pending approvals.</p> : null}
                {data.pending_approvals.map((item) => (
                  <div className="table-row" key={item.id}>
                    <span>{item.pair_type}<br /><small>Auftrag #{item.assignment_id}</small></span>
                    <span>#{item.employee_id}</span>
                    <span>{item.status}</span>
                  </div>
                ))}
                <a className="action-link" href="/approvals">Open approvals</a>
              </div>

              <div className="panel">
                <h2>Approved but not invoiced</h2>
                <div className="table-row"><strong>Pair</strong><strong>Employee</strong><strong>Status</strong></div>
                {data.approved_uninvoiced.length === 0 ? <p className="hint">No approved uninvoiced intervals.</p> : null}
                {data.approved_uninvoiced.map((item) => (
                  <div className="table-row" key={item.id}>
                    <span>{item.pair_type}<br /><small>Auftrag #{item.assignment_id}</small></span>
                    <span>#{item.employee_id}</span>
                    <span>{item.status}</span>
                  </div>
                ))}
                <a className="action-link" href="/billing">Create invoice draft</a>
              </div>
            </section>

            <section className="grid lower-grid">
              <div className="panel">
                <h2>Documents needing signature</h2>
                <div className="table-row"><strong>Document</strong><strong>Signer</strong><strong>Status</strong></div>
                {data.documents_needing_signature.length === 0 ? <p className="hint">No pending signatures.</p> : null}
                {data.documents_needing_signature.map((item) => (
                  <div className="table-row" key={item.signature_id}>
                    <span>{item.document_title}<br /><small>Document #{item.document_id}</small></span>
                    <span>{item.signer_name || '—'}<br /><small>{item.signer_email || '—'}</small></span>
                    <span>{item.status}<br /><a className="action-link" href={`/documents/${item.document_id}/print`}>Print</a></span>
                  </div>
                ))}
                <a className="action-link" href="/documents">Open documents</a>
              </div>

              <div className="panel">
                <h2>Open work orders</h2>
                <div className="table-row"><strong>Reference</strong><strong>Title</strong><strong>Status</strong></div>
                {data.open_work_orders.length === 0 ? <p className="hint">No open work orders.</p> : null}
                {data.open_work_orders.map((item) => (
                  <div className="table-row" key={item.id}>
                    <span>{item.reference_number || `#${item.id}`}</span>
                    <span>{item.title}</span>
                    <span>{item.status || 'planned'}</span>
                  </div>
                ))}
                <a className="action-link" href="/assignments">Open assignments</a>
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
