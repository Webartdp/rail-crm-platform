'use client';

import { useEffect, useState } from 'react';
import { createDocument, downloadDocument, getDocuments, saveDocumentOcrText, startDocumentOcr, uploadDocument, type DocumentRow } from '../../lib/documents';

function sizeLabel(size?: number | null) {
  if (!size) return '—';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function canPreview(item: DocumentRow) {
  return item.mime_type === 'application/pdf' || item.mime_type?.startsWith('image/');
}

export default function DocumentsPage() {
  const [items, setItems] = useState<DocumentRow[]>([]);
  const [title, setTitle] = useState('Report REF-2026-001');
  const [type, setType] = useState('report');
  const [workOrderId, setWorkOrderId] = useState('1');
  const [file, setFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [previewItem, setPreviewItem] = useState<DocumentRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

  async function preview(item: DocumentRow) {
    if (!item.file_path || !canPreview(item)) {
      setMessage('Preview is available only for PDF and image files.');
      return;
    }

    try {
      if (previewUrl) window.URL.revokeObjectURL(previewUrl);
      const blob = await downloadDocument(item.id);
      const url = window.URL.createObjectURL(blob);
      setPreviewItem(item);
      setPreviewUrl(url);
      setMessage(`Preview opened for ${item.original_filename || item.title}.`);
    } catch (error) {
      setMessage('Could not preview document. Check login/role.');
    }
  }

  function closePreview() {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewItem(null);
    setPreviewUrl(null);
  }

  async function markOcrPending(item: DocumentRow) {
    try {
      await startDocumentOcr(item.id);
      setMessage('OCR marked as pending.');
      await load();
    } catch (error) {
      setMessage('Could not start OCR. Check login/role.');
    }
  }

  async function saveOcr(item: DocumentRow) {
    try {
      await saveDocumentOcrText(item.id, ocrText || `OCR text for ${item.title}`);
      setOcrText('');
      setMessage('OCR text saved.');
      await load();
    } catch (error) {
      setMessage('Could not save OCR text. Check login/role and text.');
    }
  }

  useEffect(() => {
    load();
    return () => {
      if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    };
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

      {previewItem && previewUrl ? (
        <section className="panel">
          <h2>Preview: {previewItem.original_filename || previewItem.title}</h2>
          <button className="action-link" onClick={closePreview} type="button">Close preview</button>
          {previewItem.mime_type === 'application/pdf' ? (
            <iframe title="Document preview" src={previewUrl} width="100%" height="640" />
          ) : (
            <img alt={previewItem.title} src={previewUrl} style={{ maxWidth: '100%', height: 'auto' }} />
          )}
        </section>
      ) : null}

      <section className="panel">
        <h2>OCR text</h2>
        <textarea value={ocrText} onChange={(event) => setOcrText(event.target.value)} placeholder="Paste or edit extracted text here before saving to a document" />
      </section>

      <section className="panel">
        <p className="hint">{message}</p>
        <div className="table-row"><strong>Document</strong><strong>File</strong><strong>Status</strong></div>
        {items.map((item) => (
          <div className="table-row" key={item.id}>
            <span>{item.title}<br /><small>{item.type} / Auftrag #{item.work_order_id || '—'}</small></span>
            <span>{item.original_filename || 'No file'}<br /><small>{item.mime_type || '—'} / {sizeLabel(item.size_bytes)}</small></span>
            <span>
              {item.status} / OCR: {item.ocr_status || 'not_started'}
              {item.file_path && canPreview(item) ? <button className="action-link" onClick={() => preview(item)} type="button">Preview</button> : null}
              {item.file_path ? <button className="action-link" onClick={() => download(item)} type="button">Download</button> : null}
              <button className="action-link" onClick={() => markOcrPending(item)} type="button">OCR pending</button>
              <button className="action-link" onClick={() => saveOcr(item)} type="button">Save OCR text</button>
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}
