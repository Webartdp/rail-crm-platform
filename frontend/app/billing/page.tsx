'use client';

import { useEffect, useMemo, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { useI18n } from '../i18n';
import { createInvoiceDraft, downloadInvoicePdf, getBillable, getInvoices, type BillableGroup, type Invoice } from '../../lib/invoices';

const STATUS_CLASS: Record<string, string> = { draft: 'is-progress', sent: 'is-waiting', paid: 'is-approved' };

export default function BillingPage() {
  const { t, fmt } = useI18n();
  const [groups, setGroups] = useState<BillableGroup[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [billable, list] = await Promise.all([getBillable(), getInvoices()]);
      setGroups(billable.data);
      setInvoices(list.data);
    } catch (error) {
      setNotice({ tone: 'error', text: t('commonLoadFailed', { error: error instanceof Error ? error.message : t('commonUnknownError') }) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const openAmount = useMemo(() => groups.reduce((sum, group) => sum + group.amount, 0), [groups]);
  const unpaid = useMemo(() => invoices.filter((invoice) => invoice.status === 'sent').reduce((sum, invoice) => sum + Number(invoice.gross_amount || 0), 0), [invoices]);

  async function create(group: BillableGroup) {
    const key = String(group.client_id ?? 'none');
    setBusy(key);
    setNotice(null);
    try {
      const response = await createInvoiceDraft({ client_id: group.client_id });
      window.location.href = `/billing/invoices/${response.data.id}`;
    } catch (error) {
      setNotice({ tone: 'error', text: t('billCreateFailed', { error: error instanceof Error ? error.message : t('commonUnknownError') }) });
      setBusy(null);
    }
  }

  async function pdf(invoice: Invoice) {
    try {
      await downloadInvoicePdf(invoice);
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : t('commonUnknownError') });
    }
  }

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title={t('billTitle')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('billEyebrow')}</p>
            <h1>{t('billTitle')}</h1>
            <p className="hero-text">{t('billHeroNew')}</p>
          </div>
          <a className="action-button secondary" href="/costs">{t('billCostDetails')}</a>
        </section>

        {notice ? <p className={`notice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p> : null}

        <section className="ts-summary">
          <div className="ts-total">
            <span>{t('billReadyNet')}</span>
            <strong>{fmt.money(openAmount)}</strong>
            <small>{t('billReadyClients', { count: groups.length })}</small>
          </div>
          <dl className="ts-zones">
            <div><dt>{t('billInvoicesDraft')}</dt><dd>{invoices.filter((invoice) => invoice.status === 'draft').length}</dd></div>
            <div><dt>{t('billInvoicesOpen')}</dt><dd>{fmt.money(unpaid)}</dd></div>
            <div><dt>{t('billInvoicesPaid')}</dt><dd>{invoices.filter((invoice) => invoice.status === 'paid').length}</dd></div>
          </dl>
        </section>

        <section className="panel">
          <h2>{t('billReadyTitle')}</h2>
          <p className="hint">{t('billReadyHint')}</p>
          {!loading && !groups.length ? <p className="empty-state">{t('billNothingReady')}</p> : null}
          {groups.length ? (
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('commonCustomer')}</th>
                    <th>{t('tsPeriod')}</th>
                    <th className="num">{t('billPositions')}</th>
                    <th className="num">{t('billHours')}</th>
                    <th className="num">{t('billNet')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <tr key={String(group.client_id)}>
                      <td><strong>{group.client_name || t('billNoClient')}</strong></td>
                      <td>{fmt.date(group.from)} – {fmt.date(group.to)}</td>
                      <td className="num">{group.lines}</td>
                      <td className="num">{fmt.number(group.hours, 2)}</td>
                      <td className="num"><strong>{fmt.money(group.amount)}</strong></td>
                      <td className="num">
                        <button className="action-button primary" disabled={busy !== null} onClick={() => create(group)} type="button">
                          {busy === String(group.client_id ?? 'none') ? t('billCreating') : t('billCreateInvoice')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="panel">
          <h2>{t('billInvoicesTitle')}</h2>
          {!loading && !invoices.length ? <p className="empty-state">{t('billNoInvoices')}</p> : null}
          {invoices.length ? (
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('billNumber')}</th>
                    <th>{t('commonCustomer')}</th>
                    <th>{t('commonDate')}</th>
                    <th>{t('billDue')}</th>
                    <th className="num">{t('billGross')}</th>
                    <th>{t('commonStatus')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td><a className="text-link strong" href={`/billing/invoices/${invoice.id}`}>{invoice.number}</a></td>
                      <td>{invoice.client_name || '—'}</td>
                      <td>{fmt.date(invoice.issued_at)}</td>
                      <td>{fmt.date(invoice.due_at)}</td>
                      <td className="num"><strong>{fmt.money(invoice.gross_amount ?? invoice.total_amount)}</strong></td>
                      <td><span className={`report-status-badge ${STATUS_CLASS[invoice.status] || ''}`}>{fmt.status(invoice.status)}</span></td>
                      <td><button className="small-button" onClick={() => pdf(invoice)} type="button">PDF</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
        {loading ? <p className="hint">{t('commonLoadingDots')}</p> : null}
      </RoleGuard>
    </main>
  );
}
