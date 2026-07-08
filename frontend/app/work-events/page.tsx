'use client';

import { useEffect, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { getWorkEvents, type WorkEvent } from '../../lib/api';

export default function WorkEventsPage() {
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [message, setMessage] = useState('Loading events...');

  useEffect(() => {
    getWorkEvents()
      .then((response) => {
        setEvents(response.data);
        setMessage(response.data.length === 0 ? 'No events stored yet.' : '');
      })
      .catch(() => setMessage('API not available or events table is empty.'));
  }, []);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title="Work events access">
        <section className="hero-card">
          <div>
            <p className="eyebrow">Work Events</p>
            <h1>Work Events</h1>
            <p className="hero-text">Stored employee button actions from Gasfahrt, Dienstbeginn, Stop and Dienstfahrt.</p>
          </div>
          <div className="status-pill">API data</div>
        </section>

        <section className="panel">
          {message ? <p className="hint">{message}</p> : null}
          <div className="table-row"><strong>Time</strong><strong>Event</strong><strong>Location</strong></div>
          {events.map((event) => (
            <div className="table-row" key={event.id}>
              <span>{event.event_time}</span>
              <span>{event.event_type}</span>
              <span>{event.latitude && event.longitude ? `${event.latitude}, ${event.longitude}` : 'No location'}</span>
            </div>
          ))}
        </section>
      </RoleGuard>
    </main>
  );
}
