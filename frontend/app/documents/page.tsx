'use client';

import { useEffect, useState } from 'react';
import { createDocument, downloadDocument, getDocuments, uploadDocument, type DocumentRow } from '../../lib/documents';

function sizeLabel(size?: number | null) {
  if (!size) return '—';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const [items, setItems] = useState<DocumentRow[]>([]);
  const [title, setTitle] = useState('Report REF-2026-001');
  const [type, setType] = useState('report');
  const [workOrderId, setWorkOrderId] = useState('1');
  const [file, setFile] = useState<File | null>(null);
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

  async function submit(upload = false) {
    try {
      const payload = { title, type, status: upload ? 'uploaded' : 'draft', work_order_id: Number(workOrderId) || undefined };
      if (upload && file) {
        await uploadDocument(payload, file);
        setFile(null);
        setMessage('Document uploaded.');
      } else {
        await createDocument(payload);
        setMessage('Document metadata created.');
      }
      await load();
    } catch (error) {
      setMessage(upload ? 'Could not upload document. Check login/role and file type.' : 'Could not create document. Check login/role.');
    }
  }

  async function download(item: DocumentRow) {
    try {
      const blob = await downloadDocument(item.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.original_filename || item.title;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage('Could not download document. Check login/role.');
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
        <h2>New document</h2>
        <div className="form-grid">
          <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Type<input value={type} onChange={(event) => setType(event.target.value)} /></label>
          <label>Work order ID<input value={workOrderId} onChange={(event) => setWorkOrderId(event.target.value)} /></label>
          <label>File<input accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} type="file" /></label>
        </div>
        <button className="action-button primary" onClick={() => submit(Boolean(file))} type="button">{file ? 'Upload document' : 'Create metadata'}</button>
        <button className="action-link" onClick={() => submit(false)} type="button">Create metadata only</button>
      </section>

      <section className="panel">
        <p className="hint">{message}</p>
        <div className="table-row"><strong>Document</strong><strong>File</strong><strong>Status</strong></div>
        {items.map((item) => (
          <div className="table-row" key={item.id}>
            <span>{item.title}<br /><small>{item.type} / Auftrag #{item.work_order_id || '—'}</small></span>
            <span>{item.original_filename || 'No file'}<br /><small>{item.mime_type || '—'} / {sizeLabel(item.size_bytes)}</small></span>
            <span>{item.status} {item.file_path ? <button className="action-link" onClick={() => download(item)} type="button">Download</button> : null}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
