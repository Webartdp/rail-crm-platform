export default function StatusPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Status</p>
          <h1>Progress</h1>
          <p className="hero-text">Current project state.</p>
        </div>
      </section>
      <section className="panel">
        <p>Frontend prototype: ready</p>
        <p>Button demo: ready</p>
        <p>Backend API: draft</p>
        <p>Database: draft</p>
        <p>Saving data: next</p>
      </section>
    </main>
  );
}
