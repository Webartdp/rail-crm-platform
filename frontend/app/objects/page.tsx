'use client';

import { useEffect, useMemo, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { useI18n } from '../i18n';
import { getWorkOrders, type WorkOrder } from '../../lib/work-orders';
import { orderDetails } from '../../lib/order-details';

type ObjectRow = { key: string; name: string; address: string; customers: Set<string>; orders: number; open: number };

const CLOSED = ['closed', 'invoiced', 'cancelled', 'completed', 'done'];

export default function ObjectsPage() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    getWorkOrders()
      .then((response) => setOrders(response.data))
      .catch((loadError) => setError(t('commonLoadFailed', { error: loadError instanceof Error ? loadError.message : t('commonUnknownError') })))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const map = new Map<string, ObjectRow>();
    orders.forEach((order) => {
      const details = orderDetails(order);
      const name = (details.object_name || '').trim();
      if (!name) return;
      const address = (details.object_address || '').trim();
      const key = `${name}__${address}`;
      const row = map.get(key) || { key, name, address, customers: new Set<string>(), orders: 0, open: 0 };
      if (details.customer_name) row.customers.add(details.customer_name);
      row.orders += 1;
      if (!CLOSED.includes(order.status || '')) row.open += 1;
      map.set(key, row);
    });
    const needle = query.trim().toLowerCase();
    return [...map.values()]
      .filter((row) => !needle || `${row.name} ${row.address} ${[...row.customers].join(' ')}`.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [orders, query]);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title={t('objects')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('objEyebrow')}</p>
            <h1>{t('objects')}</h1>
            <p className="hero-text">{t('objHero')}</p>
          </div>
          <a className="action-link" href="/work-orders/new">{t('asgCreate')}</a>
        </section>

        {error ? <p className="notice error" role="alert">{error}</p> : null}

        <section className="panel">
          <div className="field-panel-head split-head">
            <h2>{t('objCount', { count: rows.length })}</h2>
            <input className="search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('commonSearch')} aria-label={t('commonSearch')} />
          </div>
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('commonObject')}</th>
                  <th>{t('commonAddress')}</th>
                  <th>{t('clients')}</th>
                  <th className="num">{t('assignments')}</th>
                  <th className="num">{t('cliOpenOrders')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td><strong>{row.name}</strong></td>
                    <td>{row.address || '—'}</td>
                    <td>{[...row.customers].join(', ') || '—'}</td>
                    <td className="num">{row.orders}</td>
                    <td className="num">{row.open}</td>
                    <td>
                      {row.address ? (
                        <a className="small-button" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.address)}`} rel="noreferrer" target="_blank">{t('mapsMap')}</a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading ? <p className="hint">{t('commonLoadingDots')}</p> : null}
          {!loading && !rows.length ? <p className="hint">{t('objNone')}</p> : null}
        </section>
      </RoleGuard>
    </main>
  );
}
