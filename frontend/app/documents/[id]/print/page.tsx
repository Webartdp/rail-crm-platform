'use client';

import { use, useEffect, useState } from 'react';
import RoleGuard from '../../../components/RoleGuard';
import { useI18n } from '../../../i18n';
import { getDocumentPrintData, type DocumentPrintData } from '../../../../lib/document-print';
import { closeWorkOrder } from '../../../../lib/work-orders';

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatValue(value?: string | number | null) {
  return value === undefined || value === null || value === '' ? '—' : String(value);
}

export default function DocumentPrintPage({ params }: PageProps) {
  const { t, fmt } = useI18n();
  const resolvedParams = use(params);
  const documentId = Number(resolvedParams.id);
  const [data, setData] = useState<DocumentPrintData | null>(null);
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const response = await getDocumentPrintData(documentId);
      setData(response.data);
      setMessage('');
    } catch (error) {
      setMessage(t('docPrintLoadFailed'));
    }
  }

  async function closeRelatedWorkOrder() {
    if (!data?.work_order?.id) return;

    try {
      await closeWorkOrder(data.work_order.id, 'document_print_page');
      setMessage(t('docPrintOrderClosed'));
      await load();
    } catch (error) {
      setMessage(error instanceof Error && error.message ? error.message : t('docPrintCloseFailed'));
    }
  }

  useEffect(() => {
    load();
  }, [documentId]);

  if (!data) {
    return <main className="page-shell"><RoleGuard allowedRoles={['manager', 'admin']} title={t('docPrintTitle')}><section className="panel"><p className="hint">{message || t('commonLoadingDots')}</p></section></RoleGuard></main>;
  }

  const { document, work_order, signatures, printed_by, printed_at } = data;

  return (
    <main className="page-shell print-document">
      <RoleGuard allowedRoles={['manager', 'admin']} title={t('docPrintTitle')}>
        <section className="hero-card no-print">
          <div>
            <p className="eyebrow">{t('commonPrint')}</p>
            <h1>{document.title}</h1>
            <p className="hero-text">{t('docPrintHero')}</p>
            {message ? <p className="hint">{message}</p> : null}
          </div>
          <div>
            <button className="action-button primary" onClick={() => window.print()} type="button">{t('commonPrint')}</button>
            {work_order?.id && work_order.status !== 'closed' ? <button className="action-link" onClick={closeRelatedWorkOrder} type="button">{t('docPrintCloseOrder')}</button> : null}
          </div>
        </section>

        <section className="panel print-sheet">
          <header>
            <p className="eyebrow">Rail CRM</p>
            <h1>{document.title}</h1>
            <p>{t('commonStatus')}: {fmt.status(document.status)} / {t('commonType')}: {t(`docType_${document.type}`)}</p>
          </header>

          <h2>{t('docDocument')}</h2>
          <table>
            <tbody>
              <tr><th>ID</th><td>{document.id}</td></tr>
              <tr><th>{t('docFile')}</th><td>{formatValue(document.original_filename)}</td></tr>
              <tr><th>{t('docFileType')}</th><td>{formatValue(document.mime_type)}</td></tr>
              <tr><th>{t('docOcr')}</th><td>{fmt.status(document.ocr_status || 'not_started')}</td></tr>
              <tr><th>{t('docUploadedBy')}</th><td>{formatValue(document.uploaded_by)}</td></tr>
            </tbody>
          </table>

          <h2>{t('commonAssignment')}</h2>
          <table>
            <tbody>
              <tr><th>ID</th><td>{formatValue(work_order?.id)}</td></tr>
              <tr><th>{t('docFieldTitle')}</th><td>{formatValue(work_order?.title)}</td></tr>
              <tr><th>{t('asgReferenceNumber')}</th><td>{formatValue(work_order?.reference_number)}</td></tr>
              <tr><th>{t('commonStatus')}</th><td>{work_order?.status ? fmt.status(work_order.status) : '—'}</td></tr>
            </tbody>
          </table>

          <h2>{t('docOcrText')}</h2>
          <div className="print-box whitespace-pre-wrap">{document.extracted_text || '—'}</div>

          <h2>{t('docSignatures')}</h2>
          {signatures.length === 0 ? <p>{t('docNoSignatures')}</p> : null}
          {signatures.map((signature) => (
            <div className="print-signature" key={signature.id}>
              <p><strong>{signature.signer_name || '—'}</strong> / {signature.signer_email || '—'}</p>
              <p>{t('commonStatus')}: {fmt.status(signature.status)} / {t('docSignatureType')}: {signature.signature_type === 'canvas' ? t('docSignatureCanvas') : t('docSignatureTyped')}</p>
              <p>{t('docRequestedAt')}: {fmt.dateTime(signature.requested_at)} / {t('docSignedAt')}: {fmt.dateTime(signature.signed_at)} / {t('docRejectedAt')}: {fmt.dateTime(signature.rejected_at)}</p>
              {signature.signature_type === 'canvas' && signature.signature_data ? (
                <img alt={t('docSavedSignature')} src={signature.signature_data} style={{ maxWidth: '260px', background: '#fff' }} />
              ) : <p>{t('docSignature')}: {formatValue(signature.signature_data)}</p>}
            </div>
          ))}

          <footer>
            <p>{t('docPrintedBy', { name: printed_by.name, role: fmt.role(printed_by.role), date: fmt.dateTime(printed_at) })}</p>
          </footer>
        </section>
      </RoleGuard>
    </main>
  );
}
