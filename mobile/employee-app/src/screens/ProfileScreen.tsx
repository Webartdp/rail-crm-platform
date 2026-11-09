import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { changePassword, errorMessage } from '../api';
import { useApp } from '../AppContext';
import { APP_VERSION, WEB_URL } from '../config';
import type { Locale } from '../i18n';
import { flushQueue, getQueue, subscribeQueue } from '../offlineQueue';
import { colors, font, radius } from '../theme';
import { Button, Card, Field, Notice, SectionTitle, Segmented, styles as ui } from '../ui';

export default function ProfileScreen() {
  const { t, locale, setLocale, user, signOut } = useApp();
  const insets = useSafeAreaInsets();
  const [queueCount, setQueueCount] = useState(getQueue().length);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'green' | 'red'; text: string } | null>(null);

  useEffect(() => subscribeQueue((queue) => setQueueCount(queue.length)), []);

  async function submitPassword() {
    if (next !== repeat) {
      setNotice({ tone: 'red', text: t('passwordMismatch') });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const response = await changePassword(current, next, repeat);
      setNotice({ tone: 'green', text: response.message });
      setCurrent('');
      setNext('');
      setRepeat('');
    } catch (error) {
      setNotice({ tone: 'red', text: errorMessage(error, t('unknownError')) });
    } finally {
      setBusy(false);
    }
  }

  function confirmLogout() {
    const text = queueCount ? t('logoutPending', { count: queueCount }) : t('logoutConfirm');
    Alert.alert(t('logout'), text, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: () => { signOut(); } },
    ]);
  }

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const version = APP_VERSION;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.porcelain }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.header, { paddingTop: insets.top + 22 }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.meta}>{user.email}</Text>
            <Text style={styles.meta}>{t(`role_${user.role}`)}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Card>
            <SectionTitle>{t('language')}</SectionTitle>
            <Segmented<Locale>
              value={locale}
              onChange={setLocale}
              options={[
                { value: 'de', label: t('german') },
                { value: 'ru', label: t('russian') },
              ]}
            />
          </Card>

          <Card>
            <SectionTitle hint={queueCount ? t('offlinePending', { count: queueCount }) : t('offlineQueueEmpty')}>{t('offlineQueue')}</SectionTitle>
            {queueCount ? <Button variant="secondary" label={t('offlineSendNow')} onPress={() => { flushQueue(); }} /> : null}
          </Card>

          <Card>
            <SectionTitle hint={t('passwordRules')}>{t('changePassword')}</SectionTitle>
            <Field label={t('currentPassword')} value={current} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" textContentType="password" />
            <Field label={t('newPassword')} value={next} onChangeText={setNext} secureTextEntry autoCapitalize="none" textContentType="newPassword" />
            <Field label={t('repeatPassword')} value={repeat} onChangeText={setRepeat} secureTextEntry autoCapitalize="none" textContentType="newPassword" />
            {notice ? <View style={{ marginBottom: 12 }}><Notice tone={notice.tone} text={notice.text} /></View> : null}
            <Button label={busy ? t('saving') : t('save')} onPress={submitPassword} busy={busy} disabled={!current || !next || !repeat} />
          </Card>

          <Card>
            <Text style={ui.hint}>{t('webHint')}</Text>
            <Button variant="secondary" label={t('openWebsite')} onPress={() => Linking.openURL(WEB_URL)} style={{ marginTop: 12 }} />
          </Card>

          <Button variant="danger" label={t('logout')} onPress={confirmLogout} />
          <Text style={styles.version}>Rail CRM · {t('version', { version })}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.ink, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 58, height: 58, borderRadius: radius.lg, backgroundColor: colors.brass, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 21, fontWeight: '700' },
  name: { color: '#fff', fontSize: font.h2, fontWeight: '700' },
  meta: { color: '#aeb9c7', fontSize: font.small, marginTop: 2 },
  body: { padding: 16, gap: 14 },
  version: { textAlign: 'center', color: colors.slate2, fontSize: font.tiny, marginTop: 4 },
});
