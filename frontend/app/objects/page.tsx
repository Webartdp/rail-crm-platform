const objects = [
  ['Gleis 12', 'Berlin Hbf', 'DB Service GmbH'],
  ['Bahnhof Nord', 'München', 'Rail Control Süd'],
  ['Depot West', 'Hamburg', 'Nordbahn Partner'],
];

export default function ObjectsPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Objects</p>
          <h1>Work Objects</h1>
          <p className="hero-text">Places where employees perform assignments.</p>
        </div>
        <div className="status-pill">Locations</div>
      </section>

      <section className="panel">
        <div className="table-row"><strong>Object</strong><strong>Location</strong><strong>Client</strong></div>
        {objects.map(([name, location, client]) => (
          <div className="table-row" key={name}>
            <span>{name}</span>
            <span>{location}</span>
            <span>{client}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
