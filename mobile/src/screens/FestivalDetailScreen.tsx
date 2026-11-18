import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import { API_ENDPOINTS } from '../constants/config';

interface RitualStep {
  id: number;
  order: number;
  title_en: string;
  title_ne: string;
  description_en: string;
  description_ne: string;
}

interface PujaItem {
  id: number;
  name_en: string;
  name_ne: string;
  quantity: string;
  is_essential: boolean;
  product_id: number | null;
  product_name: string | null;
  product_price: string | null;
}

interface FestivalDetail {
  id: number;
  slug: string;
  name_en: string;
  name_ne: string;
  description_en: string;
  description_ne: string;
  significance_en: string;
  significance_ne: string;
  date_start: string;
  date_end: string | null;
  nepali_date: string;
  ritual_steps: RitualStep[];
  puja_items: PujaItem[];
}

export default function FestivalDetailScreen({ route, navigation }: any) {
  const { slug } = route.params;
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();

  const [festival, setFestival] = useState<FestivalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [addedItems, setAddedItems] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadDetail();
  }, [slug]);

  const loadDetail = async () => {
    try {
      const res = await apiClient.get(`${API_ENDPOINTS.FESTIVALS}${slug}/`);
      setFestival(res.data);
    } catch (e) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (item: PujaItem) => {
    if (!item.product_id) return;

    if (!isAuthenticated) {
      Alert.alert(t.auth.login, 'Please log in to add items to your cart.', [
        { text: t.common.cancel },
        { text: t.auth.login, onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }

    setAddingId(item.product_id);
    try {
      await apiClient.post(API_ENDPOINTS.CART, {
        product: item.product_id,
        quantity: 1,
      });
      setAddedItems((prev) => ({ ...prev, [item.product_id!]: true }));
      Alert.alert(t.common.success, `${language === 'ne' ? item.name_ne : item.name_en} ${t.marketplace.addedToCart}`);
    } catch (e) {
      Alert.alert(t.common.error, 'Failed to add item to cart.');
    } finally {
      setAddingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!festival) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t.common.error}</Text>
      </View>
    );
  }

  const name = language === 'ne' ? festival.name_ne : festival.name_en;
  const description = language === 'ne' ? festival.description_ne : festival.description_en;
  const significance = language === 'ne' ? festival.significance_ne : festival.significance_en;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Banner / Title Header */}
      <View style={styles.headerCard}>
        <Text style={styles.festivalName}>{name}</Text>
        <Text style={styles.nepaliDate}>📅 {festival.nepali_date || festival.date_start}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>

      {/* Significance Section */}
      {significance ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📖 {t.festivals.significance}</Text>
          <Text style={styles.sectionBody}>{significance}</Text>
        </View>
      ) : null}

      {/* Ritual Steps */}
      {festival.ritual_steps && festival.ritual_steps.length > 0 ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🙏 {t.festivals.rituals}</Text>
          {festival.ritual_steps.map((step) => {
            const stepTitle = language === 'ne' ? step.title_ne : step.title_en;
            const stepDesc = language === 'ne' ? step.description_ne : step.description_en;
            return (
              <View key={step.id} style={styles.stepItem}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{step.order}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{stepTitle}</Text>
                  {stepDesc ? <Text style={styles.stepDesc}>{stepDesc}</Text> : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Puja Checklist & Marketplace Linking */}
      {festival.puja_items && festival.puja_items.length > 0 ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🪔 {t.festivals.checklist}</Text>
          {festival.puja_items.map((item) => {
            const itemName = language === 'ne' ? item.name_ne : item.name_en;
            const isAdded = item.product_id ? !!addedItems[item.product_id] : false;
            const isAdding = item.product_id === addingId;

            return (
              <View key={item.id} style={styles.checklistItem}>
                <View style={styles.checkItemInfo}>
                  <View style={styles.checkItemHeader}>
                    <Text style={styles.checkItemName}>{itemName}</Text>
                    {item.is_essential ? (
                      <View style={styles.essentialChip}>
                        <Text style={styles.essentialText}>Essential</Text>
                      </View>
                    ) : null}
                  </View>
                  {item.quantity ? (
                    <Text style={styles.checkItemQty}>Qty: {item.quantity}</Text>
                  ) : null}
                  {item.product_price ? (
                    <Text style={styles.productPriceText}>Rs. {item.product_price}</Text>
                  ) : null}
                </View>

                {/* Add to Cart button if item is linked to a product */}
                {item.product_id ? (
                  <TouchableOpacity
                    style={[styles.addToCartBtn, isAdded && styles.addedBtn]}
                    onPress={() => handleAddToCart(item)}
                    disabled={isAdding}
                  >
                    {isAdding ? (
                      <ActivityIndicator size="small" color={COLORS.textOnPrimary} />
                    ) : (
                      <Text style={styles.addToCartBtnText}>
                        {isAdded ? '✓ Added' : `+ ${t.marketplace.addToCart}`}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.bodyLarge,
  },
  headerCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  festivalName: {
    fontSize: FONT_SIZES.heading,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  nepaliDate: {
    fontSize: FONT_SIZES.body,
    color: COLORS.secondary,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  description: {
    fontSize: FONT_SIZES.bodyLarge,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  sectionBody: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    alignItems: 'flex-start',
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  stepBadgeText: {
    color: COLORS.textOnPrimary,
    fontWeight: 'bold',
    fontSize: FONT_SIZES.caption,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  stepDesc: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 20,
  },
  checklistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  checkItemInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  checkItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  checkItemName: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  essentialChip: {
    backgroundColor: '#FFF0ED',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  essentialText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '700',
  },
  checkItemQty: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  productPriceText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.secondary,
    fontWeight: 'bold',
    marginTop: 2,
  },
  addToCartBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  addedBtn: {
    backgroundColor: COLORS.success,
  },
  addToCartBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.caption,
    fontWeight: 'bold',
  },
});
