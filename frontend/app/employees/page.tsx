'use client';

import { useEffect, useMemo, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { useI18n } from '../i18n';
import { employeeProfileName, getEmployeeProfiles, type EmployeeProfile } from '../../lib/employee-profiles';

export default function EmployeesPage() {
  const { t, fmt } = useI18n();
  const [items, setItems] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    getEmployeeProfiles()
      .then((response) => setItems(response.data))
      .catch((loadError) => setError(t('commonLoadFailed', { error: loadError instanceof Error ? loadError.message : t('commonUnknownError') })))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = [...items].sort((a, b) => employeeProfileName(a).localeCompare(employeeProfileName(b)));
    return needle ? list.filter((item) => `${employeeProfileName(item)} ${item.home_location || ''} ${item.phone || ''}`.toLowerCase().includes(needle)) : list;
  }, [items, query]);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['admin']} title={t('employees')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('empEyebrow')}</p>
            <h1>{t('employees')}</h1>
            <p className="hero-text">{t('empListHero')}</p>
          </div>
          <a className="action-link" href="/employees/new">{t('empNewTitle')}</a>
        </section>

        {error ? <p className="notice error" role="alert">{error}</p> : null}

        <section className="panel">
          <div className="field-panel-head split-head">
            <h2>{t('empListTitle', { count: filtered.length })}</h2>
            <input className="search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('commonSearch')} aria-label={t('commonSearch')} />
          </div>
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('commonName')}</th>
                  <th>{t('commonPhone')}</th>
                  <th>{t('empHomeLocation')}</th>
                  <th className="num">{t('empWorkRate')}</th>
                  <th className="num">{t('empTravelRate')}</th>
                  <th className="num">{t('empSurcharges')}</th>
                  <th>{t('commonStatus')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{employeeProfileName(item)}</strong></td>
                    <td>{item.phone || '—'}</td>
                    <td>{item.home_location || '—'}</td>
                    <td className="num">{fmt.money(item.standard_hourly_rate)}</td>
                    <td className="num">{fmt.money(item.travel_hourly_rate)}</td>
                    <td className="num">
                      {t('empSurchargeShort', {
                        night: fmt.number(item.night_coefficient, 2),
                        sunday: fmt.number(item.sunday_coefficient, 2),
                        holiday: fmt.number(item.holiday_coefficient, 2),
                      })}
                    </td>
                    <td>{fmt.status(item.is_active === false || item.is_active === 0 ? 'inactive' : 'active')}</td>
                    <td><a className="small-button" href={`/employees/${item.id}/edit`}>{t('commonEdit')}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !filtered.length ? <p className="hint">{t('empNone')}</p> : null}
          {loading ? <p className="hint">{t('commonLoadingDots')}</p> : null}
        </section>
      </RoleGuard>
    </main>
  );
}
