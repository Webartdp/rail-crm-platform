'use client';

import { useEffect, useState } from 'react';
import { getWorkEvents, type WorkEvent } from '../../lib/api';

type Coordinate = string | number | null | undefined;

function coordinateValue(value: Coordinate) {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

function mapsUrl(latitude: Coordinate, longitude: Coordinate) {
  const lat = coordinateValue(latitude);
  const lng = coordinateValue(longitude);

  if (!lat || !lng) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function embedUrl(latitude: Coordinate, longitude: Coordinate) {
  const lat = coordinateValue(latitude);
  const lng = coordinateValue(longitude);

  if (!lat || !lng) return null;
  return `https://www.google.com/maps?q=${lat},${lng}&output=embed`;
}

function hasCoordinates(event: WorkEvent) {
  return Boolean(mapsUrl(event.latitude, event.longitude));
}

export default function MapsPage() {
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [selected, setSelected] = useState<WorkEvent | null>(null);
  const [message, setMessage] = useState('Загружаю координаты...');

  useEffect(() => {
    getWorkEvents()
      .then((response) => {
        setEvents(response.data);
        setSelected(response.data.find((event) => hasCoordinates(event)) || null);
        setMessage(response.data.length === 0 ? 'Событий пока нет.' : '');
      })
      .catch(() => setMessage('API недоступен. Проверь backend.'));
  }, []);

  const selectedEmbed = selected ? embedUrl(selected.latitude, selected.longitude) : null;

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Google Maps</p>
          <h1>Карта событий</h1>
          <p className="hero-text">Координаты, сохранённые при Gasfahrt, Dienstbeginn, Stop и Dienstfahrt.</p>
        </div>
        <div className="status-pill">GPS</div>
      </section>

      {selectedEmbed ? (
        <section className="panel">
          <h2>{selected?.event_type}</h2>
          <iframe title="Selected event map" src={selectedEmbed} width="100%" height="360" loading="lazy" />
        </section>
      ) : null}

      <section className="panel">
        {message ? <p className="hint">{message}</p> : null}
        <div className="table-row"><strong>Событие</strong><strong>Время</strong><strong>Карта</strong></div>
        {events.map((event) => {
          const url = mapsUrl(event.latitude, event.longitude);

          return (
            <div className="table-row" key={event.id}>
              <span>{event.event_type}</span>
              <span>{event.event_time}</span>
              <span>{url ? <button className="action-link" onClick={() => setSelected(event)} type="button">Показать</button> : 'Нет координат'} {url ? <a href={url} target="_blank" rel="noreferrer">Открыть</a> : null}</span>
            </div>
          );
        })}
      </section>
    </main>
  );
}
