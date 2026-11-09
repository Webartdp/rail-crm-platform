'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { changePassword } from '../../lib/auth';
import { useI18n } from '../i18n';

export default function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (password !== confirmation) {
      setMessage(t('setPwMismatch'));
      setIsError(true);
      return;
    }

    setSaving(true);
    setIsError(false);
    setMessage(t('commonSavingDots'));

    try {
      const response = await changePassword(current, password, confirmation);
      setMessage(response.message);
      setDone(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('commonUnknownError'));
      setIsError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="change-password-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="change-password-title">{t('changePasswordTitle')}</h2>
        {done ? (
          <>
            <p className="notice success" role="status">{message}</p>
            <button className="action-button primary" onClick={onClose} type="button">{t('commonClose')}</button>
          </>
        ) : (
          <form className="dialog-form" onSubmit={submit}>
            <label>{t('changePasswordCurrent')}
              <input autoComplete="current-password" required type="password" value={current} onChange={(event) => setCurrent(event.target.value)} />
            </label>
            <label>{t('setPwNew')}
              <input autoComplete="new-password" minLength={8} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <label>{t('setPwRepeat')}
              <input autoComplete="new-password" minLength={8} required type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </label>
            <p className="hint">{t('passwordRules')} {t('changePasswordOtherDevices')}</p>
            {message ? <p className={`notice ${isError ? 'error' : 'success'}`} role={isError ? 'alert' : 'status'}>{message}</p> : null}
            <div className="dialog-actions">
              <button className="action-button secondary" onClick={onClose} type="button">{t('commonCancel')}</button>
              <button className="action-button primary" disabled={saving} type="submit">{saving ? t('commonSavingDots') : t('commonSave')}</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
