'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { forgotPassword, login } from '../../lib/auth';
import { LanguageSwitcher, useI18n } from '../i18n';

function homeForRole(role: string) {
  if (role === 'admin') return '/admin/';
  if (role === 'manager') return '/manager-dashboard/';
  return '/employee/';
}

type Mode = 'login' | 'forgot';
type Tone = 'neutral' | 'error' | 'success';

export default function LoginPage() {
  const { t, fmt } = useI18n();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<Tone>('neutral');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.classList.add('auth-body');

    return () => {
      document.body.classList.remove('auth-body');
    };
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setMessage('');
    setTone('neutral');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setTone('neutral');

    if (mode === 'forgot') {
      setMessage(t('loginSendingLink'));
      try {
        const response = await forgotPassword(email);
        setMessage(response.message);
        setTone('success');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : t('commonUnknownError'));
        setTone('error');
      } finally {
        setSaving(false);
      }
      return;
    }

    setMessage(t('loginChecking'));

    try {
      const response = await login(email, password);
      setMessage(t('loginLoggedAs', { name: response.data.name, role: fmt.role(response.data.role), open: t('loginOpening') }));
      setTone('success');
      window.location.href = homeForRole(response.data.role);
    } catch (error) {
      setMessage(error instanceof Error && error.message ? error.message : t('loginFailed'));
      setTone('error');
      setSaving(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" style={{ width: 'min(520px, 100%)' }}>
        <LanguageSwitcher className="auth-language" />

        <div className="auth-card-head">
          <p className="eyebrow">{t('loginSecureAccess')}</p>
          <h2>{mode === 'login' ? t('loginTitle') : t('loginForgotTitle')}</h2>
          <p>{mode === 'login' ? t('loginSubtitle') : t('loginForgotSubtitle')}</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label className="auth-field">
            <span>{t('commonEmail')}</span>
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@firma.de"
              required
              type="email"
              value={email}
            />
          </label>

          {mode === 'login' ? (
            <label className="auth-field">
              <span>{t('loginPassword')}</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('loginPasswordPlaceholder')}
                required
                type="password"
                value={password}
              />
            </label>
          ) : null}

          <button className="auth-submit" type="submit" disabled={saving}>
            <span>{saving ? t('loginPleaseWait') : mode === 'login' ? t('loginButton') : t('loginSendLink')}</span>
            <small>→</small>
          </button>
        </form>

        <div className="auth-bottom">
          <button className="auth-mode-button" onClick={() => switchMode(mode === 'login' ? 'forgot' : 'login')} type="button" disabled={saving}>
            {mode === 'login' ? t('loginForgotLink') : t('loginBackToLogin')}
          </button>
          {message ? <p className={`auth-message ${tone === 'error' ? 'error' : ''}`} role={tone === 'error' ? 'alert' : 'status'}>{message}</p> : null}
          {mode === 'login' ? <p className="auth-hint">{t('loginNoAccountHint')}</p> : null}
        </div>
      </section>
    </main>
  );
}
