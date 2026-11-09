'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { useI18n } from '../i18n';
import { getEmployeeProfiles, employeeProfileName, type EmployeeProfile } from '../../lib/employee-profiles';
import {
  createInviteLink,
  createResetLink,
  createUser,
  getUsers,
  updateUser,
  type AuthLink,
  type CrmUser,
} from '../../lib/users';

const ROLES = ['employee', 'manager', 'admin'];

type Notice = { tone: 'success' | 'error'; text: string } | null;
type LinkBox = { user: CrmUser; link: AuthLink } | null;

const emptyForm = { name: '', email: '', role: 'employee', locale: 'de', employee_profile_id: '', password: '', withPassword: false };

function isActive(user: CrmUser) {
  return user.is_active === true || user.is_active === 1;
}

export default function AdminPage() {
  const { t, fmt } = useI18n();
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [profiles, setProfiles] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [linkBox, setLinkBox] = useState<LinkBox>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [usersResponse, profilesResponse] = await Promise.all([getUsers(), getEmployeeProfiles().catch(() => ({ data: [] }))]);
      setUsers(usersResponse.data);
      setProfiles(profilesResponse.data);
    } catch (error) {
      setNotice({ tone: 'error', text: t('commonLoadFailed', { error: error instanceof Error ? error.message : t('commonUnknownError') }) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const profileName = useMemo(() => {
    const map = new Map<number, string>();
    profiles.forEach((profile) => map.set(profile.id, employeeProfileName(profile)));
    return map;
  }, [profiles]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(needle));
  }, [users, query]);

  const counts = useMemo(() => ({
    total: users.length,
    active: users.filter(isActive).length,
    invited: users.filter((user) => !user.password_set_at && user.invite_pending_until).length,
    admins: users.filter((user) => user.role === 'admin' && isActive(user)).length,
  }), [users]);

  function userState(user: CrmUser) {
    if (!isActive(user)) return { label: t('admUserInactive'), className: 'report-status-badge is-rejected' };
    if (!user.password_set_at && user.invite_pending_until) return { label: t('admUserInvited'), className: 'report-status-badge is-waiting' };
    if (!user.password_set_at && !user.last_login_at) return { label: t('admUserNoPassword'), className: 'report-status-badge is-waiting' };
    return { label: t('admUserActive'), className: 'report-status-badge is-approved' };
  }

  function replaceUser(updated: CrmUser) {
    setUsers((list) => list.map((user) => (user.id === updated.id ? { ...user, ...updated } : user)));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setNotice(null);
    setLinkBox(null);

    try {
      const response = await createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        locale: form.locale,
        employee_profile_id: form.employee_profile_id ? Number(form.employee_profile_id) : null,
        password: form.withPassword ? form.password : undefined,
      });
      setNotice({ tone: 'success', text: response.message });
      if (response.link) setLinkBox({ user: response.data, link: response.link });
      setForm(emptyForm);
      await load();
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : t('commonUnknownError') });
    } finally {
      setSaving(false);
    }
  }

  async function run(user: CrmUser, action: () => Promise<{ message: string; data?: CrmUser; link?: AuthLink }>) {
    setBusyId(user.id);
    setNotice(null);
    setLinkBox(null);
    try {
      const response = await action();
      setNotice({ tone: 'success', text: response.message });
      if (response.data) replaceUser(response.data);
      if (response.link) setLinkBox({ user, link: response.link });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : t('commonUnknownError') });
    } finally {
      setBusyId(null);
    }
  }

  async function copyLink() {
    if (!linkBox) return;
    try {
      await navigator.clipboard.writeText(linkBox.link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['admin']} title={t('admTitle')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('admEyebrow')}</p>
            <h1>{t('admTitle')}</h1>
            <p className="hero-text">{t('admHero')}</p>
          </div>
          <button className="action-button secondary compact-button" onClick={load} type="button" disabled={loading}>
            {loading ? t('commonLoadingDots') : t('commonRefresh')}
          </button>
        </section>

        <section className="stats-grid">
          <div className="panel stat-card"><p className="eyebrow">{t('admStatUsers')}</p><h2>{counts.total}</h2></div>
          <div className="panel stat-card"><p className="eyebrow">{t('admStatActive')}</p><h2>{counts.active}</h2></div>
          <div className="panel stat-card"><p className="eyebrow">{t('admStatInvited')}</p><h2>{counts.invited}</h2></div>
          <div className="panel stat-card"><p className="eyebrow">{t('admStatAdmins')}</p><h2>{counts.admins}</h2></div>
        </section>

        {notice ? <p className={`notice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p> : null}

        {linkBox ? (
          <section className="panel link-box">
            <h2>{linkBox.link.type === 'invite' ? t('admInviteLinkFor', { name: linkBox.user.name }) : t('admResetLinkFor', { name: linkBox.user.name })}</h2>
            <p className="hint">
              {linkBox.link.email_sent ? t('admLinkEmailed', { email: linkBox.user.email }) : t('admLinkNotEmailed')}{' '}
              {t('admLinkValidUntil', { date: fmt.dateTime(linkBox.link.expires_at) })}
            </p>
            <div className="link-box-row">
              <input readOnly value={linkBox.link.url} onFocus={(event) => event.target.select()} aria-label={t('admLink')} />
              <button className="action-button primary compact-button" onClick={copyLink} type="button">{copied ? t('admCopied') : t('admCopy')}</button>
            </div>
          </section>
        ) : null}

        <section className="panel">
          <div className="field-panel-head">
            <h2>{t('admCreateTitle')}</h2>
            <p className="hint">{t('admCreateHint')}</p>
          </div>

          <form className="form-grid" onSubmit={submit}>
            <label>{t('commonName')}
              <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={t('admNamePlaceholder')} />
            </label>
            <label>{t('commonEmail')}
              <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@firma.de" />
            </label>
            <label>{t('loginRole')}
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                {ROLES.map((role) => <option key={role} value={role}>{fmt.role(role)}</option>)}
              </select>
            </label>
            <label>{t('admLanguage')}
              <select value={form.locale} onChange={(event) => setForm({ ...form, locale: event.target.value })}>
                <option value="de">Deutsch</option>
                <option value="ru">Русский</option>
              </select>
            </label>
            <label className="wide-field">{t('admEmployeeProfile')}
              <select value={form.employee_profile_id} onChange={(event) => setForm({ ...form, employee_profile_id: event.target.value })}>
                <option value="">{t('admNoProfile')}</option>
                {profiles.map((profile) => <option key={profile.id} value={profile.id}>{employeeProfileName(profile)}</option>)}
              </select>
            </label>
            <label className="checkbox-label wide-field">
              <input type="checkbox" checked={form.withPassword} onChange={(event) => setForm({ ...form, withPassword: event.target.checked })} />
              <span>{t('admSetPasswordMyself')}</span>
            </label>
            {form.withPassword ? (
              <label className="wide-field">{t('loginPassword')}
                <input type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
                <small className="hint">{t('passwordRules')}</small>
              </label>
            ) : null}
            <div className="wide-field">
              <button className="action-button primary" type="submit" disabled={saving}>
                {saving ? t('commonSavingDots') : form.withPassword ? t('admCreateUser') : t('admCreateAndInvite')}
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="field-panel-head split-head">
            <div>
              <h2>{t('admUsersTitle')}</h2>
              <p className="hint">{t('admUsersHint')}</p>
            </div>
            <input className="search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('admSearchPlaceholder')} aria-label={t('commonSearch')} />
          </div>

          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('commonName')}</th>
                  <th>{t('loginRole')}</th>
                  <th>{t('admEmployeeProfile')}</th>
                  <th>{t('admLanguage')}</th>
                  <th>{t('commonStatus')}</th>
                  <th>{t('admLastLogin')}</th>
                  <th>{t('commonActions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const state = userState(user);
                  const busy = busyId === user.id;
                  return (
                    <tr key={user.id}>
                      <td><strong>{user.name}</strong><br /><small className="hint">{user.email}</small></td>
                      <td>
                        <select aria-label={t('loginRole')} value={user.role} disabled={busy} onChange={(event) => run(user, () => updateUser(user.id, { role: event.target.value }))}>
                          {ROLES.map((role) => <option key={role} value={role}>{fmt.role(role)}</option>)}
                        </select>
                      </td>
                      <td>
                        <select aria-label={t('admEmployeeProfile')} value={user.employee_profile_id ?? ''} disabled={busy} onChange={(event) => run(user, () => updateUser(user.id, { employee_profile_id: event.target.value ? Number(event.target.value) : null }))}>
                          <option value="">{t('admNoProfile')}</option>
                          {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profileName.get(profile.id)}</option>)}
                        </select>
                      </td>
                      <td>{user.locale === 'ru' ? 'RU' : 'DE'}</td>
                      <td><span className={state.className}>{state.label}</span></td>
                      <td>{user.last_login_at ? fmt.dateTime(user.last_login_at) : '—'}</td>
                      <td>
                        <div className="row-actions">
                          {!user.password_set_at ? (
                            <button className="small-button" disabled={busy} onClick={() => run(user, () => createInviteLink(user.id))} type="button">{t('admNewInvite')}</button>
                          ) : (
                            <button className="small-button" disabled={busy} onClick={() => run(user, () => createResetLink(user.id))} type="button">{t('admResetPassword')}</button>
                          )}
                          {isActive(user) ? (
                            <button className="small-button danger" disabled={busy} onClick={() => { if (window.confirm(t('admDeactivateConfirm', { name: user.name }))) run(user, () => updateUser(user.id, { is_active: false })); }} type="button">{t('admDeactivate')}</button>
                          ) : (
                            <button className="small-button" disabled={busy} onClick={() => run(user, () => updateUser(user.id, { is_active: true }))} type="button">{t('admActivate')}</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && !filtered.length ? <p className="hint">{t('commonNoData')}</p> : null}
        </section>
      </RoleGuard>
    </main>
  );
}
