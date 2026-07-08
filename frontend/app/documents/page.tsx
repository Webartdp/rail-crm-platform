'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { getDocumentSignatures, rejectDocumentSignature, requestDocumentSignature, signDocumentSignature, type DocumentSignature, type SignatureType } from '../../lib/document-signatures';
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [items, setItems] = useState<DocumentRow[]>([]);
  const [title, setTitle] = useState('Report REF-2026-001');
  const [type, setType] = useState('report');
  const [workOrderId, setWorkOrderId] = useState('1');
  const [file, setFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [previewItem, setPreviewItem] = useState<DocumentRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signatureDocument, setSignatureDocument] = useState<DocumentRow | null>(null);
  const [signatures, setSignatures] = useState<DocumentSignature[]>([]);
  const [signerName, setSignerName] = useState('Max Müller');
  const [signerEmail, setSignerEmail] = useState('max@example.com');
  const [signatureType, setSignatureType] = useState<SignatureType>('typed');
  const [signatureText, setSignatureText] = useState('Signed by Max Müller');
  const [canvasHasDrawing, setCanvasHasDrawing] = useState(false);
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

  async function openSignatures(item: DocumentRow) {
    try {
      const response = await getDocumentSignatures(item.id);
      setSignatureDocument(item);
      setSignatures(response.data);
      setMessage(`Loaded signatures for ${item.title}.`);
    } catch (error) {
      setMessage('Could not load signatures.');
    }
  }

  async function requestSignature() {
    if (!signatureDocument) return;
    try {
      await requestDocumentSignature(signatureDocument.id, {
        signer_name: signerName,
        signer_email: signerEmail,
        comment: 'Please sign this document.',
        signature_type: signatureType,
      });
      await openSignatures(signatureDocument);
      setMessage('Signature requested.');
    } catch (error) {
      setMessage('Could not request signature. Manager/admin role required.');
    }
  }

  async function signSignature(signature: DocumentSignature) {
    if (!signatureDocument) return;

    try {
      const typeToSave = signatureType;
      let dataToSave = signatureText || `Signed by ${signature.signer_name || 'user'}`;

      if (typeToSave === 'canvas') {
        if (!canvasRef.current || !canvasHasDrawing) {
          setMessage('Draw a signature on the canvas before signing.');
          return;
        }
        dataToSave = canvasRef.current.toDataURL('image/png');
      }

      await signDocumentSignature(signatureDocument.id, signature.id, dataToSave, typeToSave);
      clearCanvasSignature();
      await openSignatures(signatureDocument);
      await load();
      setMessage(typeToSave === 'canvas' ? 'Document signed with canvas signature.' : 'Document signed.');
    } catch (error) {
      setMessage('Could not sign document. Check login and pending status.');
    }
  }

  async function rejectSignature(signature: DocumentSignature) {
    if (!signatureDocument) return;
    try {
      await rejectDocumentSignature(signatureDocument.id, signature.id, 'Rejected from CRM UI.');
      await openSignatures(signatureDocument);
      setMessage('Signature rejected.');
    } catch (error) {
      setMessage('Could not reject signature. Check login and pending status.');
    }
  }

  function canvasPoint(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function startCanvasSignature(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const context = canvas.getContext('2d');
    if (!context) return;

    const point = canvasPoint(event);
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#111827';
    setCanvasHasDrawing(true);
  }

  function drawCanvasSignature(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const context = event.currentTarget.getContext('2d');
    if (!context) return;

    const point = canvasPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function endCanvasSignature(event: PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function clearCanvasSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    setCanvasHasDrawing(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Documents</p>
          <h1>Documents</h1>
          <p className="hero-text">Reports, acts, PDF files, OCR and signature workflow.</p>
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

      {signatureDocument ? (
        <section className="panel">
          <h2>Signatures: {signatureDocument.title}</h2>
          <div className="form-grid">
            <label>Signer name<input value={signerName} onChange={(event) => setSignerName(event.target.value)} /></label>
            <label>Signer email<input value={signerEmail} onChange={(event) => setSignerEmail(event.target.value)} /></label>
            <label>Signature type<select value={signatureType} onChange={(event) => setSignatureType(event.target.value as SignatureType)}><option value="typed">Typed</option><option value="canvas">Canvas</option></select></label>
            {signatureType === 'typed' ? <label className="wide-field">Typed signature<textarea value={signatureText} onChange={(event) => setSignatureText(event.target.value)} /></label> : null}
          </div>
          {signatureType === 'canvas' ? (
            <div>
              <canvas
                ref={canvasRef}
                width={720}
                height={220}
                onPointerDown={startCanvasSignature}
                onPointerMove={drawCanvasSignature}
                onPointerUp={endCanvasSignature}
                onPointerCancel={endCanvasSignature}
                style={{ width: '100%', maxWidth: '720px', height: '220px', background: '#fff', border: '1px solid #cbd5e1', touchAction: 'none' }}
              />
              <br />
              <button className="action-link" onClick={clearCanvasSignature} type="button">Clear canvas</button>
            </div>
          ) : null}
          <button className="action-button primary" onClick={requestSignature} type="button">Request signature</button>
          <button className="action-link" onClick={() => setSignatureDocument(null)} type="button">Close signatures</button>
          <div className="table-row"><strong>Signer</strong><strong>Status</strong><strong>Action</strong></div>
          {signatures.length === 0 ? <p className="hint">No signature requests yet.</p> : null}
          {signatures.map((signature) => (
            <div className="table-row" key={signature.id}>
              <span>{signature.signer_name || '—'}<br /><small>{signature.signer_email || '—'} / {signature.signature_type}</small></span>
              <span>{signature.status}<br /><small>{signature.signed_at || signature.rejected_at || signature.requested_at || '—'}</small>{signature.status === 'signed' && signature.signature_type === 'canvas' && signature.signature_data ? <img alt="Saved signature" src={signature.signature_data} style={{ maxWidth: '180px', display: 'block', background: '#fff' }} /> : null}</span>
              <span>
                {signature.status === 'pending' ? <button className="action-link" onClick={() => signSignature(signature)} type="button">Sign</button> : null}
                {signature.status === 'pending' ? <button className="action-link" onClick={() => rejectSignature(signature)} type="button">Reject</button> : null}
              </span>
            </div>
          ))}
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
              <a className="action-link" href={`/documents/${item.id}/print`}>Print</a>
              <button className="action-link" onClick={() => markOcrPending(item)} type="button">OCR pending</button>
              <button className="action-link" onClick={() => saveOcr(item)} type="button">Save OCR text</button>
              <button className="action-link" onClick={() => openSignatures(item)} type="button">Signatures</button>
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}
