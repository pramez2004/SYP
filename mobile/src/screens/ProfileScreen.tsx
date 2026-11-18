import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation }: any) {
  const { t, language, setLanguage } = useLanguage();
  const { user, logout, changePassword } = useAuth();

  // Change password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [passMessage, setPassMessage] = useState('');
  const [passError, setPassError] = useState('');

  const isSeller = user?.role === 'seller';

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !newPassword2) {
      setPassError('Please fill in all password fields.');
      return;
    }
    if (newPassword !== newPassword2) {
      setPassError(t.auth.passwordsDoNotMatch);
      return;
    }

    setChangingPass(true);
    setPassError('');
    setPassMessage('');
    try {
      await changePassword(oldPassword, newPassword, newPassword2);
      setPassMessage(t.auth.changePasswordSuccess);
      setOldPassword('');
      setNewPassword('');
      setNewPassword2('');
      setShowPasswordForm(false);
      Alert.alert(t.common.success, t.auth.changePasswordSuccess);
    } catch (error: any) {
      const detail =
        error.response?.data?.old_password?.[0] ||
        error.response?.data?.new_password?.[0] ||
        error.response?.data?.detail ||
        t.auth.changePasswordFailed;
      setPassError(detail);
    } finally {
      setChangingPass(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(t.auth.logout, t.auth.logoutConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.auth.logout,
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* User Info Card */}
      <View style={styles.userCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>
          {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
        </Text>
        <Text style={styles.userEmail}>{user?.email}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.roleChip, isSeller ? styles.sellerChip : styles.customerChip]}>
            <Text style={[styles.roleChipText, isSeller ? styles.sellerChipText : styles.customerChipText]}>
              {isSeller ? `🏪 ${t.auth.seller}` : `👤 ${t.auth.customer}`}
            </Text>
          </View>
          {user?.city ? (
            <View style={styles.cityBadge}>
              <Text style={styles.cityBadgeText}>📍 {user.city}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Seller Portal Quick Actions (Seller Only) */}
      {isSeller ? (
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>🏪 {t.seller.sellerDashboard}</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('MyShop')}
          >
            <Text style={styles.menuItemText}>🏬 {t.seller.myShop}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('MyProducts')}
          >
            <Text style={styles.menuItemText}>📦 {t.seller.myProducts}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('SellerOrders')}
          >
            <Text style={styles.menuItemText}>📋 {t.seller.incomingOrders}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Language Switch Card */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>🌐 {t.profile.language}</Text>
        <View style={styles.langSelector}>
          <TouchableOpacity
            style={[styles.langBtn, language === 'ne' && styles.langBtnActive]}
            onPress={() => setLanguage('ne')}
          >
            <Text style={[styles.langBtnText, language === 'ne' && styles.langBtnTextActive]}>
              नेपाली
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
            onPress={() => setLanguage('en')}
          >
            <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>
              English
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Password Management */}
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.collapseHeader}
          onPress={() => setShowPasswordForm(!showPasswordForm)}
        >
          <Text style={styles.sectionHeader}>🔒 {t.auth.changePassword}</Text>
          <Text style={styles.menuArrow}>{showPasswordForm ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showPasswordForm ? (
          <View style={styles.passwordForm}>
            {passError ? <Text style={styles.errorText}>{passError}</Text> : null}
            {passMessage ? <Text style={styles.successText}>{passMessage}</Text> : null}

            <Text style={styles.inputLabel}>{t.auth.currentPassword}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.auth.currentPassword}
              placeholderTextColor={COLORS.textMuted}
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry
            />

            <Text style={styles.inputLabel}>{t.auth.newPassword}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.auth.newPassword}
              placeholderTextColor={COLORS.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <Text style={styles.inputLabel}>{t.auth.confirmPassword}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.auth.confirmPassword}
              placeholderTextColor={COLORS.textMuted}
              value={newPassword2}
              onChangeText={setNewPassword2}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.savePassBtn, changingPass && styles.btnDisabled]}
              onPress={handleChangePassword}
              disabled={changingPass}
            >
              {changingPass ? (
                <ActivityIndicator color={COLORS.textOnPrimary} />
              ) : (
                <Text style={styles.savePassBtnText}>{t.auth.changePassword}</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>🚪 {t.auth.logout}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  userCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatarText: {
    fontSize: 28,
    color: COLORS.textOnPrimary,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: FONT_SIZES.title,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  roleChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  roleChipText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
  },
  customerChip: {
    backgroundColor: '#E8F5E9',
  },
  customerChipText: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: FONT_SIZES.caption,
  },
  sellerChip: {
    backgroundColor: '#FFF0ED',
  },
  sellerChipText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: FONT_SIZES.caption,
  },
  cityBadge: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  cityBadgeText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.caption,
    fontWeight: '500',
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  sectionHeader: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  collapseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  menuItemText: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  menuArrow: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
  langSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  langBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
  },
  langBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF0ED',
  },
  langBtnText: {
    fontSize: FONT_SIZES.bodyLarge,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  langBtnTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  passwordForm: {
    marginTop: SPACING.md,
  },
  inputLabel: {
    fontSize: FONT_SIZES.body,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.xs,
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
  savePassBtn: {
    backgroundColor: COLORS.secondary,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  savePassBtnText: {
    color: COLORS.textOnPrimary,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.body,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.caption,
    marginBottom: SPACING.xs,
  },
  successText: {
    color: COLORS.success,
    fontSize: FONT_SIZES.caption,
    marginBottom: SPACING.xs,
  },
  logoutBtn: {
    backgroundColor: '#FDE8E8',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  logoutBtnText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: 'bold',
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
