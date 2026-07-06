'use client';

import { useEffect, useState } from 'react';
import { getWorkEvents, type WorkEvent } from '../../lib/api';

function mapsUrl(latitude?: string, longitude?: string) {
  if (!latitude || !longitude) return null;
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export default function MapsPage() {
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [message, setMessage] = useState('Loading map positions...');

  useEffect(() => {
    getWorkEvents()
      .then((response) => {
        setEvents(response.data);
        setMessage(response.data.length === 0 ? 'No events stored yet.' : '');
      })
      .catch(() => setMessage('API not available.'));
  }, []);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Google Maps</p>
          <h1>Event Positions</h1>
          <p className="hero-text">Google Maps links for stored employee workflow positions.</p>
        </div>
        <div className="status-pill">Coordinates</div>
      </section>

      <section className="panel">
        {message ? <p className="hint">{message}</p> : null}
        <div className="table-row"><strong>Event</strong><strong>Time</strong><strong>Map</strong></div>
        {events.map((event) => {
          const url = mapsUrl(event.latitude, event.longitude);
          return (
            <div className="table-row" key={event.id}>
              <span>{event.event_type}</span>
              <span>{event.event_time}</span>
              <span>{url ? <a href={url} target="_blank">Open Google Maps</a> : 'No coordinates'}</span>
            </div>
          );
        })}
      </section>
    </main>
  );
}
