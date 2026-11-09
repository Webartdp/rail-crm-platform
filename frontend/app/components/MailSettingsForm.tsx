'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { getMailSettings, saveMailSettings, sendTestMail, type MailSettings, type MailSettingsInput } from '../../lib/invoices';

const EMPTY: MailSettingsInput = {
  mail_enabled: false,
  mail_host: '',
  mail_port: '587',
  mail_encryption: 'tls',
  mail_username: '',
  mail_from_address: '',
  mail_from_name: '',
};

// Common providers, to fill server/port/encryption with one click.
const PRESETS: Array<{ label: string; host: string; port: string; encryption: 'tls' | 'ssl' }> = [
  { label: 'IONOS', host: 'smtp.ionos.de', port: '587', encryption: 'tls' },
  { label: 'Strato', host: 'smtp.strato.de', port: '465', encryption: 'ssl' },
  { label: 'Gmail / Google Workspace', host: 'smtp.gmail.com', port: '587', encryption: 'tls' },
  { label: 'Microsoft 365 / Outlook', host: 'smtp.office365.com', port: '587', encryption: 'tls' },
  { label: 'GMX', host: 'mail.gmx.net', port: '587', encryption: 'tls' },
  { label: 'WEB.DE', host: 'smtp.web.de', port: '587', encryption: 'tls' },
];

/** SMTP account the CRM uses for invitations, password resets and invoices. */
export default function MailSettingsForm() {
  const { t } = useI18n();
  const [values, setValues] = useState<MailSettingsInput>(EMPTY);
  const [info, setInfo] = useState<MailSettings | null>(null);
  const [password, setPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [busy, setBusy] = useState<'save' | 'test' | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  function apply(data: MailSettings) {
    setInfo(data);
    setValues({
      mail_enabled: data.mail_enabled,
      mail_host: data.mail_host,
      mail_port: String(data.mail_port || '587'),
      mail_encryption: data.mail_encryption || 'tls',
      mail_username: data.mail_username,
      mail_from_address: data.mail_from_address,
      mail_from_name: data.mail_from_name,
    });
    setPassword('');
    setClearPassword(false);
  }

  useEffect(() => {
    getMailSettings()
      .then((response) => apply(response.data))
      .catch((error) => setNotice({ tone: 'error', text: t('commonLoadFailed', { error: error instanceof Error ? error.message : t('commonUnknownError') }) }));
  }, []);

  const set = (key: keyof MailSettingsInput) => (event: { target: { value: string } }) => setValues({ ...values, [key]: event.target.value });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('save');
    setNotice(null);
    try {
      const response = await saveMailSettings({
        ...values,
        mail_port: Number(values.mail_port) || 587,
        mail_password: password || undefined,
        mail_password_clear: clearPassword || undefined,
      });
      apply(response.data);
      setNotice({ tone: 'success', text: response.message });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : t('commonUnknownError') });
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    if (!testTo.trim()) {
      setNotice({ tone: 'error', text: t('mailTestNeedAddress') });
      return;
    }
    setBusy('test');
    setNotice(null);
    try {
      const response = await sendTestMail(testTo.trim());
      setNotice({ tone: 'success', text: response.message });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : t('commonUnknownError') });
    } finally {
      setBusy(null);
    }
  }

  const status = !info ? null : info.ready ? (info.source === 'env' ? 'env' : 'ready') : 'off';

  return (
    <form className="panel" onSubmit={submit}>
      <div className="detail-subhead">
        <h2>{t('mailTitle')}</h2>
        {status ? <span className={`report-status-badge ${status === 'off' ? 'is-waiting' : 'is-approved'}`}>{t(`mailStatus_${status}`)}</span> : null}
      </div>
      <p className="hint">{t('mailHint')}</p>

      <label className="choice" style={{ marginTop: 14, maxWidth: 520 }}>
        <input type="checkbox" checked={values.mail_enabled} onChange={(event) => setValues({ ...values, mail_enabled: event.target.checked })} />
        <span>
          <strong>{t('mailEnabled')}</strong>
          <small>{t('mailEnabledHint')}</small>
        </span>
      </label>

      <div className="form-grid">
        <label className="wide-field">
          {t('mailPreset')}
          <select
            value=""
            onChange={(event) => {
              const preset = PRESETS.find((entry) => entry.label === event.target.value);
              if (preset) setValues({ ...values, mail_host: preset.host, mail_port: preset.port, mail_encryption: preset.encryption });
            }}
          >
            <option value="">{t('mailPresetPick')}</option>
            {PRESETS.map((preset) => <option key={preset.label} value={preset.label}>{preset.label}</option>)}
          </select>
        </label>
        <label>
          {t('mailHost')}
          <input value={values.mail_host} onChange={set('mail_host')} placeholder="smtp.example.de" autoComplete="off" />
        </label>
        <label>
          {t('mailPort')}
          <input type="number" min={1} max={65535} value={values.mail_port} onChange={set('mail_port')} />
        </label>
        <label>
          {t('mailEncryption')}
          <select
            value={values.mail_encryption}
            onChange={(event) => setValues({ ...values, mail_encryption: event.target.value, mail_port: event.target.value === 'ssl' ? '465' : '587' })}
          >
            <option value="tls">{t('mailEncTls')}</option>
            <option value="ssl">{t('mailEncSsl')}</option>
          </select>
        </label>
        <label>
          {t('mailUsername')}
          <input value={values.mail_username} onChange={set('mail_username')} autoComplete="off" />
        </label>
        <label className="wide-field">
          {t('mailPassword')}
          <input
            type="password"
            value={password}
            onChange={(event) => { setPassword(event.target.value); setClearPassword(false); }}
            placeholder={info?.mail_password_set ? t('mailPasswordKeep') : ''}
            autoComplete="new-password"
          />
          {info?.mail_password_set ? (
            <small className="hint">
              {t('mailPasswordStored')}{' '}
              <button className="link-button" type="button" onClick={() => { setPassword(''); setClearPassword(true); }}>{clearPassword ? t('mailPasswordWillClear') : t('mailPasswordClear')}</button>
            </small>
          ) : null}
        </label>
        <label>
          {t('mailFromAddress')}
          <input type="email" value={values.mail_from_address} onChange={set('mail_from_address')} placeholder="info@firma.de" />
        </label>
        <label>
          {t('mailFromName')}
          <input value={values.mail_from_name} onChange={set('mail_from_name')} placeholder={t('mailFromNamePlaceholder')} />
        </label>
      </div>

      <div className="form-actions">
        {notice ? <p className={`notice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p> : null}
        <button className="action-button primary" disabled={busy !== null || !info} type="submit">{busy === 'save' ? t('commonSavingDots') : t('commonSave')}</button>
      </div>

      <h3 style={{ marginTop: 24 }}>{t('mailTestTitle')}</h3>
      <p className="hint">{t('mailTestHint')}</p>
      <div className="mail-test-row">
        <input type="email" value={testTo} onChange={(event) => setTestTo(event.target.value)} placeholder="name@example.de" aria-label={t('mailTestTo')} />
        <button className="action-button secondary" disabled={busy !== null || !info} onClick={test} type="button">{busy === 'test' ? t('mailTestSending') : t('mailTestSend')}</button>
      </div>
    </form>
  );
}
