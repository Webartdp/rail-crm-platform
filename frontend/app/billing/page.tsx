'use client';

import { useEffect, useState } from 'react';
import { createInvoiceDraft, getInvoices, type Invoice } from '../../lib/invoices';

export default function BillingPage() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [message, setMessage] = useState('Loading invoices...');

  async function load() {
    try {
      const response = await getInvoices();
      setItems(response.data);
      setMessage(response.data.length ? 'Loaded from API.' : 'No invoices yet.');
    } catch (error) {
      setMessage('API not available.');
    }
  }

  async function createDraft() {
    try {
      await createInvoiceDraft();
      setMessage('Invoice draft created.');
      await load();
    } catch (error) {
      setMessage('No approved uninvoiced cost items or API not available.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Billing</p>
          <h1>Billing</h1>
          <p className="hero-text">Invoices based on approved employee time data.</p>
        </div>
        <button className="action-button primary" onClick={createDraft} type="button">Create invoice draft</button>
      </section>

      <section className="panel">
        <p className="hint">{message}</p>
        <div className="table-row"><strong>Invoice</strong><strong>Total</strong><strong>Status</strong></div>
        {items.map((item) => (
          <div className="table-row" key={item.id}>
            <span>{item.number}</span>
            <span>{item.total_amount}</span>
            <span>{item.status}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
