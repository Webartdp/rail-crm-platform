'use client';

import { useEffect, useState } from 'react';
import { getWorkOrders, type WorkOrder } from '../../lib/work-orders';

const fallback = [
  { id: 1, reference_number: 'REF-2026-001', title: 'WTU / ICE 204 / Gleis 12', status: 'Planned' },
  { id: 2, reference_number: 'REF-2026-002', title: 'WSU / RE 88 / Bahnhof Nord', status: 'In progress' },
  { id: 3, reference_number: 'REF-2026-003', title: 'RID-Kontrolle / Cargo 17 / Depot West', status: 'Waiting' },
];

export default function AssignmentsPage() {
  const [items, setItems] = useState<WorkOrder[]>(fallback);
  const [message, setMessage] = useState('Demo fallback data.');

  useEffect(() => {
    getWorkOrders()
      .then((response) => {
        setItems(response.data.length ? response.data : fallback);
        setMessage(response.data.length ? 'Loaded from API.' : 'No API work orders yet. Showing demo fallback.');
      })
      .catch(() => setMessage('API not available. Showing demo fallback.'));
  }, []);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Assignments</p>
          <h1>Assignments</h1>
          <p className="hero-text">Planned work orders with Referenznummer, planned time and status.</p>
        </div>
        <div className="status-pill">Work Orders</div>
      </section>

      <section className="panel">
        <p className="hint">{message}</p>
        <div className="table-row"><strong>Reference</strong><strong>Work order</strong><strong>Status</strong></div>
        {items.map((item) => (
          <div className="table-row" key={item.id}>
            <span>{item.reference_number || `#${item.id}`}</span>
            <span>{item.title}</span>
            <span>{item.status || 'planned'}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
