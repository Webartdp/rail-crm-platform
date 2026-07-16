'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { login, register } from '../../lib/auth';

const roleLabels: Record<string, string> = {
  employee: 'Сотрудник',
  manager: 'Менеджер',
  admin: 'Администратор',
};

function homeForRole(role: string) {
  if (role === 'admin') return '/admin/';
  if (role === 'manager') return '/manager-dashboard/';
  return '/employee/';
}

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('Admin User');
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin12345!');
  const [role, setRole] = useState('admin');
  const [message, setMessage] = useState('Готово к входу.');
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
    setMessage(mode === 'login' ? 'Проверяем доступ...' : 'Создаём пользователя...');

    try {
      const response = mode === 'login'
        ? await login(email, password)
        : await register({ name, email, password, role });

      const target = homeForRole(response.data.role);
      setMessage(`${response.data.name} вошёл как ${roleLabels[response.data.role] || response.data.role}. Открываю кабинет...`);

      window.location.href = target;
    } catch (error) {
      const fallback = mode === 'login' ? 'Не удалось войти.' : 'Не удалось создать пользователя.';
      setMessage(error instanceof Error && error.message ? `${fallback} ${error.message}` : fallback);
      setSaving(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" style={{ width: 'min(520px, 100%)' }}>
        <div className="auth-card-head">
          <p className="eyebrow">Secure access</p>
          <h2>{mode === 'login' ? 'Вход в CRM' : 'Создать пользователя'}</h2>
          <p>{mode === 'login' ? 'Введите данные администратора или сотрудника.' : 'Временное создание пользователей для разработки.'}</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' ? (
            <label className="auth-field">
              <span>Имя</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Имя пользователя" />
            </label>
          ) : null}

          <label className="auth-field">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" />
          </label>

          <label className="auth-field">
            <span>Пароль</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Введите пароль" type="password" autoComplete="current-password" />
          </label>

          {mode === 'register' ? (
            <label className="auth-field">
              <span>Роль</span>
              <select value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="employee">Сотрудник</option>
                <option value="manager">Менеджер</option>
                <option value="admin">Администратор</option>
              </select>
            </label>
          ) : null}

          <button className="auth-submit" type="submit" disabled={saving}>
            <span>{saving ? 'Подождите...' : mode === 'login' ? 'Войти в систему' : 'Создать пользователя'}</span>
            <small>→</small>
          </button>
        </form>

        <div className="auth-bottom">
          <button className="auth-mode-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} type="button" disabled={saving}>
            {mode === 'login' ? 'Создать аккаунт' : 'Вернуться ко входу'}
          </button>
          <p className={`auth-message ${message.includes('Не удалось') ? 'error' : ''}`}>{message}</p>
        </div>
      </section>
    </main>
  );
}
