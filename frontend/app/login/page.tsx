'use client';

import { useState } from 'react';
import { login, register } from '../../lib/auth';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('Admin User');
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password');
  const [role, setRole] = useState('admin');
  const [message, setMessage] = useState('Bereit.');

  async function submit() {
    try {
      const response = mode === 'login'
        ? await login(email, password)
        : await register({ name, email, password, role });
      setMessage(`${response.data.name} logged in as ${response.data.role}.`);
    } catch (error) {
      setMessage(mode === 'login' ? 'Login failed.' : 'Registration failed.');
    }
  }

  return (
    <main className="page-shell auth-page">
      <section className="panel auth-card">
        <p className="eyebrow">Rail CRM Platform</p>
        <h1>{mode === 'login' ? 'Login' : 'Register'}</h1>
        <p className="hero-text">Prototype login screen for administrators, coordinators and employees.</p>
        {mode === 'register' ? <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label> : null}
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
        <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" /></label>
        {mode === 'register' ? (
          <label>Role<select value={role} onChange={(event) => setRole(event.target.value)}><option value="employee">employee</option><option value="manager">manager</option><option value="admin">admin</option></select></label>
        ) : null}
        <button className="action-button primary" onClick={submit} type="button">{mode === 'login' ? 'Sign in' : 'Create user'}</button>
        <button className="action-link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} type="button">{mode === 'login' ? 'Create account' : 'Back to login'}</button>
        <p className="hint">{message}</p>
      </section>
    </main>
  );
}
