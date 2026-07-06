const leistungsarten = [
  'WTU',
  'WSU',
  'E-WU',
  'Rb',
  'Azf',
  'RID-Kontrolle',
  'Zugbeschtreifung',
  'Eigene Eingabe',
];

const timeline = [
  { time: '06:40', title: 'Gasfahrt gestartet', place: 'Zuhause', status: 'done' },
  { time: '07:18', title: 'Gasfahrt beendet', place: 'Einsatzort Gleis 12', status: 'done' },
  { time: '07:25', title: 'Dienstbeginn', place: 'Einsatzort Gleis 12', status: 'active' },
  { time: '--:--', title: 'Stop', place: 'Wartet auf Abschluss', status: 'pending' },
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Rail CRM Platform</p>
          <h1>Employee Field Screen</h1>
          <p className="hero-text">
            First visual prototype for Gasfahrt, Dienstbeginn, Stop and Dienstfahrt workflow.
          </p>
        </div>
        <div className="status-pill">Status: Dienst aktiv</div>
      </section>

      <section className="grid">
        <div className="panel action-panel">
          <h2>Aktionen</h2>
          <button className="action-button secondary">Gasfahrt</button>
          <button className="action-button secondary">Gasfahrt beendet</button>
          <button className="action-button primary">Dienstbeginn</button>
          <button className="action-button warning">Stop</button>
          <button className="action-button secondary">Start Dienstfahrt</button>
          <button className="action-button secondary">Stop Dienstfahrt</button>
          <p className="hint">
            If planned time is exceeded, Stop requires Bemerkung before submission.
          </p>
        </div>

        <div className="panel">
          <h2>Auftragsdaten</h2>
          <div className="form-grid">
            <label>
              Datum
              <input value="2026-07-06" readOnly />
            </label>
            <label>
              Leistungsart
              <select defaultValue="WTU">
                {leistungsarten.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Referenznummer
              <input placeholder="z.B. REF-2026-001" />
            </label>
            <label>
              Zugnummer
              <input placeholder="z.B. ICE 204" />
            </label>
            <label>
              Einsatzort
              <input placeholder="Ort oder Bahnhof" />
            </label>
            <label>
              Bemerkung
              <textarea placeholder="Pflichtfeld, wenn Zeit überschritten ist" />
            </label>
          </div>
        </div>
      </section>

      <section className="grid lower-grid">
        <div className="panel">
          <h2>Zeitlinie</h2>
          <div className="timeline">
            {timeline.map((item) => (
              <div className={`timeline-item ${item.status}`} key={item.title}>
                <strong>{item.time}</strong>
                <div>
                  <p>{item.title}</p>
                  <span>{item.place}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel map-placeholder">
          <h2>Google Maps Position</h2>
          <div className="map-box">
            <span>Map placeholder</span>
          </div>
          <p className="hint">Coordinates will be stored by backend and displayed on the map.</p>
        </div>
      </section>
    </main>
  );
}
