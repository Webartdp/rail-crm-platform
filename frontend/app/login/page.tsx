'use client';

import { useState } from 'react';
import { login, register } from '../../lib/auth';

const roleLabels: Record<string, string> = {
  employee: 'Сотрудник',
  manager: 'Менеджер',
  admin: 'Администратор',
};

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('Admin User');
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password');
  const [role, setRole] = useState('admin');
  const [message, setMessage] = useState('Готово.');

  async function submit() {
    try {
      const response = mode === 'login'
        ? await login(email, password)
        : await register({ name, email, password, role });
      setMessage(`${response.data.name} вошёл как ${roleLabels[response.data.role] || response.data.role}.`);
    } catch (error) {
      setMessage(mode === 'login' ? 'Не удалось войти.' : 'Не удалось создать пользователя.');
    }
  }

  return (
    <main className="page-shell auth-page">
      <section className="panel auth-card">
        <p className="eyebrow">Rail CRM Platform</p>
        <h1>{mode === 'login' ? 'Вход' : 'Создать пользователя'}</h1>
        <p className="hero-text">Временный экран входа для разработки: администратор, менеджер или сотрудник.</p>
        {mode === 'register' ? <label>Имя<input value={name} onChange={(event) => setName(event.target.value)} /></label> : null}
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
        <label>Пароль<input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Пароль" type="password" /></label>
        {mode === 'register' ? (
          <label>Роль<select value={role} onChange={(event) => setRole(event.target.value)}><option value="employee">Сотрудник</option><option value="manager">Менеджер</option><option value="admin">Администратор</option></select></label>
        ) : null}
        <button className="action-button primary" onClick={submit} type="button">{mode === 'login' ? 'Войти' : 'Создать'}</button>
        <button className="action-link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} type="button">{mode === 'login' ? 'Создать аккаунт' : 'Вернуться ко входу'}</button>
        <p className="hint">{message}</p>
        <p className="hint">Для разработки можно создать admin / manager / employee и сразу проверить доступы.</p>
      </section>
    </main>
  );
}
