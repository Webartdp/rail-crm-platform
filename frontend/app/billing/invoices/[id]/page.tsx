'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import RoleGuard from '../../../components/RoleGuard';
import { useI18n } from '../../../i18n';
import {
  deleteInvoice,
  downloadInvoicePdf,
  getInvoice,
  sendInvoice,
  updateInvoice,
  type Invoice,
  type InvoiceLine,
} from '../../../../lib/invoices';

export default function InvoiceViewPage() {
  const { t, fmt } = useI18n();
  const params = useParams();
  const invoiceId = Number(params.id);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [notes, setNotes] = useState('');

  async function load() {
    try {
      const response = await getInvoice(invoiceId);
      setInvoice(response.data);
      setLines(response.lines);
      setNotes(response.data.notes || '');
    } catch (error) {
      setNotice({ tone: 'error', text: t('commonLoadFailed', { error: error instanceof Error ? error.message : t('commonUnknownError') }) });
    }
  }

  useEffect(() => {
    if (invoiceId) load();
  }, [invoiceId]);

  // Group lines by work order for a readable overview.
  const groups = useMemo(() => {
    const map = new Map<string, { title: string; reference: string; object: string; lines: InvoiceLine[]; amount: number }>();
    lines.forEach((line) => {
      const key = `${line.assignment_id}`;
      const group = map.get(key) || { title: line.work_title, reference: line.reference, object: line.object, lines: [], amount: 0 };
      group.lines.push(line);
      group.amount += line.amount;
      map.set(key, group);
    });
    return [...map.values()];
  }, [lines]);

  async function act(action: () => Promise<{ message: string }>, after?: () => void) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await action();
      setNotice({ tone: 'success', text: response.message });
      after?.();
      await load();
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : t('commonUnknownError') });
    } finally {
      setBusy(false);
    }
  }

  const status = invoice?.status || 'draft';

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title={t('invTitle')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('invEyebrow')} · {fmt.status(status)}</p>
            <h1>{invoice?.number || t('invNumberFallback', { id: invoiceId })}</h1>
            <p className="hero-text">{invoice?.client_name || t('billNoClient')} · {fmt.date(invoice?.period_from)} – {fmt.date(invoice?.period_to)}</p>
          </div>
          <div className="row-actions">
            <a className="action-button secondary" href="/billing">{t('invBack')}</a>
            {invoice ? <button className="action-button secondary" onClick={() => downloadInvoicePdf(invoice).catch((error) => setNotice({ tone: 'error', text: String(error?.message || error) }))} type="button">{t('invDownloadPdf')}</button> : null}
            {invoice ? <button className="action-button primary" disabled={busy} onClick={() => setSendOpen(true)} type="button">{t('invSendEmail')}</button> : null}
          </div>
        </section>

        {notice ? <p className={`notice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p> : null}

        {invoice ? (
          <>
            <section className="ts-summary">
              <div className="ts-total">
                <span>{t('billGross')}</span>
                <strong>{fmt.money(invoice.gross_amount ?? invoice.total_amount)}</strong>
                <small>{t('invNetVat', { net: fmt.money(invoice.total_amount), vat: fmt.money(invoice.vat_amount), rate: fmt.number(invoice.vat_rate, 0) })}</small>
              </div>
              <dl className="ts-zones">
                <div><dt>{t('commonDate')}</dt><dd>{fmt.date(invoice.issued_at)}</dd></div>
                <div><dt>{t('billDue')}</dt><dd>{fmt.date(invoice.due_at)}</dd></div>
                <div><dt>{t('invSent')}</dt><dd>{invoice.sent_at ? fmt.date(invoice.sent_at) : '—'}</dd></div>
                <div><dt>{t('invPaid')}</dt><dd>{invoice.paid_at ? fmt.date(invoice.paid_at) : '—'}</dd></div>
              </dl>
            </section>

            <section className="panel">
              <h2>{t('invItemsTitle')}</h2>
              {groups.map((group) => (
                <div className="invoice-group" key={`${group.reference}-${group.title}`}>
                  <div className="detail-subhead">
                    <h3>{group.title || '—'}{group.reference ? ` · ${group.reference}` : ''}</h3>
                    <strong>{fmt.money(group.amount)}</strong>
                  </div>
                  {group.object ? <p className="hint">{group.object}</p> : null}
                  <div className="data-table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{t('commonDate')}</th>
                          <th>{t('commonEmployee')}</th>
                          <th>{t('invPosition')}</th>
                          <th className="num">{t('billHours')}</th>
                          <th className="num">{t('billRate')}</th>
                          <th className="num">{t('billCoefficient')}</th>
                          <th className="num">{t('billAmount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.lines.map((line) => (
                          <tr key={line.id}>
                            <td>{fmt.date(line.date)}</td>
                            <td>{line.employee}</td>
                            <td>{line.type === 'arbeit' && line.tariff_zone ? `${t(`zone_${line.tariff_zone}`)}${line.day_type && line.day_type !== 'workday' ? ` · ${t(`dayType_${line.day_type}`)}` : ''}` : t(`costType_${line.type}`)}</td>
                            <td className="num">{fmt.number(line.hours, 2)}</td>
                            <td className="num">{fmt.money(line.rate)}</td>
                            <td className="num">×{fmt.number(line.coefficient, 2)}</td>
                            <td className="num"><strong>{fmt.money(line.amount)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {!lines.length ? <p className="empty-state">{t('invNoItems')}</p> : null}
            </section>

            <section className="panel">
              <h2>{t('invNotesTitle')}</h2>
              <p className="hint">{t('invNotesHint')}</p>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
              <div className="form-actions">
                <button className="action-button secondary" disabled={busy} onClick={() => act(() => updateInvoice(invoiceId, { notes }))} type="button">{t('commonSave')}</button>
              </div>
            </section>

            <section className="panel danger-zone">
              <h2>{t('woActions')}</h2>
              <div className="row-actions">
                {status !== 'paid' ? <button className="action-button secondary" disabled={busy} onClick={() => act(() => updateInvoice(invoiceId, { status: 'paid' }))} type="button">{t('invMarkPaid')}</button> : null}
                {status === 'draft' ? <button className="action-button secondary" disabled={busy} onClick={() => act(() => updateInvoice(invoiceId, { status: 'sent' }))} type="button">{t('invMarkSent')}</button> : null}
                {status === 'draft' ? (
                  <button className="action-button secondary danger-button" disabled={busy} onClick={() => { if (window.confirm(t('invDeleteConfirm', { number: invoice.number }))) act(() => deleteInvoice(invoiceId), () => { window.location.href = '/billing'; }); }} type="button">{t('invDeleteDraft')}</button>
                ) : null}
              </div>
            </section>
          </>
        ) : null}

        {sendOpen && invoice ? (
          <SendDialog
            invoice={invoice}
            onClose={() => setSendOpen(false)}
            onSend={(to, message) => act(() => sendInvoice(invoiceId, { to, message }), () => setSendOpen(false))}
            busy={busy}
          />
        ) : null}
      </RoleGuard>
    </main>
  );
}

function SendDialog({ invoice, onClose, onSend, busy }: { invoice: Invoice; onClose: () => void; onSend: (to: string, message: string) => void; busy: boolean }) {
  const { t } = useI18n();
  const [to, setTo] = useState(invoice.client_email || invoice.sent_to || '');
  const [message, setMessage] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSend(to.trim(), message.trim());
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="send-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="send-title">{t('invSendTitle', { number: invoice.number })}</h2>
        <p className="hint">{t('invSendHint')}</p>
        <form className="dialog-form" onSubmit={submit}>
          <label>{t('invSendTo')}<input required type="email" value={to} onChange={(event) => setTo(event.target.value)} /></label>
          <label>{t('invSendMessage')}<textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t('invSendMessagePlaceholder')} /></label>
          <div className="dialog-actions">
            <button className="action-button secondary" onClick={onClose} type="button">{t('commonCancel')}</button>
            <button className="action-button primary" disabled={busy} type="submit">{busy ? t('commonSavingDots') : t('invSend')}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
