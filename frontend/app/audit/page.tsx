'use client';

import { useEffect, useState } from 'react';

type AuditItem = {
  id: number;
  employee_id?: number;
  action: string;
  entity_type?: string;
  entity_id?: number;
  created_at: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function AuditPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [message, setMessage] = useState('Loading audit log...');

  useEffect(() => {
    fetch(`${API_URL}/audit`, { headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((response) => {
        setItems(response.data);
        setMessage(response.data.length === 0 ? 'No audit records yet.' : '');
      })
      .catch(() => setMessage('API not available.'));
  }, []);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Audit</p>
          <h1>Audit Log</h1>
          <p className="hero-text">Important employee workflow actions written to audit log.</p>
        </div>
        <div className="status-pill">API data</div>
      </section>

      <section className="panel">
        {message ? <p className="hint">{message}</p> : null}
        <div className="table-row"><strong>Time</strong><strong>Action</strong><strong>Entity</strong></div>
        {items.map((item) => (
          <div className="table-row" key={item.id}>
            <span>{item.created_at}</span>
            <span>{item.action}</span>
            <span>{item.entity_type} #{item.entity_id}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
