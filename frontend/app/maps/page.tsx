'use client';

import { useEffect, useState } from 'react';
import { getWorkEvents, type WorkEvent } from '../../lib/api';

function mapsUrl(latitude?: string, longitude?: string) {
  if (!latitude || !longitude) return null;
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

function embedUrl(latitude?: string, longitude?: string) {
  if (!latitude || !longitude) return null;
  return `https://www.google.com/maps?q=${latitude},${longitude}&output=embed`;
}

export default function MapsPage() {
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [selected, setSelected] = useState<WorkEvent | null>(null);
  const [message, setMessage] = useState('Loading map positions...');

  useEffect(() => {
    getWorkEvents()
      .then((response) => {
        setEvents(response.data);
        setSelected(response.data.find((event) => event.latitude && event.longitude) || null);
        setMessage(response.data.length === 0 ? 'No events stored yet.' : '');
      })
      .catch(() => setMessage('API not available.'));
  }, []);

  const selectedEmbed = selected ? embedUrl(selected.latitude, selected.longitude) : null;

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Google Maps</p>
          <h1>Event Positions</h1>
          <p className="hero-text">Embedded Google Maps view and links for stored employee workflow positions.</p>
        </div>
        <div className="status-pill">Coordinates</div>
      </section>

      {selectedEmbed ? (
        <section className="panel">
          <h2>{selected?.event_type}</h2>
          <iframe title="Selected event map" src={selectedEmbed} width="100%" height="360" loading="lazy" />
        </section>
      ) : null}

      <section className="panel">
        {message ? <p className="hint">{message}</p> : null}
        <div className="table-row"><strong>Event</strong><strong>Time</strong><strong>Map</strong></div>
        {events.map((event) => {
          const url = mapsUrl(event.latitude, event.longitude);
          return (
            <div className="table-row" key={event.id}>
              <span>{event.event_type}</span>
              <span>{event.event_time}</span>
              <span>{url ? <button className="action-link" onClick={() => setSelected(event)} type="button">Show map</button> : 'No coordinates'} {url ? <a href={url} target="_blank">Open</a> : null}</span>
            </div>
          );
        })}
      </section>
    </main>
  );
}
