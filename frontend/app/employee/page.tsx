'use client';

import { useEffect, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { me, type AuthUser } from '../../lib/auth';
import { getEmployeeProfile } from '../../lib/employee-profiles';
import { useI18n } from '../i18n';
type ProfileData = Record<string, unknown>;

function value(profile: ProfileData | null, keys: string[]) {
  if (!profile) return '—';

  for (const key of keys) {
    const item = profile[key];

    if (item !== null && item !== undefined && item !== '') {
      return String(item);
    }
  }

  return '—';
}

function coefficient(profile: ProfileData | null, keys: string[]) {
  const item = value(profile, keys);

  if (item === '—') return item;

  return `× ${item}`;
}

function fullName(profile: ProfileData | null, user: AuthUser | null) {
  const firstName = value(profile, ['first_name', 'firstname', 'name']);
  const lastName = value(profile, ['last_name', 'lastname', 'surname']);
  const name = [firstName, lastName].filter((item) => item !== '—').join(' ');

  return name || user?.name || '—';
}

const profileTopGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.25fr) minmax(280px, 0.75fr)',
  gap: '1.25rem',
  marginTop: '1.25rem',
  marginBottom: '1.25rem',
} as const;

const cardStyle = {
  display: 'grid',
  gap: '1rem',
  padding: '1.35rem',
  borderRadius: '1.35rem',
  border: '1px solid rgba(148, 163, 184, 0.24)',
  background: '#ffffff',
  boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
} as const;

const profileIdentityStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
} as const;

const avatarStyle = {
  width: '4.4rem',
  height: '4.4rem',
  borderRadius: '1.25rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(37, 99, 235, 0.1)',
  color: '#2554d9',
  fontWeight: 800,
  fontSize: '1.35rem',
  flex: '0 0 auto',
} as const;

const miniGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '0.85rem',
} as const;

const miniCardStyle = {
  padding: '0.95rem',
  borderRadius: '1rem',
  background: 'rgba(248, 250, 252, 0.9)',
  border: '1px solid rgba(148, 163, 184, 0.18)',
} as const;

const sectionGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '1.25rem',
  marginBottom: '1.25rem',
} as const;

const rowStyle = {
  display: 'grid',
  gridTemplateColumns: '210px minmax(0, 1fr)',
  gap: '1rem',
  alignItems: 'center',
  padding: '0.9rem 0',
  borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
} as const;

const rowLastStyle = {
  ...rowStyle,
  borderBottom: '0',
} as const;

const valueStyle = {
  fontWeight: 700,
  color: '#0f172a',
} as const;

const noteGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '1rem',
} as const;

const noteCardStyle = {
  padding: '1rem',
  borderRadius: '1rem',
  border: '1px solid rgba(148, 163, 184, 0.22)',
  background: 'rgba(248, 250, 252, 0.85)',
} as const;


const profileHeroActionsStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
  gap: '0.75rem',
  maxWidth: '620px',
  marginLeft: 'auto',
} as const;

const profileHeroButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '145px',
  height: '46px',
  padding: '0 1rem',
  borderRadius: '0.95rem',
  border: '1px solid rgba(15, 23, 42, 0.16)',
  background: '#0f172a',
  color: '#ffffff',
  fontSize: '0.95rem',
  fontWeight: 800,
  lineHeight: 1,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
} as const;

const profileHeroButtonPrimaryStyle = {
  background: '#2554d9',
  borderColor: 'rgba(37, 99, 235, 0.35)',
} as const;

