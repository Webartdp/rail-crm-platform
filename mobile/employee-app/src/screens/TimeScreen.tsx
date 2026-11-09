import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NetworkError, correctTime, errorMessage, getTimesheet } from '../api';
import { useApp } from '../AppContext';
import { addDays, dmy, hhmm, hours, isoDate, monthRange, weekday } from '../i18n';
import { readJson, writeJson } from '../storage';
import { colors, font, radius } from '../theme';
import type { Timesheet, TimesheetRow } from '../types';
import { Badge, Button, Card, Chip, DateField, Field, Notice, styles as ui, type Tone } from '../ui';

const STATUS_TONE: Record<string, Tone> = { open: 'neutral', pending: 'amber', approved: 'green', rejected: 'red' };

export default function TimeScreen() {
  const { t, locale } = useApp();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState(monthRange(0));
  const [sheet, setSheet] = useState<Timesheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<TimesheetRow | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getTimesheet(period.from, period.to);
      setSheet(response.data);
      writeJson('timesheet', response.data);
      setOffline(false);
    } catch (problem) {
      if (problem instanceof NetworkError) {
        const cached = await readJson<Timesheet | null>('timesheet', null);
        if (cached && cached.period.from === period.from && cached.period.to === period.to) setSheet(cached);
        setOffline(true);
      } else {
        setError(errorMessage(problem, t('unknownError')));
      }
    } finally {
      setLoading(false);
    }
  }, [period, t]);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(() => {
    const map = new Map<string, TimesheetRow[]>();
    (sheet?.rows || []).forEach((row) => map.set(row.date, [...(map.get(row.date) || []), row]));
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [sheet]);

  const totals = sheet?.totals;
  const night = totals ? totals.night_20_24 + totals.night_00_04 + totals.night_04_06 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.porcelain }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.brass} />}>
        <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
          <Text style={styles.title}>{t('timeTitle')}</Text>
          <Text style={styles.intro}>{t('timeIntro')}</Text>
          <View style={styles.totals}>
            <Total label={t('totalWork')} value={hours(locale, totals?.work)} strong />
            <Total label={t('totalTravel')} value={hours(locale, totals?.travel)} />
            <Total label={t('totalNight')} value={hours(locale, night)} />
            <Total label={t('totalSunday')} value={hours(locale, totals?.sunday_holiday)} />
          </View>
          {totals ? <Text style={styles.days}>{t('workDays', { count: totals.days })}</Text> : null}
        </View>

        <View style={styles.body}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <DateField label={t('from')} value={period.from} maximum={period.to} onChange={(from) => setPeriod({ ...period, from })} />
            <DateField label={t('to')} value={period.to} minimum={period.from} onChange={(to) => setPeriod({ ...period, to })} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label={t('thisMonth')} onPress={() => setPeriod(monthRange(0))} />
            <Chip label={t('lastMonth')} onPress={() => setPeriod(monthRange(-1))} />
          </View>

          {offline ? <Notice text={t('noConnection')} /> : null}
          {error ? <Notice tone="red" text={error} /> : null}
          {notice ? <Notice tone="green" text={notice} /> : null}
          {loading && !sheet ? <Text style={ui.hint}>{t('loading')}</Text> : null}
          {!loading && sheet && days.length === 0 ? (
            <Card>
              <Text style={styles.empty}>{t('noRows')}</Text>
            </Card>
          ) : null}

          {days.map(([date, rows]) => {
            const first = rows[0];
            const special = first.holiday ? `${t('holiday')}: ${first.holiday}` : first.weekday === 0 ? t('sunday') : '';
            return (
              <Card key={date} style={{ padding: 0, overflow: 'hidden' }}>
                <View style={styles.dayHead}>
                  <Text style={styles.dayTitle}>{weekday(locale, date)} {dmy(date)}</Text>
                  {special ? <Badge label={special} tone="brass" /> : null}
                </View>
                {rows.map((row) => (
                  <View key={`${row.start_event_id}`} style={styles.row}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.rowType}>{t(`type_${row.type}`)}</Text>
                      <Badge label={t(`status_${row.status}`)} tone={STATUS_TONE[row.status] || 'neutral'} />
                      {row.corrected ? <Badge label={t('corrected')} tone="blue" /> : null}
                      <Text style={styles.rowMinutes}>{row.actual_end ? hours(locale, row.minutes) : t('running')}</Text>
                    </View>
                    {row.work_title || row.reference_number ? (
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {[row.work_title, row.reference_number].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}
                    <View style={styles.times}>
                      {row.type === 'arbeit' ? (
                        <Text style={styles.timeText}>
                          {t('plannedShort')}: {row.planned_start ? `${hhmm(row.planned_start)}–${hhmm(row.planned_end)}` : '—'}
                        </Text>
                      ) : null}
                      <Text style={[styles.timeText, styles.timeActual]}>
                        {t('actualShort')}: {hhmm(row.actual_start)}–{row.actual_end ? hhmm(row.actual_end) : '…'}
                        {row.actual_end && isoDate(row.actual_end) !== row.date ? ` (+1)` : ''}
                      </Text>
                    </View>
                    {row.type === 'arbeit' && row.actual_end ? (
                      <View style={styles.zones}>
                        <Zone label={t('zoneDay')} minutes={row.minutes_day} locale={locale} />
                        <Zone label={t('zone20')} minutes={row.minutes_night_20_24} locale={locale} />
                        <Zone label={t('zone00')} minutes={row.minutes_night_00_04} locale={locale} />
                        <Zone label={t('zone04')} minutes={row.minutes_night_04_06} locale={locale} />
                        <Zone label={t('zoneSun')} minutes={row.minutes_sunday_holiday} locale={locale} />
                      </View>
                    ) : null}
                    {row.bemerkung ? <Text style={ui.hint}>{row.bemerkung}</Text> : null}
                    {row.stop_event_id && row.status !== 'approved' ? (
                      <Pressable onPress={() => { setNotice(''); setEditing(row); }} hitSlop={8} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                        <Text style={styles.link}>{t('correct')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </Card>
            );
          })}
        </View>
      </ScrollView>

      {editing ? (
        <CorrectionSheet
          row={editing}
          onClose={() => setEditing(null)}
          onDone={(message) => {
            setEditing(null);
            setNotice(message);
            load();
          }}
        />
      ) : null}
    </View>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.total}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={[styles.totalValue, strong && { color: colors.brassLight }]}>{value}</Text>
    </View>
  );
}

function Zone({ label, minutes, locale }: { label: string; minutes: number; locale: 'de' | 'ru' }) {
  if (!minutes) return null;
  return (
    <View style={styles.zone}>
      <Text style={styles.zoneLabel}>{label}</Text>
      <Text style={styles.zoneValue}>{hours(locale, minutes)}</Text>
    </View>
  );
}

const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function CorrectionSheet({ row, onClose, onDone }: { row: TimesheetRow; onClose: () => void; onDone: (message: string) => void }) {
  const { t } = useApp();
  const insets = useSafeAreaInsets();
  const [start, setStart] = useState(hhmm(row.actual_start));
  const [stop, setStop] = useState(row.actual_end ? hhmm(row.actual_end) : '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const startDate = isoDate(row.actual_start);
  const valid = TIME.test(start) && TIME.test(stop);
  const pad = (value: string) => value.padStart(5, '0');
  const overnight = valid && pad(stop) <= pad(start);
  const stopDate = overnight ? addDays(startDate, 1) : startDate;

  async function submit() {
    if (!valid || !row.stop_event_id) {
      setError(t('correctInvalid'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await correctTime({
        start_event_id: row.start_event_id,
        stop_event_id: row.stop_event_id,
        start_time: `${startDate} ${pad(start)}:00`,
        stop_time: `${stopDate} ${pad(stop)}:00`,
        bemerkung: reason.trim() || undefined,
      });
      onDone(response.message);
    } catch (problem) {
      setError(errorMessage(problem, t('unknownError')));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>{t('correctTitle')}</Text>
          <Text style={ui.hint}>
            {t(`type_${row.type}`)} · {dmy(row.date)}
            {row.work_title ? ` · ${row.work_title}` : ''}
          </Text>
          <Text style={[ui.hint, { marginBottom: 14 }]}>{t('correctIntro')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label={t('correctStart')} value={start} onChangeText={setStart} keyboardType="numbers-and-punctuation" placeholder="07:00" maxLength={5} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('correctStop')} value={stop} onChangeText={setStop} keyboardType="numbers-and-punctuation" placeholder="16:00" maxLength={5} />
            </View>
          </View>
          <Text style={[ui.hint, { marginTop: -6, marginBottom: 10 }]}>{overnight ? t('correctNextDay', { date: dmy(stopDate) }) : t('correctTimeFormat')}</Text>
          <Field label={t('correctReason')} value={reason} onChangeText={setReason} multiline />
          {error ? <View style={{ marginBottom: 12 }}><Notice tone="red" text={error} /></View> : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button variant="secondary" label={t('cancel')} onPress={onClose} style={{ flex: 1 }} />
            <Button label={busy ? t('saving') : t('correctSend')} onPress={submit} busy={busy} style={{ flex: 1.4 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.ink, paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  title: { color: '#fff', fontSize: font.h1, fontWeight: '700', letterSpacing: -0.3 },
  intro: { color: '#aeb9c7', fontSize: font.small, marginTop: 6 },
  totals: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  total: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.ink2, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  totalLabel: { color: '#8f9db0', fontSize: font.tiny, fontWeight: '700' },
  totalValue: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 4 },
  days: { color: '#8f9db0', fontSize: font.tiny, marginTop: 10 },
  body: { padding: 16, gap: 12 },
  empty: { color: colors.slate, fontSize: font.body, textAlign: 'center', paddingVertical: 12 },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f7f8fb', borderBottomWidth: 1, borderBottomColor: colors.hairline },
  dayTitle: { fontWeight: '700', color: colors.ink, fontSize: font.body },
  row: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.porcelain, gap: 4 },
  rowType: { fontWeight: '700', color: colors.ink, fontSize: font.body },
  rowMinutes: { marginLeft: 'auto', fontWeight: '700', color: colors.ink, fontSize: font.body },
  rowTitle: { color: colors.slate, fontSize: font.small },
  times: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  timeText: { color: colors.slate, fontSize: font.small },
  timeActual: { color: colors.ink, fontWeight: '600' },
  zones: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  zone: { flexDirection: 'row', gap: 4, backgroundColor: colors.porcelain, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  zoneLabel: { color: colors.slate, fontSize: font.tiny },
  zoneValue: { color: colors.ink, fontSize: font.tiny, fontWeight: '700' },
  link: { color: colors.ink, fontWeight: '700', fontSize: font.small, textDecorationLine: 'underline' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,28,46,0.45)' },
  sheet: { backgroundColor: colors.porcelain, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.hairline, marginBottom: 14 },
  sheetTitle: { fontSize: font.h2, fontWeight: '700', color: colors.ink },
});
