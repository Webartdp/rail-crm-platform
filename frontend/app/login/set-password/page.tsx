'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { getLinkInfo, setPasswordFromLink, type LinkInfo } from '../../../lib/auth';
import { LanguageSwitcher, useI18n } from '../../i18n';

function homeForRole(role: string) {
  if (role === 'admin') return '/admin/';
  if (role === 'manager') return '/manager-dashboard/';
  return '/employee/';
}

export default function SetPasswordPage() {
  const { t } = useI18n();
  const [token, setToken] = useState('');
  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkError, setLinkError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.classList.add('auth-body');
    const value = new URLSearchParams(window.location.search).get('token') || '';
    setToken(value);

    if (!value) {
      setLinkError(t('setPwNoToken'));
      setLoading(false);
    } else {
      getLinkInfo(value)
        .then((response) => setInfo(response.data))
        .catch((error) => setLinkError(error instanceof Error ? error.message : t('setPwInvalid')))
        .finally(() => setLoading(false));
    }

    return () => {
      document.body.classList.remove('auth-body');
    };
  }, []);

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
      const response = await setPasswordFromLink(token, password, confirmation);
      setMessage(t('setPwDone'));
      window.location.href = homeForRole(response.data.role);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('commonUnknownError'));
      setIsError(true);
      setSaving(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" style={{ width: 'min(520px, 100%)' }}>
        <LanguageSwitcher className="auth-language" />

        <div className="auth-card-head">
          <p className="eyebrow">{t('loginSecureAccess')}</p>
          <h2>{info?.type === 'reset' ? t('setPwResetTitle') : t('setPwInviteTitle')}</h2>
          {info ? <p>{t('setPwFor', { name: info.name, email: info.email })}</p> : null}
        </div>

        {loading ? <p className="hint">{t('commonLoadingDots')}</p> : null}

        {!loading && linkError ? (
          <div className="auth-bottom">
            <p className="auth-message error" role="alert">{linkError}</p>
            <a className="auth-mode-button" href="/login">{t('loginBackToLogin')}</a>
          </div>
        ) : null}

        {!loading && info ? (
          <>
            <form className="auth-form" onSubmit={submit}>
              <label className="auth-field">
                <span>{t('setPwNew')}</span>
                <input autoComplete="new-password" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
              </label>
              <label className="auth-field">
                <span>{t('setPwRepeat')}</span>
                <input autoComplete="new-password" minLength={8} onChange={(event) => setConfirmation(event.target.value)} required type="password" value={confirmation} />
              </label>
              <p className="auth-hint">{t('passwordRules')}</p>

              <button className="auth-submit" type="submit" disabled={saving}>
                <span>{saving ? t('loginPleaseWait') : t('setPwSave')}</span>
                <small>→</small>
              </button>
            </form>

            {message ? <div className="auth-bottom"><p className={`auth-message ${isError ? 'error' : ''}`} role={isError ? 'alert' : 'status'}>{message}</p></div> : null}
          </>
        ) : null}
      </section>
    </main>
  );
}
