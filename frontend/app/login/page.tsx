'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { login, register } from '../../lib/auth';
import { useI18n } from '../i18n';
const roleKeys: Record<string, string> = {
  employee: 'roleEmployee',
  manager: 'roleManager',
  admin: 'roleAdmin',
};

function homeForRole(role: string) {
  if (role === 'admin') return '/admin/';
  if (role === 'manager') return '/manager-dashboard/';
  return '/employee/';
}

export default function LoginPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('Admin User');
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin12345!');
  const [role, setRole] = useState('admin');
  const [message, setMessage] = useState(t('loginReady'));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.classList.add('auth-body');

    return () => {
      document.body.classList.remove('auth-body');
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setMessage(mode === 'login' ? t('loginChecking') : t('loginCreating'));

    try {
      const response = mode === 'login'
        ? await login(email, password)
        : await register({ name, email, password, role });

      const target = homeForRole(response.data.role);
      setMessage(t('loginLoggedAs', { name: response.data.name, role: t(roleKeys[response.data.role] || response.data.role), open: t('loginOpening') }));

      window.location.href = target;
    } catch (error) {
      const fallback = mode === 'login' ? t('loginFailed') : t('loginRegisterFailed');
      setMessage(error instanceof Error && error.message ? `${fallback} ${error.message}` : fallback);
      setSaving(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" style={{ width: 'min(520px, 100%)' }}>
        <div className="auth-card-head">
          <p className="eyebrow">{t('loginSecureAccess')}</p>
          <h2>{mode === 'login' ? t('loginTitle') : t('loginRegisterTitle')}</h2>
          <p>{mode === 'login' ? t('loginSubtitle') : t('loginRegisterSubtitle')}</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' ? (
            <label className="auth-field">
              <span>{t('loginName')}</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t('loginNamePlaceholder')} />
            </label>
          ) : null}

          <label className="auth-field">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" />
          </label>

          <label className="auth-field">
            <span>{t('loginPassword')}</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t('loginPasswordPlaceholder')} type="password" autoComplete="current-password" />
          </label>

          {mode === 'register' ? (
            <label className="auth-field">
              <span>{t('loginRole')}</span>
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="employee">{t('roleEmployee')}</option>
                <option value="manager">{t('roleManager')}</option>
                <option value="admin">{t('roleAdmin')}</option>
              </select>
            </label>
          ) : null}

          <button className="auth-submit" type="submit" disabled={saving}>
            <span>{saving ? t('loginPleaseWait') : mode === 'login' ? t('loginButton') : t('loginCreateUserButton')}</span>
            <small>→</small>
          </button>
        </form>

        <div className="auth-bottom">
          <button className="auth-mode-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} type="button" disabled={saving}>
            {mode === 'login' ? t('loginCreateAccount') : t('loginBackToLogin')}
          </button>
          <p className={`auth-message ${message.includes(t('loginFailed')) || message.includes(t('loginRegisterFailed')) ? 'error' : ''}`}>{message}</p>
        </div>
      </section>
    </main>
  );
}
