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
import apiClient from '../services/apiClient';
import { API_ENDPOINTS } from '../constants/config';

export default function ForgotPasswordScreen({ navigation }: any) {
  const { t, language, toggleLanguage } = useLanguage();

  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [uid, setUid] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleRequestReset = async () => {
    if (!email.trim()) {
      setErrorMessage(t.common.required);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setMessage('');
    try {
      await apiClient.post(API_ENDPOINTS.PASSWORD_RESET, {
        email: email.trim(),
      });
      setMessage(t.auth.resetLinkSent);
      setStep('confirm');
    } catch (error: any) {
      const err = error.response?.data?.email?.[0] || error.response?.data?.detail || t.common.error;
      setErrorMessage(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!uid.trim() || !token.trim() || !newPassword.trim() || !newPassword2.trim()) {
      setErrorMessage(t.common.required);
      return;
    }

    if (newPassword !== newPassword2) {
      setErrorMessage(t.auth.passwordsDoNotMatch);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setMessage('');
    try {
      await apiClient.post(API_ENDPOINTS.PASSWORD_RESET_CONFIRM, {
        uid: uid.trim(),
        token: token.trim(),
        new_password: newPassword,
        new_password2: newPassword2,
      });

      Alert.alert(t.common.success, t.auth.resetPasswordSuccess, [
        {
          text: t.common.confirm,
          onPress: () => navigation.navigate('Login'),
        },
      ]);
    } catch (error: any) {
      const data = error.response?.data;
      const err =
        data?.detail ||
        data?.new_password?.[0] ||
        data?.new_password2?.[0] ||
        data?.token?.[0] ||
        data?.uid?.[0] ||
        t.auth.resetPasswordFailed;
      setErrorMessage(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Language Switcher */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.langBadge} onPress={toggleLanguage}>
            <Text style={styles.langBadgeText}>
              🌐 {language === 'en' ? 'नेपाली' : 'English'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoEmoji}>🔐</Text>
          <Text style={styles.appTitle}>
            {language === 'ne' ? 'चाडबाड' : 'Chaad Baad'}
          </Text>
          <Text style={styles.subtitle}>{t.auth.resetPassword}</Text>
        </View>

        {/* Card Form */}
        <View style={styles.card}>
          {/* Step Selector Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, step === 'request' && styles.tabBtnActive]}
              onPress={() => {
                setStep('request');
                setErrorMessage('');
              }}
            >
              <Text
                style={[styles.tabBtnText, step === 'request' && styles.tabBtnTextActive]}
              >
                1. {t.auth.sendResetLink}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, step === 'confirm' && styles.tabBtnActive]}
              onPress={() => {
                setStep('confirm');
                setErrorMessage('');
              }}
            >
              <Text
                style={[styles.tabBtnText, step === 'confirm' && styles.tabBtnTextActive]}
              >
                2. {t.auth.resetPassword}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Messages */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {message ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{message}</Text>
            </View>
          ) : null}

          {step === 'request' ? (
            /* Step 1: Request Reset */
            <View>
              <Text style={styles.instructionText}>
                {t.auth.resetLinkSent}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t.auth.email}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t.auth.email}
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.btnDisabled]}
                onPress={handleRequestReset}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.textOnPrimary} />
                ) : (
                  <Text style={styles.submitBtnText}>{t.auth.sendResetLink}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleStepLink}
                onPress={() => {
                  setStep('confirm');
                  setErrorMessage('');
                }}
              >
                <Text style={styles.toggleStepText}>{t.auth.haveResetToken}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Step 2: Confirm Reset */
            <View>
              <Text style={styles.instructionText}>
                {t.auth.enterResetDetails}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t.auth.resetUid}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t.auth.resetUid}
                  placeholderTextColor={COLORS.textMuted}
                  value={uid}
                  onChangeText={setUid}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t.auth.resetToken}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t.auth.resetToken}
                  placeholderTextColor={COLORS.textMuted}
                  value={token}
                  onChangeText={setToken}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t.auth.newPassword}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t.auth.newPassword}
                  placeholderTextColor={COLORS.textMuted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t.auth.confirmPassword}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t.auth.confirmPassword}
                  placeholderTextColor={COLORS.textMuted}
                  value={newPassword2}
                  onChangeText={setNewPassword2}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.btnDisabled]}
                onPress={handleConfirmReset}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.textOnPrimary} />
                ) : (
                  <Text style={styles.submitBtnText}>{t.auth.resetPassword}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleStepLink}
                onPress={() => {
                  setStep('request');
                  setErrorMessage('');
                }}
              >
                <Text style={styles.toggleStepText}>{t.auth.requestNewToken}</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.backLinkText}>← {t.auth.backToLogin}</Text>
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
  appTitle: {
    fontSize: FONT_SIZES.title,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
  },
  tabBtnText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabBtnTextActive: {
    color: COLORS.textOnPrimary,
  },
  instructionText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
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
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceElevated,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
    ...SHADOWS.sm,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: 'bold',
  },
  toggleStepLink: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  toggleStepText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.body,
    fontWeight: '500',
  },
  backLink: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  backLinkText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.body,
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.caption,
  },
  successBox: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  successText: {
    color: '#2E7D32',
    fontSize: FONT_SIZES.caption,
  },
});
