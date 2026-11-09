'use client';

import { useEffect, useMemo, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { useI18n } from '../i18n';
import { getClients, getObjects, type Client, type WorkObject } from '../../lib/clients';

/** All objects of all clients. Objects are added and edited inside the client card. */
export default function ObjectsPage() {
  const { t } = useI18n();
  const [objects, setObjects] = useState<WorkObject[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getObjects(), getClients()])
      .then(([objectsResponse, clientsResponse]) => {
        setObjects(objectsResponse.data);
        setClients(clientsResponse.data);
      })
      .catch((loadError) => setError(t('commonLoadFailed', { error: loadError instanceof Error ? loadError.message : t('commonUnknownError') })))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return objects.filter((object) => object.status !== 'inactive'
      && (!clientId || String(object.client_id) === clientId)
      && (!needle || `${object.name} ${object.address || ''} ${object.client_name || ''}`.toLowerCase().includes(needle)));
  }, [objects, clientId, query]);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title={t('objects')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('objEyebrow')}</p>
            <h1>{t('objects')}</h1>
            <p className="hero-text">{t('objHeroList')}</p>
          </div>
          <a className="action-link" href="/clients">{t('objManageInClients')}</a>
        </section>

        {error ? <p className="notice error" role="alert">{error}</p> : null}

        <section className="panel">
          <div className="filter-bar">
            <label>{t('commonCustomer')}
              <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
                <option value="">{t('durAllCustomers')}</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </label>
            <label>{t('commonSearch')}
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('objSearch')} />
            </label>
          </div>

          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('objName')}</th>
                  <th>{t('objAddress')}</th>
                  <th>{t('commonCustomer')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((object) => (
                  <tr key={object.id}>
                    <td><strong>{object.name}</strong></td>
                    <td>
                      {object.address ? (
                        <a className="text-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(object.address)}`} rel="noreferrer" target="_blank">{object.address}</a>
                      ) : '—'}
                    </td>
                    <td>{object.client_name || '—'}</td>
                    <td><a className="small-button" href={`/work-orders/new?client=${object.client_id}&object=${object.id}`}>{t('asgCreate')}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading ? <p className="hint">{t('commonLoadingDots')}</p> : null}
          {!loading && !rows.length ? <p className="empty-state">{t('objNone')}</p> : null}
        </section>
      </RoleGuard>
    </main>
  );
}
