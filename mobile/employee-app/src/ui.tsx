import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';
import { dateFromIso, dmy, localIsoDate } from './i18n';
import { colors, font, radius } from './theme';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={styles.tick} />
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitleText}>{children}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'brass' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  busy?: boolean;
  big?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', disabled, busy, big, style }: ButtonProps) {
  const palette = {
    primary: { bg: colors.ink, fg: '#fff', border: colors.ink },
    brass: { bg: colors.brass, fg: '#fff', border: colors.brass },
    secondary: { bg: colors.paper, fg: colors.ink, border: colors.hairline },
    danger: { bg: colors.paper, fg: colors.red, border: '#f1c7c2' },
    ghost: { bg: 'transparent', fg: colors.ink, border: 'transparent' },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || busy) }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        big && styles.buttonBig,
        { backgroundColor: palette.bg, borderColor: palette.border },
        (disabled || busy) && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={palette.fg} style={{ marginRight: 8 }} /> : null}
      <Text style={[styles.buttonText, big && styles.buttonTextBig, { color: palette.fg }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({ label, hint, style, ...input }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.slate2}
        {...input}
        style={[styles.input, input.multiline && styles.inputMultiline, style]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: Boolean(active) }}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const BADGE_TONES = {
  neutral: { bg: colors.porcelain, fg: colors.slate },
  green: { bg: colors.greenSoft, fg: colors.green },
  amber: { bg: colors.amberSoft, fg: colors.amber },
  red: { bg: colors.redSoft, fg: colors.red },
  blue: { bg: colors.blueSoft, fg: colors.blue },
  brass: { bg: colors.brassSoft, fg: '#7a5d22' },
};

export type Tone = keyof typeof BADGE_TONES;

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const palette = BADGE_TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

export function Notice({ text, tone = 'neutral', action }: { text: string; tone?: Tone; action?: { label: string; onPress: () => void } }) {
  const palette = BADGE_TONES[tone];
  return (
    <View style={[styles.notice, { backgroundColor: palette.bg, borderColor: palette.fg + '33' }]}>
      <Text style={[styles.noticeText, { color: palette.fg }]}>{text}</Text>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text style={[styles.noticeAction, { color: palette.fg }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Date picker field: shows dd.mm.yyyy, opens the native calendar. */
export function DateField({ label, value, onChange, minimum, maximum }: { label: string; value: string; onChange: (iso: string) => void; minimum?: string; maximum?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.field, { flex: 1 }]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={styles.input} accessibilityRole="button">
        <Text style={styles.inputText}>{dmy(value)}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={dateFromIso(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimum ? dateFromIso(minimum) : undefined}
          maximumDate={maximum ? dateFromIso(maximum) : undefined}
          onChange={(event, date) => {
            if (Platform.OS !== 'ios') setOpen(false);
            if (event.type === 'set' && date) {
              onChange(localIsoDate(date));
              if (Platform.OS === 'ios') setOpen(false);
            }
            if (event.type === 'dismissed') setOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>{children}</View>;
}

export function KeyValue({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvValue}>{value || '—'}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: 16,
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  tick: { width: 3, height: 18, borderRadius: 2, backgroundColor: colors.brass, marginTop: 2 },
  sectionTitleText: { fontSize: font.h3, fontWeight: '700', color: colors.ink },
  hint: { fontSize: font.small, color: colors.slate, marginTop: 4, lineHeight: 18 },
  button: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBig: { minHeight: 64, borderRadius: radius.lg, paddingVertical: 14 },
  buttonText: { fontSize: font.body, fontWeight: '700', textAlign: 'center' },
  buttonTextBig: { fontSize: 17 },
  field: { marginBottom: 12 },
  label: { fontSize: font.small, fontWeight: '600', color: colors.slate, marginBottom: 6 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.paper,
    fontSize: font.body,
    color: colors.text,
    justifyContent: 'center',
  },
  inputText: { fontSize: font.body, color: colors.text },
  inputMultiline: { minHeight: 92, textAlignVertical: 'top' },
  segmented: { flexDirection: 'row', backgroundColor: '#e8ecf1', borderRadius: radius.md, padding: 3 },
  segment: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.paper, shadowColor: colors.ink, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { fontSize: font.small, fontWeight: '600', color: colors.slate },
  segmentTextActive: { color: colors.ink },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.paper },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: font.small, fontWeight: '600', color: colors.ink },
  chipTextActive: { color: '#fff' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontSize: font.tiny, fontWeight: '700' },
  notice: { borderRadius: radius.md, borderWidth: 1, padding: 12, gap: 6 },
  noticeText: { fontSize: font.small, lineHeight: 19, fontWeight: '500' },
  noticeAction: { fontSize: font.small, fontWeight: '700', textDecorationLine: 'underline' },
  kv: { flexBasis: '47%', flexGrow: 1, gap: 2 },
  kvLabel: { fontSize: font.tiny, color: colors.slate, fontWeight: '600' },
  kvValue: { fontSize: font.body, color: colors.text, fontWeight: '600' },
});
