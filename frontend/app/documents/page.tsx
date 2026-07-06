const rows = [
  ['Report REF-2026-001', 'Waiting signature'],
  ['Act REF-2026-002', 'Ready'],
  ['Timesheet July', 'Open'],
];

export default function DocumentsPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Documents</p>
          <h1>Documents</h1>
          <p className="hero-text">Reports, acts, PDF files and signature workflow.</p>
        </div>
        <div className="status-pill">Prototype</div>
      </section>

      <section className="panel">
        <div className="table-row"><strong>Document</strong><strong>Status</strong><strong>Action</strong></div>
        {rows.map(([name, status]) => (
          <div className="table-row" key={name}>
            <span>{name}</span>
            <span>{status}</span>
            <span>View</span>
          </div>
        ))}
      </section>
    </main>
  );
}
