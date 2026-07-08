'use client';

import { useEffect, useState } from 'react';
import { closeWorkOrder, getWorkOrders, type WorkOrder } from '../../lib/work-orders';

const fallback = [
  { id: 1, reference_number: 'REF-2026-001', title: 'WTU / ICE 204 / Gleis 12', status: 'planned' },
  { id: 2, reference_number: 'REF-2026-002', title: 'WSU / RE 88 / Bahnhof Nord', status: 'in_progress' },
  { id: 3, reference_number: 'REF-2026-003', title: 'RID-Kontrolle / Cargo 17 / Depot West', status: 'waiting_approval' },
];

export default function AssignmentsPage() {
  const [items, setItems] = useState<WorkOrder[]>(fallback);
  const [message, setMessage] = useState('Demo fallback data.');

  async function load() {
    try {
      const response = await getWorkOrders();
      setItems(response.data.length ? response.data : fallback);
      setMessage(response.data.length ? 'Loaded from API.' : 'No API work orders yet. Showing demo fallback.');
    } catch (error) {
      setMessage('API not available. Showing demo fallback.');
    }
  }

  async function closeOrder(item: WorkOrder) {
    try {
      await closeWorkOrder(item.id, 'assignments_page');
      setMessage(`Auftrag ${item.reference_number || item.id} closed.`);
      await load();
    } catch (error) {
      setMessage('Could not close work order. Manager/admin token required.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Assignments</p>
          <h1>Assignments</h1>
          <p className="hero-text">Planned work orders with Referenznummer, planned time and status.</p>
        </div>
        <a className="action-link" href="/work-orders/new">Neuer Auftrag</a>
      </section>

      <section className="panel">
        <p className="hint">{message}</p>
        <div className="table-row"><strong>Reference</strong><strong>Work order</strong><strong>Status</strong></div>
        {items.map((item) => (
          <div className="table-row" key={item.id}>
            <span>{item.reference_number || `#${item.id}`}</span>
            <span>{item.title}</span>
            <span>{item.status || 'planned'} {item.status !== 'closed' ? <button className="action-link" onClick={() => closeOrder(item)} type="button">Close</button> : null}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
