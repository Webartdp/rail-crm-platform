'use client';

import { useState } from 'react';
import { createEmployeeProfile } from '../../../lib/employee-profiles';

export default function NewEmployeePage() {
  const [firstName, setFirstName] = useState('Max');
  const [lastName, setLastName] = useState('Müller');
  const [phone, setPhone] = useState('+49 000 000000');
  const [rate, setRate] = useState('28');
  const [travelRate, setTravelRate] = useState('0');
  const [night, setNight] = useState('1.25');
  const [sunday, setSunday] = useState('1.5');
  const [holiday, setHoliday] = useState('2');
  const [homeLocation, setHomeLocation] = useState('Dresden');
  const [message, setMessage] = useState('Bereit.');

  async function submit() {
    try {
      await createEmployeeProfile({
        first_name: firstName,
        last_name: lastName,
        phone,
        standard_hourly_rate: Number(rate),
        travel_hourly_rate: Number(travelRate),
        night_coefficient: Number(night),
        sunday_coefficient: Number(sunday),
        holiday_coefficient: Number(holiday),
        home_location: homeLocation,
      });
      setMessage('Employee profile gespeichert.');
    } catch (error) {
      setMessage('API nicht erreichbar. Employee profile wurde nicht gespeichert.');
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Employee</p>
          <h1>New Employee</h1>
          <p className="hero-text">Create employee profile with personal tariff settings.</p>
        </div>
        <div className="status-pill">Tariff</div>
      </section>

      <section className="panel">
        <div className="form-grid">
          <label>First name<input value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
          <label>Last name<input value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
          <label>Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          <label>Work hourly rate<input value={rate} onChange={(event) => setRate(event.target.value)} /></label>
          <label>Travel hourly rate<input value={travelRate} onChange={(event) => setTravelRate(event.target.value)} /></label>
          <label>Night coefficient<input value={night} onChange={(event) => setNight(event.target.value)} /></label>
          <label>Sunday coefficient<input value={sunday} onChange={(event) => setSunday(event.target.value)} /></label>
          <label>Holiday coefficient<input value={holiday} onChange={(event) => setHoliday(event.target.value)} /></label>
          <label>Home location<input value={homeLocation} onChange={(event) => setHomeLocation(event.target.value)} /></label>
        </div>
        <button className="action-button primary" onClick={submit} type="button">Employee speichern</button>
        <p className="hint">{message}</p>
      </section>
    </main>
  );
}
