'use client';

import { useEffect, useState } from 'react';
import { getDocumentPrintData, type DocumentPrintData } from '../../../../lib/document-print';
import { closeWorkOrder } from '../../../../lib/work-orders';

type PageProps = {
  params: { id: string };
};

function formatValue(value?: string | number | null) {
  return value === undefined || value === null || value === '' ? '—' : String(value);
}

export default function DocumentPrintPage({ params }: PageProps) {
  const documentId = Number(params.id);
  const [data, setData] = useState<DocumentPrintData | null>(null);
  const [message, setMessage] = useState('Loading document print data...');

  async function load() {
    try {
      const response = await getDocumentPrintData(documentId);
      setData(response.data);
      setMessage('Ready to print.');
    } catch (error) {
      setMessage('Could not load print data. Check login/role.');
    }
  }

  async function closeRelatedWorkOrder() {
    if (!data?.work_order?.id) return;

    try {
      await closeWorkOrder(data.work_order.id, 'document_print_page');
      setMessage('Related work order closed.');
      await load();
    } catch (error) {
      setMessage('Could not close related work order. Manager/admin token required.');
    }
  }

  useEffect(() => {
    load();
  }, [documentId]);

  if (!data) {
    return <main className="page-shell"><section className="panel"><p className="hint">{message}</p></section></main>;
  }

  const { document, work_order, signatures, printed_by, printed_at } = data;

  return (
    <main className="page-shell print-document">
      <section className="hero-card no-print">
        <div>
          <p className="eyebrow">Print</p>
          <h1>{document.title}</h1>
          <p className="hero-text">Printable document summary with OCR and signatures.</p>
          <p className="hint">{message}</p>
        </div>
        <div>
          <button className="action-button primary" onClick={() => window.print()} type="button">Print</button>
          {work_order?.id && work_order.status !== 'closed' ? <button className="action-link" onClick={closeRelatedWorkOrder} type="button">Close Auftrag</button> : null}
        </div>
      </section>

      <section className="panel print-sheet">
        <header>
          <p className="eyebrow">Rail CRM Document</p>
          <h1>{document.title}</h1>
          <p>Status: {document.status} / Type: {document.type}</p>
        </header>

        <h2>Document</h2>
        <table>
          <tbody>
            <tr><th>ID</th><td>{document.id}</td></tr>
            <tr><th>File</th><td>{formatValue(document.original_filename)}</td></tr>
            <tr><th>MIME</th><td>{formatValue(document.mime_type)}</td></tr>
            <tr><th>OCR status</th><td>{formatValue(document.ocr_status)}</td></tr>
            <tr><th>Uploaded by</th><td>{formatValue(document.uploaded_by)}</td></tr>
          </tbody>
        </table>

        <h2>Work Order</h2>
        <table>
          <tbody>
            <tr><th>ID</th><td>{formatValue(work_order?.id)}</td></tr>
            <tr><th>Title</th><td>{formatValue(work_order?.title)}</td></tr>
            <tr><th>Reference</th><td>{formatValue(work_order?.reference_number)}</td></tr>
            <tr><th>Status</th><td>{formatValue(work_order?.status)}</td></tr>
          </tbody>
        </table>

        <h2>OCR / Extracted Text</h2>
        <div className="print-box whitespace-pre-wrap">{document.extracted_text || '—'}</div>

        <h2>Signatures</h2>
        {signatures.length === 0 ? <p>No signatures.</p> : null}
        {signatures.map((signature) => (
          <div className="print-signature" key={signature.id}>
            <p><strong>{signature.signer_name || '—'}</strong> / {signature.signer_email || '—'}</p>
            <p>Status: {signature.status} / Type: {signature.signature_type}</p>
            <p>Requested: {formatValue(signature.requested_at)} / Signed: {formatValue(signature.signed_at)} / Rejected: {formatValue(signature.rejected_at)}</p>
            {signature.signature_type === 'canvas' && signature.signature_data ? (
              <img alt="Canvas signature" src={signature.signature_data} style={{ maxWidth: '260px', background: '#fff' }} />
            ) : <p>Signature: {formatValue(signature.signature_data)}</p>}
          </div>
        ))}

        <footer>
          <p>Printed by {printed_by.name} ({printed_by.role}) at {printed_at}</p>
        </footer>
      </section>
    </main>
  );
}
