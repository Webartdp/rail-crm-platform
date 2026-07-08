'use client';

import { useEffect, useState } from 'react';
import { getEmployeeProfiles, type EmployeeProfile } from '../../lib/employee-profiles';

const fallback = [
  { id: 1, first_name: 'Max', last_name: 'Müller', standard_hourly_rate: '28.00', night_coefficient: '1.250', sunday_coefficient: '1.500', holiday_coefficient: '2.000', home_location: 'Dresden', is_active: true },
];

export default function EmployeesPage() {
  const [items, setItems] = useState<EmployeeProfile[]>(fallback);
  const [message, setMessage] = useState('Demo fallback data.');

  useEffect(() => {
    getEmployeeProfiles()
      .then((response) => {
        setItems(response.data.length ? response.data : fallback);
        setMessage(response.data.length ? 'Loaded from API.' : 'No employee profiles yet. Showing demo fallback.');
      })
      .catch(() => setMessage('API not available. Showing demo fallback.'));
  }, []);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Employees</p>
          <h1>Employees</h1>
          <p className="hero-text">Employee profiles with personal tariff settings.</p>
        </div>
        <a className="action-link" href="/employees/new">New Employee</a>
      </section>

      <section className="panel">
        <p className="hint">{message}</p>
        <div className="table-row"><strong>Name</strong><strong>Rate</strong><strong>Coefficients</strong></div>
        {items.map((item) => (
          <div className="table-row" key={item.id}>
            <span>{item.first_name} {item.last_name}</span>
            <span>{item.standard_hourly_rate} / h</span>
            <span>N {item.night_coefficient} / S {item.sunday_coefficient} / H {item.holiday_coefficient}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
