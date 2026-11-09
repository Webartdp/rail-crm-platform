'use client';

import { useEffect, useMemo, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { useI18n } from '../i18n';
import { getWorkOrders, type WorkOrder } from '../../lib/work-orders';
import { orderDetails } from '../../lib/order-details';

type ClientRow = { name: string; objects: Set<string>; orders: number; open: number; lastPlanned: string | null };

const CLOSED = ['closed', 'invoiced', 'cancelled', 'completed', 'done'];

export default function ClientsPage() {
  const { t, fmt } = useI18n();
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
    const map = new Map<string, ClientRow>();
    orders.forEach((order) => {
      const details = orderDetails(order);
      const name = (details.customer_name || '').trim();
      if (!name) return;
      const row = map.get(name) || { name, objects: new Set<string>(), orders: 0, open: 0, lastPlanned: null };
      if (details.object_name) row.objects.add(details.object_name);
      row.orders += 1;
      if (!CLOSED.includes(order.status || '')) row.open += 1;
      if (order.planned_start_at && (!row.lastPlanned || order.planned_start_at > row.lastPlanned)) row.lastPlanned = order.planned_start_at;
      map.set(name, row);
    });
    const needle = query.trim().toLowerCase();
    return [...map.values()]
      .filter((row) => !needle || `${row.name} ${[...row.objects].join(' ')}`.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [orders, query]);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title={t('clients')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('cliEyebrow')}</p>
            <h1>{t('clients')}</h1>
            <p className="hero-text">{t('cliHero')}</p>
          </div>
          <a className="action-link" href="/work-orders/new">{t('asgCreate')}</a>
        </section>

        {error ? <p className="notice error" role="alert">{error}</p> : null}

        <section className="panel">
          <div className="field-panel-head split-head">
            <h2>{t('cliCount', { count: rows.length })}</h2>
            <input className="search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('commonSearch')} aria-label={t('commonSearch')} />
          </div>
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('commonCustomer')}</th>
                  <th>{t('objects')}</th>
                  <th className="num">{t('assignments')}</th>
                  <th className="num">{t('cliOpenOrders')}</th>
                  <th>{t('cliLastPlanned')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.name}>
                    <td><strong>{row.name}</strong></td>
                    <td>{[...row.objects].join(', ') || '—'}</td>
                    <td className="num">{row.orders}</td>
                    <td className="num">{row.open}</td>
                    <td>{fmt.date(row.lastPlanned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading ? <p className="hint">{t('commonLoadingDots')}</p> : null}
          {!loading && !rows.length ? <p className="hint">{t('cliNone')}</p> : null}
        </section>
      </RoleGuard>
    </main>
  );
}
