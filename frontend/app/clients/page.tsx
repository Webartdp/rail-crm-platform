'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { useI18n } from '../i18n';
import {
  createClient,
  createObject,
  deleteClient,
  deleteObject,
  getClients,
  updateClient,
  updateObject,
  type Client,
  type WorkObject,
} from '../../lib/clients';

type Notice = { tone: 'success' | 'error'; text: string } | null;

const emptyClient = { name: '', address: '', contact_person: '', email: '', phone: '', notes: '' };
const emptyObject = { name: '', address: '', notes: '' };

/** Clients with their objects: master data the work orders are planned on. */
export default function ClientsPage() {
  const { t } = useI18n();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [clientForm, setClientForm] = useState(emptyClient);
  const [editingClient, setEditingClient] = useState<number | 'new' | null>(null);
  const [objectForm, setObjectForm] = useState(emptyObject);
  const [editingObject, setEditingObject] = useState<number | 'new' | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  async function load(keepSelection = true) {
    try {
      const response = await getClients();
      setClients(response.data);
      if (!keepSelection || !response.data.some((client) => client.id === selectedId)) {
        setSelectedId(response.data.find((client) => client.status !== 'inactive')?.id ?? response.data[0]?.id ?? null);
      }
    } catch (error) {
      setNotice({ tone: 'error', text: t('commonLoadFailed', { error: error instanceof Error ? error.message : t('commonUnknownError') }) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(false);
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return clients.filter((client) => (showInactive || client.status !== 'inactive')
      && (!needle || `${client.name} ${client.address || ''} ${client.objects.map((object) => `${object.name} ${object.address || ''}`).join(' ')}`.toLowerCase().includes(needle)));
  }, [clients, query, showInactive]);

  const selected = clients.find((client) => client.id === selectedId) || null;
  const objects = (selected?.objects || []).filter((object) => showInactive || object.status !== 'inactive');

  async function run(action: () => Promise<{ message: string }>, after?: () => void) {
    setSaving(true);
    setNotice(null);
    try {
      const response = await action();
      setNotice({ tone: 'success', text: response.message });
      after?.();
      await load();
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : t('commonUnknownError') });
    } finally {
      setSaving(false);
    }
  }

  function startClient(client: Client | null) {
    setEditingClient(client ? client.id : 'new');
    setClientForm(client ? {
      name: client.name,
      address: client.address || '',
      contact_person: client.contact_person || '',
      email: client.email || '',
      phone: client.phone || '',
      notes: client.notes || '',
    } : emptyClient);
  }

  function submitClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { ...clientForm, email: clientForm.email || null };
    if (editingClient === 'new') {
      run(async () => {
        const response = await createClient(input);
        setSelectedId(response.data.id);
        return response;
      }, () => setEditingClient(null));
    } else if (editingClient) {
      run(() => updateClient(editingClient, input), () => setEditingClient(null));
    }
  }

  function startObject(object: WorkObject | null) {
    setEditingObject(object ? object.id : 'new');
    setObjectForm(object ? { name: object.name, address: object.address || '', notes: object.notes || '' } : emptyObject);
  }

  function submitObject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const input = { client_id: selected.id, ...objectForm };
    if (editingObject === 'new') {
      run(() => createObject(input), () => setEditingObject(null));
    } else if (editingObject) {
      run(() => updateObject(editingObject, input), () => setEditingObject(null));
    }
  }

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title={t('clients')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('cliEyebrow')}</p>
            <h1>{t('clients')}</h1>
            <p className="hero-text">{t('cliHero')}</p>
          </div>
          <button className="action-button primary" onClick={() => startClient(null)} type="button">{t('cliNew')}</button>
        </section>

        {notice ? <p className={`notice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p> : null}

        {editingClient ? (
          <form className="panel" onSubmit={submitClient}>
            <h2>{editingClient === 'new' ? t('cliNew') : t('cliEdit')}</h2>
            <div className="form-grid">
              <label>{t('commonName')}<input required value={clientForm.name} onChange={(event) => setClientForm({ ...clientForm, name: event.target.value })} placeholder={t('cliNamePlaceholder')} /></label>
              <label>{t('commonAddress')}<input value={clientForm.address} onChange={(event) => setClientForm({ ...clientForm, address: event.target.value })} /></label>
              <label>{t('cliContact')}<input value={clientForm.contact_person} onChange={(event) => setClientForm({ ...clientForm, contact_person: event.target.value })} /></label>
              <label>{t('commonPhone')}<input type="tel" value={clientForm.phone} onChange={(event) => setClientForm({ ...clientForm, phone: event.target.value })} /></label>
              <label>{t('commonEmail')}<input type="email" value={clientForm.email} onChange={(event) => setClientForm({ ...clientForm, email: event.target.value })} /></label>
              <label className="wide-field">{t('commonNotes')}<textarea value={clientForm.notes} onChange={(event) => setClientForm({ ...clientForm, notes: event.target.value })} /></label>
            </div>
            <div className="form-actions">
              <button className="action-button secondary" onClick={() => setEditingClient(null)} type="button">{t('commonCancel')}</button>
              <button className="action-button primary" disabled={saving} type="submit">{saving ? t('commonSavingDots') : t('commonSave')}</button>
            </div>
          </form>
        ) : null}

        <div className="master-detail">
          <section className="panel master-list">
            <div className="master-list-head">
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('cliSearch')} aria-label={t('commonSearch')} />
              <label className="checkbox-label"><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} /><span>{t('cliShowInactive')}</span></label>
            </div>
            {loading ? <p className="hint">{t('commonLoadingDots')}</p> : null}
            {!loading && !visible.length ? <p className="hint">{t('cliNone')}</p> : null}
            <ul className="master-items">
              {visible.map((client) => (
                <li key={client.id}>
                  <button className={client.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(client.id)} type="button">
                    <strong>{client.name}</strong>
                    <span>{t('cliObjectsCount', { count: client.objects.filter((object) => object.status !== 'inactive').length })}{client.status === 'inactive' ? ` · ${t('status_inactive')}` : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel master-detail-body">
            {!selected ? <p className="hint">{t('cliPick')}</p> : (
              <>
                <header className="detail-head">
                  <div>
                    <h2>{selected.name}</h2>
                    <p className="hint">
                      {[selected.address, selected.contact_person, selected.phone, selected.email].filter(Boolean).join(' · ') || t('cliNoContact')}
                    </p>
                  </div>
                  <div className="row-actions">
                    <button className="small-button" onClick={() => startClient(selected)} type="button">{t('commonEdit')}</button>
                    {selected.status === 'inactive' ? (
                      <button className="small-button" onClick={() => run(() => updateClient(selected.id, { name: selected.name, status: 'active' }))} type="button">{t('admActivate')}</button>
                    ) : (
                      <button className="small-button danger" onClick={() => { if (window.confirm(t('cliDeleteConfirm', { name: selected.name }))) run(() => deleteClient(selected.id)); }} type="button">{t('commonDelete')}</button>
                    )}
                  </div>
                </header>

                <div className="detail-subhead">
                  <h3>{t('objects')}</h3>
                  <button className="action-button primary" onClick={() => startObject(null)} type="button">{t('objNew')}</button>
                </div>
                <p className="hint">{t('objAddressHint')}</p>

                {editingObject ? (
                  <form className="inline-form" onSubmit={submitObject}>
                    <div className="form-grid">
                      <label>{t('objName')}<input required value={objectForm.name} onChange={(event) => setObjectForm({ ...objectForm, name: event.target.value })} placeholder={t('objNamePlaceholder')} /></label>
                      <label>{t('objAddress')}<input required value={objectForm.address} onChange={(event) => setObjectForm({ ...objectForm, address: event.target.value })} placeholder={t('objAddressPlaceholder')} /></label>
                      <label className="wide-field">{t('commonNotes')}<textarea value={objectForm.notes} onChange={(event) => setObjectForm({ ...objectForm, notes: event.target.value })} placeholder={t('objNotesPlaceholder')} /></label>
                    </div>
                    <div className="form-actions">
                      <button className="action-button secondary" onClick={() => setEditingObject(null)} type="button">{t('commonCancel')}</button>
                      <button className="action-button primary" disabled={saving} type="submit">{saving ? t('commonSavingDots') : t('commonSave')}</button>
                    </div>
                  </form>
                ) : null}

                {!objects.length ? <p className="empty-state">{t('objNoneForClient')}</p> : (
                  <div className="data-table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{t('objName')}</th>
                          <th>{t('objAddress')}</th>
                          <th>{t('commonNotes')}</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {objects.map((object) => (
                          <tr key={object.id}>
                            <td><strong>{object.name}</strong>{object.status === 'inactive' ? <><br /><small className="hint">{t('status_inactive')}</small></> : null}</td>
                            <td>
                              {object.address ? (
                                <a className="text-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(object.address)}`} rel="noreferrer" target="_blank">{object.address}</a>
                              ) : '—'}
                            </td>
                            <td>{object.notes || '—'}</td>
                            <td>
                              <div className="row-actions">
                                <a className="small-button" href={`/work-orders/new?client=${selected.id}&object=${object.id}`}>{t('asgCreate')}</a>
                                <button className="small-button" onClick={() => startObject(object)} type="button">{t('commonEdit')}</button>
                                <button className="small-button danger" onClick={() => { if (window.confirm(t('objDeleteConfirm', { name: object.name }))) run(() => deleteObject(object.id)); }} type="button">{t('commonDelete')}</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </RoleGuard>
    </main>
  );
}
