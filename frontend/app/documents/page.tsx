'use client';

import { useEffect, useState } from 'react';
import { createDocument, getDocuments, type DocumentRow } from '../../lib/documents';

export default function DocumentsPage() {
  const [items, setItems] = useState<DocumentRow[]>([]);
  const [title, setTitle] = useState('Report REF-2026-001');
  const [type, setType] = useState('report');
  const [message, setMessage] = useState('Loading documents...');

  async function load() {
    try {
      const response = await getDocuments();
      setItems(response.data);
      setMessage(response.data.length ? 'Loaded from API.' : 'No documents yet.');
    } catch (error) {
      setMessage('API not available.');
    }
  }

  async function submit() {
    try {
      await createDocument({ title, type, status: 'draft' });
      setMessage('Document created.');
      await load();
    } catch (error) {
      setMessage('Could not create document.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Documents</p>
          <h1>Documents</h1>
          <p className="hero-text">Reports, acts, PDF files and future OCR workflow.</p>
        </div>
        <div className="status-pill">Belege</div>
      </section>

      <section className="panel">
        <h2>New document placeholder</h2>
        <div className="form-grid">
          <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Type<input value={type} onChange={(event) => setType(event.target.value)} /></label>
        </div>
        <button className="action-button primary" onClick={submit} type="button">Create document</button>
      </section>

      <section className="panel">
        <p className="hint">{message}</p>
        <div className="table-row"><strong>Document</strong><strong>Type</strong><strong>Status</strong></div>
        {items.map((item) => (
          <div className="table-row" key={item.id}>
            <span>{item.title}</span>
            <span>{item.type}</span>
            <span>{item.status}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
