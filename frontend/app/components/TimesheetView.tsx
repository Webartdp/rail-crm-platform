'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { me, type AuthUser } from '../../lib/auth';
import { employeeProfileName, getEmployeeProfiles, type EmployeeProfile } from '../../lib/employee-profiles';
import { monthEndIso, monthStartIso } from '../../lib/period';
import { correctTime, getTimesheet, type Timesheet, type TimesheetRow } from '../../lib/timesheet';
import { downloadCsv, downloadXlsx, type Cell } from '../../lib/xlsx';

const hours = (minutes: number) => Math.round((minutes / 60) * 100) / 100;

function toLocalInput(value: string | null) {
  return value ? value.replace(' ', 'T').slice(0, 16) : '';
}

/**
 * Stundenzettel: planned vs actual time of one employee for any period, split into
 * the four tariff zones, with Excel/CSV/print export and time correction for the employee.
 */
export default function TimesheetView({ heading, intro }: { heading: string; intro: string }) {
  const { t, fmt, locale } = useI18n();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [from, setFrom] = useState(monthStartIso());
  const [to, setTo] = useState(monthEndIso());
  const [sheet, setSheet] = useState<Timesheet | null>(null);
  const [showTravel, setShowTravel] = useState(true);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<TimesheetRow | null>(null);

  const isManager = user?.role === 'manager' || user?.role === 'admin';

  useEffect(() => {
    me().then(async (response) => {
      setUser(response.data);
      if (response.data.role === 'employee') {
        setEmployeeId(response.data.employee_profile_id ? Number(response.data.employee_profile_id) : null);
        if (!response.data.employee_profile_id) setNotice({ tone: 'error', text: t('empNoProfile') });
      } else {
        const list = await getEmployeeProfiles();
        const sorted = [...list.data].sort((a, b) => employeeProfileName(a).localeCompare(employeeProfileName(b)));
        setEmployees(sorted);
        const fromUrl = Number(new URLSearchParams(window.location.search).get('employee'));
        setEmployeeId(fromUrl || sorted[0]?.id || null);
      }
    }).catch(() => setUser(null));
  }, []);

  async function load() {
    if (!employeeId || !from || !to) return;
    setLoading(true);
    try {
      const response = await getTimesheet({ employeeId, from, to });
      setSheet(response.data);
    } catch (error) {
      setSheet(null);
      setNotice({ tone: 'error', text: t('commonLoadFailed', { error: error instanceof Error ? error.message : t('commonUnknownError') }) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [employeeId, from, to]);

  const rows = useMemo(() => (sheet?.rows || []).filter((row) => showTravel || row.type === 'arbeit'), [sheet, showTravel]);

  function setMonth(offset: number) {
    setFrom(monthStartIso(offset));
    setTo(monthEndIso(offset));
  }

  function typeLabel(row: TimesheetRow) {
    return t(`costType_${row.type}`);
  }

  function dayNote(row: TimesheetRow) {
    if (row.holiday) return row.holiday;
    if (row.weekday === 7) return t('tsSunday');
    return '';
  }

  // ---- exports ----
  function tableData(): Cell[][] {
    if (!sheet) return [];
    const header: Cell[] = [
      t('commonDate'), t('tsDay'), t('commonType'), t('commonCustomer'), t('commonObject'), t('wdWorkLocation'), t('asgWorkTitle'),
      t('wdReferenceNumber'), t('asgServiceType'), t('tsPlannedFrom'), t('tsPlannedTo'), t('tsActualFrom'), t('tsActualTo'),
      t('tsHoursActual'), t('tsZoneDay'), t('tsZone2024'), t('tsZone0004'), t('tsZone0406'), t('tsSundayHoliday'), t('commonNotes'), t('commonStatus'),
    ].map((value) => ({ value, bold: true }));

    const body: Cell[][] = rows.map((row) => [
      fmt.date(row.date),
      dayNote(row) || new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'de-DE', { weekday: 'short' }).format(new Date(`${row.date}T12:00:00`)),
      typeLabel(row),
      row.client || '',
      row.object || '',
      row.address || '',
      row.work_title || '',
      row.reference_number || '',
      row.leistungsart || '',
      row.planned_start ? fmt.time(row.planned_start) : '',
      row.planned_end ? fmt.time(row.planned_end) : '',
      fmt.time(row.actual_start),
      row.actual_end ? fmt.time(row.actual_end) : '',
      { value: hours(row.minutes), format: 'hours' },
      row.type === 'arbeit' ? { value: hours(row.minutes_day), format: 'hours' } : '',
      row.type === 'arbeit' ? { value: hours(row.minutes_night_20_24), format: 'hours' } : '',
      row.type === 'arbeit' ? { value: hours(row.minutes_night_00_04), format: 'hours' } : '',
      row.type === 'arbeit' ? { value: hours(row.minutes_night_04_06), format: 'hours' } : '',
      row.type === 'arbeit' ? { value: hours(row.minutes_sunday_holiday), format: 'hours' } : '',
      row.bemerkung || '',
      fmt.status(row.status),
    ]);

    const totals = sheet.totals;
    const footer: Cell[] = [
      { value: t('tsTotalWork'), bold: true }, '', '', '', '', '', '', '', '', '', '', '', '',
      { value: hours(totals.work), format: 'hours', bold: true },
      { value: hours(totals.day), format: 'hours', bold: true },
      { value: hours(totals.night_20_24), format: 'hours', bold: true },
      { value: hours(totals.night_00_04), format: 'hours', bold: true },
      { value: hours(totals.night_04_06), format: 'hours', bold: true },
      { value: hours(totals.sunday_holiday), format: 'hours', bold: true },
    ];

    return [
      [{ value: t('tsDocTitle'), bold: true }, sheet.employee.name],
      [t('tsPeriod'), `${fmt.date(sheet.period.from)} – ${fmt.date(sheet.period.to)}`],
      [t('tsTotalTravel'), { value: hours(totals.travel), format: 'hours' }],
      [t('tsTotalPlanned'), { value: hours(totals.planned), format: 'hours' }],
      [],
      header,
      ...body,
      footer,
    ];
  }

  function fileBase() {
    const name = (sheet?.employee.name || 'employee').replace(/[^\p{L}\p{N}]+/gu, '_');
    return `${t('tsFilePrefix')}_${name}_${from}_${to}`;
  }

  function exportXlsx() {
    downloadXlsx([{ name: t('tsDocTitle'), rows: tableData(), widths: [11, 9, 13, 22, 22, 28, 26, 16, 12, 9, 9, 9, 9, 9, 9, 9, 9, 9, 11, 30, 14] }], `${fileBase()}.xlsx`);
  }

  function exportCsv() {
    downloadCsv(tableData(), `${fileBase()}.csv`);
  }

  return (
    <>
      <section className="hero-card no-print">
        <div>
          <p className="eyebrow">{t('tsEyebrow')}</p>
          <h1>{heading}</h1>
          <p className="hero-text">{intro}</p>
        </div>
        <div className="row-actions">
          <button className="action-button secondary" disabled={!sheet} onClick={exportCsv} type="button">CSV</button>
          <button className="action-button secondary" disabled={!sheet} onClick={() => window.print()} type="button">{t('tsPrintPdf')}</button>
          <button className="action-button primary" disabled={!sheet} onClick={exportXlsx} type="button">{t('tsDownloadExcel')}</button>
        </div>
      </section>

      {notice ? <p className={`notice no-print ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p> : null}

      <section className="panel no-print">
        <div className="filter-bar">
          {isManager ? (
            <label className="grow">{t('commonEmployee')}
              <select value={employeeId ?? ''} onChange={(event) => setEmployeeId(Number(event.target.value) || null)}>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeProfileName(employee)}</option>)}
              </select>
            </label>
          ) : null}
          <label>{t('commonDateFrom')}<input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></label>
          <label>{t('commonDateTo')}<input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></label>
          <div className="quick-periods">
            <button className="small-button" onClick={() => setMonth(0)} type="button">{t('periodThisMonth')}</button>
            <button className="small-button" onClick={() => setMonth(-1)} type="button">{t('periodLastMonth')}</button>
          </div>
          <label className="checkbox-label"><input type="checkbox" checked={showTravel} onChange={(event) => setShowTravel(event.target.checked)} /><span>{t('tsShowTravel')}</span></label>
        </div>
      </section>

      {sheet ? (
        <>
          <header className="print-only print-head">
            <h1>{t('tsDocTitle')} — {sheet.employee.name}</h1>
            <p>{t('tsPeriod')}: {fmt.date(sheet.period.from)} – {fmt.date(sheet.period.to)}</p>
          </header>

          <section className="ts-summary">
            <div className="ts-total">
              <span>{t('tsHoursActual')}</span>
              <strong>{fmt.number(hours(sheet.totals.work), 2)}</strong>
              <small>{t('tsVsPlanned', { planned: fmt.number(hours(sheet.totals.planned), 2) })}</small>
            </div>
            <dl className="ts-zones">
              <div><dt>{t('tsZoneDay')}</dt><dd>{fmt.number(hours(sheet.totals.day), 2)}</dd></div>
              <div><dt>{t('tsZone2024')}</dt><dd>{fmt.number(hours(sheet.totals.night_20_24), 2)}</dd></div>
              <div><dt>{t('tsZone0004')}</dt><dd>{fmt.number(hours(sheet.totals.night_00_04), 2)}</dd></div>
              <div><dt>{t('tsZone0406')}</dt><dd>{fmt.number(hours(sheet.totals.night_04_06), 2)}</dd></div>
              <div><dt>{t('tsSundayHoliday')}</dt><dd>{fmt.number(hours(sheet.totals.sunday_holiday), 2)}</dd></div>
              <div><dt>{t('tsTravelHours')}</dt><dd>{fmt.number(hours(sheet.totals.travel), 2)}</dd></div>
              <div><dt>{t('tsWorkDays')}</dt><dd>{sheet.totals.days}</dd></div>
            </dl>
          </section>

          <section className="panel ts-panel">
            <div className="data-table-scroll">
              <table className="data-table ts-table">
                <thead>
                  <tr>
                    <th>{t('commonDate')}</th>
                    <th>{t('commonAssignment')}</th>
                    <th>{t('woPlanned')}</th>
                    <th>{t('woActual')}</th>
                    <th className="num">{t('tsHoursShort')}</th>
                    <th className="num">06–20</th>
                    <th className="num">20–24</th>
                    <th className="num">00–04</th>
                    <th className="num">04–06</th>
                    <th>{t('commonStatus')}</th>
                    <th className="no-print" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const work = row.type === 'arbeit';
                    const canCorrect = row.stop_event_id && !['approved'].includes(row.status);
                    return (
                      <tr key={`${row.start_event_id}`} className={work ? '' : 'ts-travel'}>
                        <td className="nowrap">
                          <strong>{fmt.date(row.date)}</strong>
                          {dayNote(row) ? <><br /><small className="ts-day-note">{dayNote(row)}</small></> : null}
                        </td>
                        <td>
                          {work ? <strong>{row.work_title || '—'}</strong> : <span>{typeLabel(row)}</span>}
                          <br />
                          <small className="hint">{[row.client, row.object].filter(Boolean).join(' — ') || '—'}</small>
                          {row.bemerkung ? <><br /><small className="ts-note">{row.bemerkung}</small></> : null}
                        </td>
                        <td className="nowrap">{row.planned_start ? `${fmt.time(row.planned_start)}–${fmt.time(row.planned_end)}` : '—'}</td>
                        <td className="nowrap">
                          {fmt.time(row.actual_start)}–{row.actual_end ? fmt.time(row.actual_end) : '…'}
                          {row.corrected ? <><br /><small className="ts-note">{t('tsCorrected')}</small></> : null}
                        </td>
                        <td className="num"><strong>{fmt.number(hours(row.minutes), 2)}</strong></td>
                        <td className="num">{work ? fmt.number(hours(row.minutes_day), 2) : ''}</td>
                        <td className="num">{work ? fmt.number(hours(row.minutes_night_20_24), 2) : ''}</td>
                        <td className="num">{work ? fmt.number(hours(row.minutes_night_00_04), 2) : ''}</td>
                        <td className="num">{work ? fmt.number(hours(row.minutes_night_04_06), 2) : ''}</td>
                        <td>{fmt.status(row.status)}</td>
                        <td className="no-print">
                          {canCorrect ? <button className="small-button" onClick={() => setEditing(row)} type="button">{t('tsCorrect')}</button> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {rows.length ? <tfoot>
                  <tr>
                    <td colSpan={4}>{t('tsTotalWork')}</td>
                    <td className="num">{fmt.number(hours(sheet.totals.work), 2)}</td>
                    <td className="num">{fmt.number(hours(sheet.totals.day), 2)}</td>
                    <td className="num">{fmt.number(hours(sheet.totals.night_20_24), 2)}</td>
                    <td className="num">{fmt.number(hours(sheet.totals.night_00_04), 2)}</td>
                    <td className="num">{fmt.number(hours(sheet.totals.night_04_06), 2)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot> : null}
              </table>
            </div>
            {!loading && !rows.length ? <p className="empty-state">{t('tsEmpty')}</p> : null}
            <p className="hint ts-legend">{t('tsLegend')}</p>
          </section>
        </>
      ) : null}

      {loading ? <p className="hint">{t('commonLoadingDots')}</p> : null}

      {editing ? (
        <CorrectionDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            setNotice({ tone: 'success', text: message });
            load();
          }}
        />
      ) : null}
    </>
  );
}

function CorrectionDialog({ row, onClose, onSaved }: { row: TimesheetRow; onClose: () => void; onSaved: (message: string) => void }) {
  const { t } = useI18n();
  const [start, setStart] = useState(toLocalInput(row.actual_start));
  const [stop, setStop] = useState(toLocalInput(row.actual_end));
  const [note, setNote] = useState(row.bemerkung || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!row.stop_event_id) return;
    if (stop <= start) {
      setError(t('tsEndAfterStart'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await correctTime({
        start_event_id: row.start_event_id,
        stop_event_id: row.stop_event_id,
        start_time: `${start.replace('T', ' ')}:00`,
        stop_time: `${stop.replace('T', ' ')}:00`,
        bemerkung: note,
      });
      onSaved(response.message);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('commonUnknownError'));
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onClose}>
      <section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="correct-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="correct-title">{t('tsCorrectTitle')}</h2>
        <p className="hint">{t('tsCorrectHint')}</p>
        <form className="dialog-form" onSubmit={submit}>
          <label>{t('tsActualFrom')}<input required type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} /></label>
          <label>{t('tsActualTo')}<input required type="datetime-local" value={stop} onChange={(event) => setStop(event.target.value)} /></label>
          <label>{t('commonNotes')}<textarea required value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('tsCorrectReason')} /></label>
          {error ? <p className="notice error" role="alert">{error}</p> : null}
          <div className="dialog-actions">
            <button className="action-button secondary" onClick={onClose} type="button">{t('commonCancel')}</button>
            <button className="action-button primary" disabled={saving} type="submit">{saving ? t('commonSavingDots') : t('commonSave')}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
