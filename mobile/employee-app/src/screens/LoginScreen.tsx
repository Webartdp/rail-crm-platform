import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { errorMessage, forgotPassword, login } from '../api';
import type { Locale, Params } from '../i18n';
import { TrackIcon } from '../icons';
import { colors, font } from '../theme';
import type { AuthUser } from '../types';
import { Button, Field, Notice, Segmented } from '../ui';

type Props = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Params) => string;
  onLoggedIn: (user: AuthUser) => void;
  initialNotice?: string;
};

export default function LoginScreen({ locale, setLocale, t, onLoggedIn, initialNotice }: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'red' | 'green' | 'amber'; text: string } | null>(
    initialNotice ? { tone: 'amber', text: initialNotice } : null,
  );

  async function submitLogin() {
    if (!email.trim() || !password) {
      setNotice({ tone: 'red', text: t('loginMissing') });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const user = await login(email.trim(), password);
      onLoggedIn(user);
    } catch (error) {
      setNotice({ tone: 'red', text: errorMessage(error, t('loginFailed')) });
    } finally {
      setBusy(false);
    }
  }

  async function submitForgot() {
    if (!email.trim()) {
      setNotice({ tone: 'red', text: t('loginMissing') });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const response = await forgotPassword(email.trim());
      setNotice({ tone: 'green', text: `${response.message}\n${t('forgotNoMailHint')}` });
    } catch (error) {
      setNotice({ tone: 'red', text: errorMessage(error, t('unknownError')) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.ink }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, { paddingTop: insets.top + 28 }]}>
          <View style={styles.heroTop}>
            <View style={styles.logo}>
              <TrackIcon color={colors.brassLight} size={30} />
            </View>
            <View style={styles.langBox}>
              <Segmented<Locale>
                value={locale}
                onChange={setLocale}
                options={[
                  { value: 'de', label: 'DE' },
                  { value: 'ru', label: 'RU' },
                ]}
              />
            </View>
          </View>
          <Text style={styles.brand}>Rail CRM</Text>
          <Text style={styles.subtitle}>{t('appSubtitle')}</Text>
        </View>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.title}>{mode === 'login' ? t('loginTitle') : t('forgotTitle')}</Text>
          <Text style={styles.intro}>{mode === 'login' ? t('loginIntro') : t('forgotIntro')}</Text>

          {notice ? <View style={{ marginBottom: 14 }}><Notice text={notice.text} tone={notice.tone} /></View> : null}

          <Field
            label={t('email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            returnKeyType={mode === 'login' ? 'next' : 'send'}
            onSubmitEditing={mode === 'forgot' ? submitForgot : undefined}
          />

          {mode === 'login' ? (
            <View>
              <Field
                label={t('password')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submitLogin}
              />
              <Pressable onPress={() => setShowPassword((value) => !value)} style={styles.showPassword} hitSlop={10}>
                <Text style={styles.link}>{showPassword ? t('hidePassword') : t('showPassword')}</Text>
              </Pressable>
            </View>
          ) : null}

          <Button
            big
            label={mode === 'login' ? (busy ? t('loggingIn') : t('loginButton')) : t('forgotSend')}
            onPress={mode === 'login' ? submitLogin : submitForgot}
            busy={busy}
            style={{ marginTop: 6 }}
          />

          <Pressable
            onPress={() => {
              setMode(mode === 'login' ? 'forgot' : 'login');
              setNotice(null);
            }}
            style={styles.switchMode}
            hitSlop={10}
          >
            <Text style={styles.link}>{mode === 'login' ? t('forgotPassword') : t('forgotBack')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 24, paddingBottom: 34 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 },
  logo: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.ink2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langBox: { width: 112 },
  brand: { color: '#fff', fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: '#aeb9c7', fontSize: font.body, marginTop: 4 },
  sheet: {
    flexGrow: 1,
    backgroundColor: colors.porcelain,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 28,
  },
  title: { fontSize: font.h1, fontWeight: '700', color: colors.ink, letterSpacing: -0.3 },
  intro: { fontSize: font.body, color: colors.slate, marginTop: 6, marginBottom: 20, lineHeight: 21 },
  showPassword: { position: 'absolute', right: 12, top: 0 },
  switchMode: { alignSelf: 'center', marginTop: 20, padding: 6 },
  link: { color: colors.ink, fontWeight: '700', fontSize: font.small, textDecorationLine: 'underline' },
});

