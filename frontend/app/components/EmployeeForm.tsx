'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import type { EmployeeProfile, EmployeeProfileInput } from '../../lib/employee-profiles';
import { useI18n } from '../i18n';

type Props = {
  initial?: EmployeeProfile | null;
  submitLabel: string;
  onSubmit: (input: EmployeeProfileInput) => Promise<void>;
};

function text(value: unknown, fallback = '') {
  return value === null || value === undefined ? fallback : String(value);
}

/** Employee profile with personal tariff (work/travel rate and surcharges). */
export default function EmployeeForm({ initial, submitLabel, onSubmit }: Props) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    first_name: text(initial?.first_name),
    last_name: text(initial?.last_name),
    phone: text(initial?.phone),
    standard_hourly_rate: text(initial?.standard_hourly_rate, '0'),
    travel_hourly_rate: text(initial?.travel_hourly_rate, '0'),
    night_coefficient: text(initial?.night_coefficient, '1'),
    sunday_coefficient: text(initial?.sunday_coefficient, '1'),
    holiday_coefficient: text(initial?.holiday_coefficient, '1'),
    home_location: text(initial?.home_location),
    is_active: initial ? initial.is_active !== false && initial.is_active !== 0 : true,
  });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value });
  const number = (value: string) => Number(String(value).replace(',', '.')) || 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage(t('commonSavingDots'));
    setIsError(false);

    try {
      await onSubmit({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        standard_hourly_rate: number(form.standard_hourly_rate),
        travel_hourly_rate: number(form.travel_hourly_rate),
        night_coefficient: number(form.night_coefficient),
        sunday_coefficient: number(form.sunday_coefficient),
        holiday_coefficient: number(form.holiday_coefficient),
        home_location: form.home_location.trim(),
        is_active: form.is_active,
      });
      setMessage(t('commonSaved'));
    } catch (error) {
      setMessage(t('commonSaveFailed', { error: error instanceof Error ? error.message : t('commonUnknownError') }));
      setIsError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h2>{t('empPersonal')}</h2>
      <div className="form-grid">
        <label>{t('empFirstName')}<input required value={form.first_name} onChange={set('first_name')} /></label>
        <label>{t('empLastName')}<input required value={form.last_name} onChange={set('last_name')} /></label>
        <label>{t('commonPhone')}<input type="tel" value={form.phone} onChange={set('phone')} /></label>
        <label>{t('empHomeLocation')}<input value={form.home_location} onChange={set('home_location')} placeholder={t('empHomeLocationPlaceholder')} /></label>
        <label className="checkbox-label wide-field">
          <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
          <span>{t('empActiveCheckbox')}</span>
        </label>
      </div>

      <h2 style={{ marginTop: 24 }}>{t('empTariff')}</h2>
      <p className="hint">{t('empTariffHint')}</p>
      <div className="form-grid">
        <label>{t('empWorkRate')}<input inputMode="decimal" value={form.standard_hourly_rate} onChange={set('standard_hourly_rate')} /></label>
        <label>{t('empTravelRate')}<input inputMode="decimal" value={form.travel_hourly_rate} onChange={set('travel_hourly_rate')} /></label>
        <label>{t('empNightCoefficient')}<input inputMode="decimal" value={form.night_coefficient} onChange={set('night_coefficient')} /></label>
        <label>{t('empSundayCoefficient')}<input inputMode="decimal" value={form.sunday_coefficient} onChange={set('sunday_coefficient')} /></label>
        <label>{t('empHolidayCoefficient')}<input inputMode="decimal" value={form.holiday_coefficient} onChange={set('holiday_coefficient')} /></label>
      </div>

      <div style={{ marginTop: 20 }}>
        <button className="action-button primary" disabled={saving} type="submit">{saving ? t('commonSavingDots') : submitLabel}</button>
      </div>
      {message ? <p className={`notice ${isError ? 'error' : 'success'}`} style={{ marginTop: 16 }} role={isError ? 'alert' : 'status'}>{message}</p> : null}
    </form>
  );
}