export default function EmployeeProfilePage() {
  const { t } = useI18n();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [message, setMessage] = useState(t('empLoadingProfile'));
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setMessage(t('empLoadingProfile'));

    try {
      const current = await me();
      setUser(current.data);

      const profileId = current.data.employee_profile_id ? Number(current.data.employee_profile_id) : null;

      if (!profileId) {
        setProfile(null);
        setMessage(t('empNoProfile'));
        return;
      }

      const response = await getEmployeeProfile(profileId);
      setProfile(response.data as unknown as ProfileData);
      setMessage(t('empProfileLoaded'));
    } catch (error) {
      const errorText = error instanceof Error ? error.message : t('commonUnknownError');
      setUser(null);
      setProfile(null);
      setMessage(t('empLoadError', { error: errorText }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const name = fullName(profile, user);
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'PR';

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['employee']} title={t('empProfileTitle')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('empEyebrow')}</p>
            <h1>{t('empProfileTitle')}</h1>
            <p className="hero-text">
              {t('empProfileHero')}
            </p>
            <p className="hint">{loading ? t('empLoadingProfile') : message}</p>
          </div>

          <div style={profileHeroActionsStyle}>
            <a style={profileHeroButtonStyle} href="/workday">{t('empWorkday')}</a>
            <a style={profileHeroButtonStyle} href="/my-time">{t('empMyTime')}</a>
            <button style={{ ...profileHeroButtonStyle, ...profileHeroButtonPrimaryStyle }} onClick={load} type="button">{t('empRefresh')}</button>
          </div>
        </section>

        <section style={profileTopGridStyle}>
          <div style={cardStyle}>
            <div style={profileIdentityStyle}>
              <div style={avatarStyle}>{initials}</div>

              <div>
                <p className="eyebrow">{t('empPersonalData')}</p>
                <h2>{name}</h2>
                <p className="hint">{user?.email || '—'}</p>
              </div>
            </div>

            <div style={miniGridStyle}>
              <div style={miniCardStyle}>
                <p className="eyebrow">{t('empRole')}</p>
                <strong>{user?.role === 'employee' ? t('roleEmployee') : user?.role || '—'}</strong>
              </div>

              <div style={miniCardStyle}>
                <p className="eyebrow">{t('empProfileId')}</p>
                <strong>{user?.employee_profile_id || '—'}</strong>
              </div>

              <div style={miniCardStyle}>
                <p className="eyebrow">{t('empStatus')}</p>
                <strong>{value(profile, ['is_active']) === '1' ? t('empActive') : '—'}</strong>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <p className="eyebrow">{t('empHomeLocation')}</p>
            <h2>{value(profile, ['home_location', 'home_address', 'home_city'])}</h2>
            <p className="hint">
              {t('empHomeLocationHint')}
            </p>
          </div>
        </section>

        <section style={sectionGridStyle}>
          <div className="panel">
            <div className="field-panel-head">
              <p className="eyebrow">{t('empProfile')}</p>
              <h2>{t('empContactData')}</h2>
              <p className="hint">{t('empContactDataHint')}</p>
            </div>

            <div style={rowStyle}>
              <strong>{t('empFirstName')}</strong>
              <span style={valueStyle}>{value(profile, ['first_name', 'firstname', 'name'])}</span>
            </div>

            <div style={rowStyle}>
              <strong>{t('empLastName')}</strong>
              <span style={valueStyle}>{value(profile, ['last_name', 'lastname', 'surname'])}</span>
            </div>

            <div style={rowStyle}>
              <strong>{t('commonEmail')}</strong>
              <span style={valueStyle}>{user?.email || '—'}</span>
            </div>

            <div style={rowLastStyle}>
              <strong>{t('empPhone')}</strong>
              <span style={valueStyle}>{value(profile, ['phone', 'mobile', 'telephone'])}</span>
            </div>
          </div>

          <div className="panel">
            <div className="field-panel-head">
              <p className="eyebrow">{t('empCalculation')}</p>
              <h2>{t('empWorkParams')}</h2>
              <p className="hint">{t('empWorkParamsHint')}</p>
            </div>

            <div style={rowStyle}>
              <strong>{t('empStandardRate')}</strong>
              <span style={valueStyle}>{value(profile, ['standard_hourly_rate', 'standard_rate', 'hourly_rate', 'base_rate'])}</span>
            </div>

            <div style={rowStyle}>
              <strong>{t('empTravelRate')}</strong>
              <span style={valueStyle}>{value(profile, ['travel_hourly_rate', 'travel_rate', 'drive_rate'])}</span>
            </div>

            <div style={rowStyle}>
              <strong>{t('empNightCoef')}</strong>
              <span style={valueStyle}>{coefficient(profile, ['night_coefficient', 'night_coef'])}</span>
            </div>

            <div style={rowStyle}>
              <strong>{t('empSundayCoef')}</strong>
              <span style={valueStyle}>{coefficient(profile, ['sunday_coefficient', 'sunday_coef'])}</span>
            </div>

            <div style={rowLastStyle}>
              <strong>{t('empHolidayCoef')}</strong>
              <span style={valueStyle}>{coefficient(profile, ['holiday_coefficient', 'holiday_coef'])}</span>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="field-panel-head">
            <p className="eyebrow">{t('empRights')}</p>
            <h2>{t('empWhatCanChange')}</h2>
            <p className="hint">
              {t('empRatesProtected')}
            </p>
          </div>

          <div style={noteGridStyle}>
            <div style={noteCardStyle}>
              <strong>{t('empCanChangeByRequest')}</strong>
              <p className="hint">{t('empCanChangeByRequestHint')}</p>
            </div>

            <div style={noteCardStyle}>
              <strong>{t('empReadonly')}</strong>
              <p className="hint">{t('empReadonlyHint')}</p>
            </div>

            <div style={noteCardStyle}>
              <strong>{t('empWorkActions')}</strong>
              <p className="hint">{t('empWorkActionsHint')}</p>
            </div>
          </div>
        </section>
      </RoleGuard>
    </main>
  );
}
