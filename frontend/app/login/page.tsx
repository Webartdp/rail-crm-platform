'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
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
  const [message, setMessage] = useState('Готово.');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setMessage(mode === 'login' ? 'Входим...' : 'Создаём пользователя...');

    try {
      const response = mode === 'login'
        ? await login(email, password)
        : await register({ name, email, password, role });

      const target = homeForRole(response.data.role);
      setMessage(`${response.data.name} вошёл как ${roleLabels[response.data.role] || response.data.role}. Открываю кабинет...`);

      // Hard redirect is intentional: it forces MainNav, RoleGuard and all pages
      // to reload with the fresh token from localStorage. No manual F5 is needed.
      window.location.href = target;
    } catch (error) {
      const fallback = mode === 'login' ? 'Не удалось войти.' : 'Не удалось создать пользователя.';
      setMessage(error instanceof Error && error.message ? `${fallback} ${error.message}` : fallback);
      setSaving(false);
    }
  }

  return (
    <main className="page-shell auth-page">
      <section className="panel auth-card">
        <p className="eyebrow">Rail CRM Platform</p>
        <h1>{mode === 'login' ? 'Вход' : 'Создать пользователя'}</h1>
        <p className="hero-text">Экран входа для разработки: администратор, менеджер или сотрудник.</p>

        <form onSubmit={submit}>
          {mode === 'register' ? <label>Имя<input value={name} onChange={(event) => setName(event.target.value)} /></label> : null}
          <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
          <label>Пароль<input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Пароль" type="password" /></label>
          {mode === 'register' ? (
            <label>Роль<select value={role} onChange={(event) => setRole(event.target.value)}><option value="employee">Сотрудник</option><option value="manager">Менеджер</option><option value="admin">Администратор</option></select></label>
          ) : null}
          <button className="action-button primary" type="submit" disabled={saving}>{saving ? 'Подождите...' : mode === 'login' ? 'Войти' : 'Создать'}</button>
        </form>

        <button className="action-link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} type="button" disabled={saving}>{mode === 'login' ? 'Создать аккаунт' : 'Вернуться ко входу'}</button>
        <p className="hint">{message}</p>
        <p className="hint">После входа система автоматически откроет нужный кабинет. Ручное обновление страницы не нужно.</p>
      </section>
    </main>
  );
}
