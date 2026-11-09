'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { getCompanySettings, saveCompanySettings, type CompanySettings } from '../../lib/invoices';

const FIELDS: Array<{ key: string; label: string; wide?: boolean; multiline?: boolean; type?: string }> = [
  { key: 'company_name', label: 'setCompanyName' },
  { key: 'company_email', label: 'commonEmail', type: 'email' },
  { key: 'company_address', label: 'commonAddress', wide: true, multiline: true },
  { key: 'company_phone', label: 'commonPhone' },
  { key: 'company_website', label: 'setWebsite' },
  { key: 'tax_number', label: 'setTaxNumber' },
  { key: 'vat_id', label: 'setVatId' },
  { key: 'bank_name', label: 'setBank' },
  { key: 'iban', label: 'IBAN' },
  { key: 'bic', label: 'BIC' },
  { key: 'invoice_prefix', label: 'setInvoicePrefix' },
  { key: 'vat_rate', label: 'setVatRate', type: 'number' },
  { key: 'payment_terms_days', label: 'setPaymentTerms', type: 'number' },
  { key: 'invoice_intro', label: 'setInvoiceIntro', wide: true, multiline: true },
  { key: 'invoice_footer', label: 'setInvoiceFooter', wide: true },
];

/** Company data for invoices and the tariff rule for Sunday/holiday at night. */
export default function CompanySettingsForm() {
  const { t, has } = useI18n();
  const [values, setValues] = useState<CompanySettings>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    getCompanySettings()
      .then((response) => setValues(response.data))
      .catch((error) => setNotice({ tone: 'error', text: t('commonLoadFailed', { error: error instanceof Error ? error.message : t('commonUnknownError') }) }))
      .finally(() => setLoaded(true));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const response = await saveCompanySettings(values);
      setValues(response.data);
      setNotice({ tone: 'success', text: response.message });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : t('commonUnknownError') });
    } finally {
      setSaving(false);
    }
  }

  const set = (key: string) => (event: { target: { value: string } }) => setValues({ ...values, [key]: event.target.value });

  return (
    <form className="panel" onSubmit={submit}>
      <h2>{t('setTariffTitle')}</h2>
      <p className="hint">{t('setTariffHint')}</p>
      <div className="choice-grid">
        {(['max', 'sum'] as const).map((mode) => (
          <label className={`choice ${(values.surcharge_mode || 'max') === mode ? 'checked' : ''}`} key={mode}>
            <input type="radio" name="surcharge_mode" checked={(values.surcharge_mode || 'max') === mode} onChange={() => setValues({ ...values, surcharge_mode: mode })} />
            <span>
              <strong>{t(`setSurcharge_${mode}`)}</strong>
              <small>{t(`setSurcharge_${mode}_hint`)}</small>
            </span>
          </label>
        ))}
      </div>

      <h2 style={{ marginTop: 28 }}>{t('setCompanyTitle')}</h2>
      <p className="hint">{t('setCompanyHint')}</p>
      <div className="form-grid">
        {FIELDS.map((field) => (
          <label className={field.wide ? 'wide-field' : ''} key={field.key}>
            {has(field.label) ? t(field.label) : field.label}
            {field.multiline ? (
              <textarea value={values[field.key] || ''} onChange={set(field.key)} />
            ) : (
              <input type={field.type || 'text'} step={field.type === 'number' ? 'any' : undefined} value={values[field.key] || ''} onChange={set(field.key)} />
            )}
          </label>
        ))}
      </div>
      <div className="form-actions">
        {notice ? <p className={`notice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p> : null}
        <button className="action-button primary" disabled={saving || !loaded} type="submit">{saving ? t('commonSavingDots') : t('commonSave')}</button>
      </div>
    </form>
  );
}
