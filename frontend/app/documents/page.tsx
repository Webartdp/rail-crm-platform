'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import RoleGuard from '../components/RoleGuard';
import { useI18n } from '../i18n';
import { getDocumentSignatures, rejectDocumentSignature, requestDocumentSignature, signDocumentSignature, type DocumentSignature, type SignatureType } from '../../lib/document-signatures';
import { createDocument, downloadDocument, getDocuments, saveDocumentOcrText, startDocumentOcr, uploadDocument, type DocumentRow } from '../../lib/documents';

function sizeLabel(size: number | null | undefined, t: (key: string, params?: Record<string, string | number>) => string) {
  if (!size) return '—';
  if (size < 1024 * 1024) return t('docSizeKb', { value: Math.round(size / 1024) });
  return t('docSizeMb', { value: (size / 1024 / 1024).toFixed(1) });
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? `${fallback} ${error.message}` : fallback;
}

function canPreview(item: DocumentRow) {
  return item.mime_type === 'application/pdf' || item.mime_type?.startsWith('image/');
}

export default function DocumentsPage() {
  const { t, fmt } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [items, setItems] = useState<DocumentRow[]>([]);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('report');
  const [workOrderId, setWorkOrderId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [previewItem, setPreviewItem] = useState<DocumentRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signatureDocument, setSignatureDocument] = useState<DocumentRow | null>(null);
  const [signatures, setSignatures] = useState<DocumentSignature[]>([]);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signatureType, setSignatureType] = useState<SignatureType>('typed');
  const [signatureText, setSignatureText] = useState('');
  const [canvasHasDrawing, setCanvasHasDrawing] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const response = await getDocuments();
      setItems(response.data);
      setMessage(response.data.length ? '' : t('docNone'));
    } catch (error) {
      setMessage(errorText(error, t('docLoadFailed')));
    }
  }

  async function submit(upload = false) {
    try {
      const payload = { title, type, status: upload ? 'uploaded' : 'draft', work_order_id: Number(workOrderId) || undefined };
      if (upload && file) {
        await uploadDocument(payload, file);
        setFile(null);
        setMessage(t('docUploaded'));
      } else {
        await createDocument(payload);
        setMessage(t('docCreated'));
      }
      await load();
    } catch (error) {
      setMessage(errorText(error, upload ? t('docUploadFailed') : t('docCreateFailed')));
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
      setMessage(errorText(error, t('docDownloadFailed')));
    }
  }

  async function preview(item: DocumentRow) {
    if (!item.file_path || !canPreview(item)) {
      setMessage(t('docPreviewOnlyPdf'));
      return;
    }

    try {
      if (previewUrl) window.URL.revokeObjectURL(previewUrl);
      const blob = await downloadDocument(item.id);
      const url = window.URL.createObjectURL(blob);
      setPreviewItem(item);
      setPreviewUrl(url);
      setMessage('');
    } catch (error) {
      setMessage(errorText(error, t('docPreviewFailed')));
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
      setMessage(t('docOcrStarted'));
      await load();
    } catch (error) {
      setMessage(errorText(error, t('docOcrStartFailed')));
    }
  }

  async function saveOcr(item: DocumentRow) {
    try {
      if (!ocrText.trim()) {
        setMessage(t('docOcrTextEmpty'));
        return;
      }
      await saveDocumentOcrText(item.id, ocrText);
      setOcrText('');
      setMessage(t('docOcrSaved'));
      await load();
    } catch (error) {
      setMessage(errorText(error, t('docOcrSaveFailed')));
    }
  }

  async function openSignatures(item: DocumentRow) {
    try {
      const response = await getDocumentSignatures(item.id);
      setSignatureDocument(item);
      setSignatures(response.data);
      setMessage('');
    } catch (error) {
      setMessage(errorText(error, t('docSignaturesLoadFailed')));
    }
  }

  async function requestSignature() {
    if (!signatureDocument) return;
    try {
      await requestDocumentSignature(signatureDocument.id, {
        signer_name: signerName,
        signer_email: signerEmail,
        comment: t('docSignComment'),
        signature_type: signatureType,
      });
      await openSignatures(signatureDocument);
      setMessage(t('docSignatureRequested'));
    } catch (error) {
      setMessage(errorText(error, t('docSignatureRequestFailed')));
    }
  }

  async function signSignature(signature: DocumentSignature) {
    if (!signatureDocument) return;

    try {
      const typeToSave = signatureType;
      let dataToSave = signatureText || signature.signer_name || '';

      if (typeToSave === 'canvas') {
        if (!canvasRef.current || !canvasHasDrawing) {
          setMessage(t('docDrawFirst'));
          return;
        }
        dataToSave = canvasRef.current.toDataURL('image/png');
      }

      await signDocumentSignature(signatureDocument.id, signature.id, dataToSave, typeToSave);
      clearCanvasSignature();
      await openSignatures(signatureDocument);
      await load();
      setMessage(t('docSigned'));
    } catch (error) {
      setMessage(errorText(error, t('docSignFailed')));
    }
  }

  async function rejectSignature(signature: DocumentSignature) {
    if (!signatureDocument) return;
    try {
      await rejectDocumentSignature(signatureDocument.id, signature.id, t('docRejectedReason'));
      await openSignatures(signatureDocument);
      setMessage(t('docSignatureRejected'));
    } catch (error) {
      setMessage(errorText(error, t('docRejectFailed')));
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
      <RoleGuard allowedRoles={['manager', 'admin']} title={t('docTitle')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('docEyebrow')}</p>
            <h1>{t('docTitle')}</h1>
            <p className="hero-text">{t('docHero')}</p>
          </div>
          
        </section>

        <section className="panel">
          <h2>{t('docNew')}</h2>
          <div className="form-grid">
            <label>{t('docFieldTitle')}<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label>{t('commonType')}<select value={type} onChange={(event) => setType(event.target.value)}>{['report', 'act', 'receipt', 'delivery_note', 'brake_test', 'other'].map((value) => <option key={value} value={value}>{t(`docType_${value}`)}</option>)}</select></label>
            <label>{t('docWorkOrderId')}<input inputMode="numeric" value={workOrderId} onChange={(event) => setWorkOrderId(event.target.value)} /></label>
            <label>{t('docFile')}<input accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} type="file" /></label>
          </div>
          <button className="action-button primary" onClick={() => submit(Boolean(file))} type="button">{file ? t('docUpload') : t('docCreateEntry')}</button>
          <button className="action-link" onClick={() => submit(false)} type="button">{t('docCreateEntryOnly')}</button>
        </section>

        {previewItem && previewUrl ? (
          <section className="panel">
            <h2>{t('docPreviewTitle', { name: previewItem.original_filename || previewItem.title })}</h2>
            <button className="action-link" onClick={closePreview} type="button">{t('commonClose')}</button>
            {previewItem.mime_type === 'application/pdf' ? (
              <iframe title={t('docPreview')} src={previewUrl} width="100%" height="640" />
            ) : (
              <img alt={previewItem.title} src={previewUrl} style={{ maxWidth: '100%', height: 'auto' }} />
            )}
          </section>
        ) : null}

        {signatureDocument ? (
          <section className="panel">
            <h2>{t('docSignaturesTitle', { name: signatureDocument.title })}</h2>
            <div className="form-grid">
              <label>{t('docSignerName')}<input value={signerName} onChange={(event) => setSignerName(event.target.value)} /></label>
              <label>{t('docSignerEmail')}<input type="email" value={signerEmail} onChange={(event) => setSignerEmail(event.target.value)} /></label>
              <label>{t('docSignatureType')}<select value={signatureType} onChange={(event) => setSignatureType(event.target.value as SignatureType)}><option value="typed">{t('docSignatureTyped')}</option><option value="canvas">{t('docSignatureCanvas')}</option></select></label>
              {signatureType === 'typed' ? <label className="wide-field">{t('docSignatureTyped')}<textarea value={signatureText} onChange={(event) => setSignatureText(event.target.value)} /></label> : null}
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
                <button className="action-link" onClick={clearCanvasSignature} type="button">{t('docClearCanvas')}</button>
              </div>
            ) : null}
            <button className="action-button primary" onClick={requestSignature} type="button">{t('docRequestSignature')}</button>
            <button className="action-link" onClick={() => setSignatureDocument(null)} type="button">{t('commonClose')}</button>
            <div className="table-row"><strong>{t('docSigner')}</strong><strong>{t('commonStatus')}</strong><strong>{t('commonActions')}</strong></div>
            {signatures.length === 0 ? <p className="hint">{t('docNoSignatures')}</p> : null}
            {signatures.map((signature) => (
              <div className="table-row" key={signature.id}>
                <span>{signature.signer_name || '—'}<br /><small>{signature.signer_email || '—'} / {signature.signature_type === 'canvas' ? t('docSignatureCanvas') : t('docSignatureTyped')}</small></span>
                <span>{fmt.status(signature.status)}<br /><small>{fmt.dateTime(signature.signed_at || signature.rejected_at || signature.requested_at)}</small>{signature.status === 'signed' && signature.signature_type === 'canvas' && signature.signature_data ? <img alt={t('docSavedSignature')} src={signature.signature_data} style={{ maxWidth: '180px', display: 'block', background: '#fff' }} /> : null}</span>
                <span>
                  {signature.status === 'pending' ? <button className="action-link" onClick={() => signSignature(signature)} type="button">{t('docSign')}</button> : null}
                  {signature.status === 'pending' ? <button className="action-link" onClick={() => rejectSignature(signature)} type="button">{t('apprReject')}</button> : null}
                </span>
              </div>
            ))}
          </section>
        ) : null}

        <section className="panel">
          <h2>{t('docOcrText')}</h2>
          <textarea value={ocrText} onChange={(event) => setOcrText(event.target.value)} placeholder={t('docOcrPlaceholder')} />
        </section>

        <section className="panel">
          {message ? <p className="hint">{message}</p> : null}
          <div className="table-row"><strong>{t('docDocument')}</strong><strong>{t('docFile')}</strong><strong>{t('commonStatus')}</strong></div>
          {items.map((item) => (
            <div className="table-row" key={item.id}>
              <span>{item.title}<br /><small>{t(`docType_${item.type}`)} / {item.work_order_id ? t('commonAssignmentNumber', { id: item.work_order_id }) : '—'}</small></span>
              <span>{item.original_filename || t('docNoFile')}<br /><small>{item.mime_type || '—'} / {sizeLabel(item.size_bytes, t)}</small></span>
              <span>
                {fmt.status(item.status)} / {t('docOcr')}: {fmt.status(item.ocr_status || 'not_started')}
                {item.file_path && canPreview(item) ? <button className="action-link" onClick={() => preview(item)} type="button">{t('docPreview')}</button> : null}
                {item.file_path ? <button className="action-link" onClick={() => download(item)} type="button">{t('docDownload')}</button> : null}
                <a className="action-link" href={`/documents/${item.id}/print`}>{t('commonPrint')}</a>
                <button className="action-link" onClick={() => markOcrPending(item)} type="button">{t('docStartOcr')}</button>
                <button className="action-link" onClick={() => saveOcr(item)} type="button">{t('docSaveOcr')}</button>
                <button className="action-link" onClick={() => openSignatures(item)} type="button">{t('docSignatures')}</button>
              </span>
            </div>
          ))}
        </section>
      </RoleGuard>
    </main>
  );
}
