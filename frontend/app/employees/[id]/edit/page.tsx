'use client';

import { useEffect, useState } from 'react';
import { getEmployeeProfile, updateEmployeeProfile } from '../../../../lib/employee-profiles';

export default function EditEmployeePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [rate, setRate] = useState('0');
  const [travelRate, setTravelRate] = useState('0');
  const [night, setNight] = useState('1');
  const [sunday, setSunday] = useState('1');
  const [holiday, setHoliday] = useState('1');
  const [homeLocation, setHomeLocation] = useState('');
  const [message, setMessage] = useState('Loading employee...');

  useEffect(() => {
    getEmployeeProfile(id)
      .then((response) => {
        const item = response.data;
        setFirstName(item.first_name || '');
        setLastName(item.last_name || '');
        setPhone(item.phone || '');
        setRate(String(item.standard_hourly_rate || '0'));
        setTravelRate(String(item.travel_hourly_rate || '0'));
        setNight(String(item.night_coefficient || '1'));
        setSunday(String(item.sunday_coefficient || '1'));
        setHoliday(String(item.holiday_coefficient || '1'));
        setHomeLocation(item.home_location || '');
        setMessage('Loaded from API.');
      })
      .catch(() => setMessage('API not available.'));
  }, [id]);

  async function submit() {
    try {
      await updateEmployeeProfile(id, {
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
      setMessage('Employee profile updated.');
    } catch (error) {
      setMessage('API not available. Employee profile was not updated.');
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Employee</p>
          <h1>Edit Employee #{id}</h1>
          <p className="hero-text">Update employee rates and coefficients.</p>
        </div>
        <div className="status-pill">Editable</div>
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
        <button className="action-button primary" onClick={submit} type="button">Save changes</button>
        <p className="hint">{message}</p>
      </section>
    </main>
  );
}
