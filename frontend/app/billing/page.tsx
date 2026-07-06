const invoices = [
  ['INV-2026-001', 'DB Service GmbH', 'Draft'],
  ['INV-2026-002', 'Rail Control Süd', 'Sent'],
  ['INV-2026-003', 'Nordbahn Partner', 'Paid'],
];

export default function BillingPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Billing</p>
          <h1>Billing</h1>
          <p className="hero-text">Invoices based on approved employee time data.</p>
        </div>
        <div className="status-pill">Future module</div>
      </section>

      <section className="panel">
        <div className="table-row"><strong>Invoice</strong><strong>Client</strong><strong>Status</strong></div>
        {invoices.map(([number, client, status]) => (
          <div className="table-row" key={number}>
            <span>{number}</span>
            <span>{client}</span>
            <span>{status}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
