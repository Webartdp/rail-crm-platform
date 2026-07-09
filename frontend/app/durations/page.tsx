'use client';

import { useEffect, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { getWorkEventDurations, type WorkEventDuration } from '../../lib/durations';

export default function DurationsPage() {
  const [items, setItems] = useState<WorkEventDuration[]>([]);
  const [message, setMessage] = useState('Loading durations...');

  useEffect(() => {
    getWorkEventDurations()
      .then((response) => {
        setItems(response.data);
        setMessage(response.data.length === 0 ? 'No paired durations yet.' : '');
      })
      .catch(() => setMessage('API not available or manager/admin role missing.'));
  }, []);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title="Durations access">
        <section className="hero-card">
          <div>
            <p className="eyebrow">Durations</p>
            <h1>Work Durations</h1>
            <p className="hero-text">Calculated durations for Gasfahrt, Arbeit and Dienstfahrt.</p>
          </div>
          <div className="status-pill">API data</div>
        </section>

        <section className="panel">
          {message ? <p className="hint">{message}</p> : null}
          <div className="table-row"><strong>Type</strong><strong>Minutes</strong><strong>Events</strong></div>
          {items.map((item, index) => (
            <div className="table-row" key={`${item.type}-${index}`}>
              <span>{item.type}</span>
              <span>{item.duration_minutes}</span>
              <span>{item.start_event} - {item.stop_event}</span>
            </div>
          ))}
        </section>
      </RoleGuard>
    </main>
  );
}
