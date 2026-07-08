'use client';

import { useEffect, useState } from 'react';
import { getWorkEventCosts, type WorkEventCost } from '../../lib/costs';

export default function CostsPage() {
  const [items, setItems] = useState<WorkEventCost[]>([]);
  const [message, setMessage] = useState('Loading costs...');

  useEffect(() => {
    getWorkEventCosts()
      .then((response) => {
        setItems(response.data);
        setMessage(response.data.length === 0 ? 'No completed event pairs yet.' : 'Loaded from API.');
      })
      .catch(() => setMessage('API not available.'));
  }, []);

  const total = items.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Costs</p>
          <h1>Work Event Costs</h1>
          <p className="hero-text">Calculated from work and travel duration with employee tariff settings.</p>
        </div>
        <div className="status-pill">Total {total.toFixed(2)}</div>
      </section>

      <section className="panel">
        <p className="hint">{message}</p>
        <div className="table-row"><strong>Type</strong><strong>Hours</strong><strong>Amount</strong></div>
        {items.map((item, index) => (
          <div className="table-row" key={`${item.type}-${item.employee_id}-${item.assignment_id}-${index}`}>
            <span>{item.type} / employee #{item.employee_id} / Auftrag #{item.assignment_id}</span>
            <span>{item.hours} h × {item.hourly_rate} × {item.coefficient}</span>
            <span>{item.amount}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
