import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { APP_CONFIG, API_ENDPOINTS } from '../constants/config';
import { useLanguage } from '../context/LanguageContext';
import apiClient from '../services/apiClient';

interface Shop {
  id: number;
  name: string;
  description: string;
  phone: string;
  city: string;
  address: string;
  is_verified: boolean;
  is_active: boolean;
  rating: string;
  total_reviews: number;
}

export default function MyShopScreen() {
  const { t } = useLanguage();

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState(APP_CONFIG.SUPPORTED_CITIES[0]);
  const [address, setAddress] = useState('');

  useEffect(() => {
    loadShop();
  }, []);

  const loadShop = async () => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.SHOPS);
      const shops = res.data.results || res.data;
      if (Array.isArray(shops) && shops.length > 0) {
        // Fetch detail of the seller's shop
        const detailRes = await apiClient.get(`${API_ENDPOINTS.SHOPS}${shops[0].id}/`);
        const s: Shop = detailRes.data;
        setShop(s);
        setName(s.name || '');
        setDescription(s.description || '');
        setPhone(s.phone || '');
        setCity(s.city || APP_CONFIG.SUPPORTED_CITIES[0]);
        setAddress(s.address || '');
      } else {
        setShop(null);
      }
    } catch (e) {
      setShop(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !phone.trim() || !city) {
      Alert.alert(t.common.error, 'Please fill in shop name, contact phone, and city.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        phone: phone.trim(),
        city,
        address: address.trim(),
      };

      if (shop) {
        // Update existing shop
        const res = await apiClient.patch(`${API_ENDPOINTS.SHOPS}${shop.id}/`, payload);
        setShop(res.data);
        Alert.alert(t.common.success, 'Shop updated successfully!');
      } else {
        // Create new shop
        const res = await apiClient.post(API_ENDPOINTS.SHOPS, payload);
        setShop(res.data);
        Alert.alert(
          t.common.success,
          'Shop registered! An admin will review and verify your shop shortly.'
        );
      }
    } catch (error: any) {
      const detail = error.response?.data?.detail || 'Failed to save shop.';
      Alert.alert(t.common.error, detail);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Verification Status Banner if shop exists */}
      {shop ? (
        <View
          style={[
            styles.bannerCard,
            shop.is_verified ? styles.verifiedBanner : styles.pendingBanner,
          ]}
        >
          <Text style={styles.bannerEmoji}>{shop.is_verified ? '🛡️' : '⏳'}</Text>
          <View style={styles.bannerTextContainer}>
            <Text
              style={[
                styles.bannerTitle,
                shop.is_verified ? styles.verifiedText : styles.pendingText,
              ]}
            >
              {shop.is_verified ? t.seller.verifiedBadge : t.seller.unverifiedBadge}
            </Text>
            {!shop.is_verified ? (
              <Text style={styles.bannerSubtitle}>{t.seller.shopPendingVerification}</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Shop Form Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{shop ? t.seller.editShop : t.seller.createShop}</Text>

        <Text style={styles.label}>{t.seller.shopName} *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Mandala Puja Store"
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>{t.seller.shopCity} *</Text>
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

        <Text style={styles.label}>{t.seller.shopPhone} *</Text>
        <TextInput
          style={styles.input}
          placeholder="9800000000"
          placeholderTextColor={COLORS.textMuted}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>{t.seller.shopAddress}</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Ward 4, Golchha Chowk"
          placeholderTextColor={COLORS.textMuted}
          value={address}
          onChangeText={setAddress}
        />

        <Text style={styles.label}>{t.seller.shopDesc}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Specializing in authentic puja essentials..."
          placeholderTextColor={COLORS.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.textOnPrimary} />
          ) : (
            <Text style={styles.saveBtnText}>{t.seller.saveShop}</Text>
          )}
        </TouchableOpacity>
      </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  verifiedBanner: {
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
  },
  pendingBanner: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE082',
  },
  bannerEmoji: {
    fontSize: 32,
    marginRight: SPACING.sm,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: 'bold',
  },
  verifiedText: {
    color: '#2E7D32',
  },
  pendingText: {
    color: '#F57F17',
  },
  bannerSubtitle: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.title,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.body,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
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
  textArea: {
    height: 75,
    textAlignVertical: 'top',
  },
  cityChips: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  cityChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceElevated,
  },
  cityChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF0ED',
  },
  cityChipText: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
  },
  cityChipTextSelected: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  saveBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: 'bold',
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
