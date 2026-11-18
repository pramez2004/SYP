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
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }: any) {
  const { t } = useLanguage();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  // ONLY customer or seller — NEVER admin
  const [role, setRole] = useState<'customer' | 'seller'>('customer');
  const [city, setCity] = useState(APP_CONFIG.SUPPORTED_CITIES[0]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      setErrorMessage(t.auth.registrationFailed);
      return;
    }

    if (password !== password2) {
      setErrorMessage(t.auth.passwordsDoNotMatch);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      await register({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        password2,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim(),
        role,
        city,
      });
    } catch (error: any) {
      const data = error.response?.data;
      if (typeof data === 'object') {
        const firstErrorKey = Object.keys(data)[0];
        const val = data[firstErrorKey];
        const msg = Array.isArray(val) ? val[0] : typeof val === 'string' ? val : t.auth.registrationFailed;
        setErrorMessage(`${firstErrorKey}: ${msg}`);
      } else {
        setErrorMessage(t.auth.registrationFailed);
      }
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t.auth.register}</Text>
          <Text style={styles.subtitle}>{t.app.tagline}</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Role Selection Tabs (Customer vs Seller Only) */}
          <Text style={styles.label}>{t.auth.selectRole}</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleOption, role === 'customer' && styles.roleOptionSelected]}
              onPress={() => setRole('customer')}
            >
              <Text
                style={[
                  styles.roleOptionText,
                  role === 'customer' && styles.roleOptionTextSelected,
                ]}
              >
                👤 {t.auth.customer}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleOption, role === 'seller' && styles.roleOptionSelected]}
              onPress={() => setRole('seller')}
            >
              <Text
                style={[
                  styles.roleOptionText,
                  role === 'seller' && styles.roleOptionTextSelected,
                ]}
              >
                🏪 {t.auth.seller}
              </Text>
            </TouchableOpacity>
          </View>

          {/* User Fields */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.auth.username} *</Text>
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
            <Text style={styles.label}>{t.auth.email} *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. puja@gmail.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfCol]}>
              <Text style={styles.label}>{t.auth.firstName}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.auth.firstName}
                placeholderTextColor={COLORS.textMuted}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>

            <View style={[styles.inputGroup, styles.halfCol]}>
              <Text style={styles.label}>{t.auth.lastName}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.auth.lastName}
                placeholderTextColor={COLORS.textMuted}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.auth.phone}</Text>
            <TextInput
              style={styles.input}
              placeholder="9800000000"
              placeholderTextColor={COLORS.textMuted}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          {/* City Selection */}
          <Text style={styles.label}>{t.auth.city}</Text>
          <View style={styles.cityChips}>
            {APP_CONFIG.SUPPORTED_CITIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.cityChip, city === c && styles.cityChipSelected]}
                onPress={() => setCity(c)}
              >
                <Text
                  style={[
                    styles.cityChipText,
                    city === c && styles.cityChipTextSelected,
                  ]}
                >
                  📍 {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Passwords */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.auth.password} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t.auth.password}
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t.auth.confirmPassword} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t.auth.confirmPassword}
              placeholderTextColor={COLORS.textMuted}
              value={password2}
              onChangeText={setPassword2}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.registerBtn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textOnPrimary} />
            ) : (
              <Text style={styles.registerBtnText}>{t.auth.signUp}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginLinkText}>{t.auth.alreadyHaveAccount}</Text>
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
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
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
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
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
  roleContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  roleOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
  },
  roleOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF0ED',
  },
  roleOptionText: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  roleOptionTextSelected: {
    color: COLORS.primary,
  },
  cityChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  cityChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceElevated,
  },
  cityChipSelected: {
    borderColor: COLORS.secondary,
    backgroundColor: '#FDF0F5',
  },
  cityChipText: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  cityChipTextSelected: {
    color: COLORS.secondary,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  halfCol: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: SPACING.sm,
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
  registerBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  registerBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  loginLinkText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
  },
});
