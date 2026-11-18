import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const { t, language, toggleLanguage } = useLanguage();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setErrorMessage(t.auth.loginFailed);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      await login(username.trim(), password);
    } catch (error: any) {
      const msg = error.response?.data?.detail || t.auth.loginFailed;
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Language switcher button in header */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.langBadge} onPress={toggleLanguage}>
            <Text style={styles.langBadgeText}>
              {language === 'ne' ? 'English' : 'नेपाली'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoEmoji}>🪔</Text>
          <Text style={styles.title}>{t.app.name}</Text>
          <Text style={styles.subtitle}>{t.app.tagline}</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.auth.login}</Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.auth.username}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.auth.username}
              placeholderTextColor={COLORS.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.auth.password}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.auth.password}
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textOnPrimary} />
            ) : (
              <Text style={styles.loginBtnText}>{t.auth.signIn}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerLinkText}>{t.auth.dontHaveAccount}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: SPACING.md,
  },
  langBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langBadgeText: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.primary,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoEmoji: {
    fontSize: 54,
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.heading,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  cardTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  errorBox: {
    backgroundColor: '#FDE8E8',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.body,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.body,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.bodyLarge,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceElevated,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: 'bold',
  },
  registerLink: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  registerLinkText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
});
