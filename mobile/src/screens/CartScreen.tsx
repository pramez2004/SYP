import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { APP_CONFIG, API_ENDPOINTS } from '../constants/config';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';

interface CartItem {
  id: number;
  product: number;
  quantity: number;
  line_total: string;
  product_detail?: {
    id: number;
    name_en: string;
    name_ne: string;
    effective_price: string;
    shop_name: string;
    shop_city: string;
  };
}

export default function CartScreen({ navigation }: any) {
  const { t, language } = useLanguage();
  const { user, isAuthenticated } = useAuth();

  const [items, setItems] = useState<CartItem[]>([]);
  const [cartTotal, setCartTotal] = useState('0.00');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  // Delivery form state
  const [deliveryCity, setDeliveryCity] = useState(user?.city || APP_CONFIG.SUPPORTED_CITIES[0]);
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
  const [deliveryPhone, setDeliveryPhone] = useState(user?.phone_number || '');
  const [customerNote, setCustomerNote] = useState('');

  const loadCart = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiClient.get(API_ENDPOINTS.CART);
      setItems(res.data.items || []);
      setCartTotal(res.data.cart_total || '0.00');
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const handleRemoveItem = async (itemId: number) => {
    try {
      await apiClient.delete(`${API_ENDPOINTS.CART}${itemId}/`);
      loadCart();
    } catch (e) {
      Alert.alert(t.common.error, 'Could not remove item.');
    }
  };

  const handleCheckout = async () => {
    if (!deliveryCity || !deliveryAddress.trim() || !deliveryPhone.trim()) {
      Alert.alert(t.common.error, 'Please fill in delivery city, address, and contact phone.');
      return;
    }

    setPlacingOrder(true);
    try {
      const res = await apiClient.post(`${API_ENDPOINTS.CART}checkout/`, {
        delivery_city: deliveryCity,
        delivery_address: deliveryAddress.trim(),
        delivery_phone: deliveryPhone.trim(),
        customer_note: customerNote.trim(),
      });

      Alert.alert(
        t.common.success,
        t.cart.orderSuccess,
        [{ text: 'OK', onPress: () => navigation.navigate('Orders') }]
      );
      loadCart();
    } catch (error: any) {
      const detail = error.response?.data?.detail || t.cart.orderFailed;
      Alert.alert(t.common.error, detail);
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>{t.cart.title}</Text>
        <Text style={styles.emptySubtitle}>Please log in to view your cart.</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.primaryBtnText}>{t.auth.login}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.centerContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCart(); }} />}
      >
        <Text style={styles.emptyEmoji}>🛒</Text>
        <Text style={styles.emptyTitle}>{t.cart.emptyCart}</Text>
        <Text style={styles.emptySubtitle}>{t.cart.emptyCartMsg}</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Marketplace')}
        >
          <Text style={styles.primaryBtnText}>{t.marketplace.products}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCart(); }} />}
      >
        <Text style={styles.pageTitle}>{t.cart.title} ({items.length})</Text>

        {/* Cart Item Cards */}
        {items.map((item) => {
          const detail = item.product_detail;
          const prodName = detail ? (language === 'ne' ? detail.name_ne : detail.name_en) : 'Product';
          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>{prodName}</Text>
                {detail?.shop_name ? (
                  <Text style={styles.itemShop}>🏪 {detail.shop_name} ({detail.shop_city})</Text>
                ) : null}
                <Text style={styles.itemPrice}>
                  Rs. {detail?.effective_price || ''} × {item.quantity}
                </Text>
              </View>

              <View style={styles.itemRight}>
                <Text style={styles.itemLineTotal}>Rs. {item.line_total}</Text>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleRemoveItem(item.id)}
                >
                  <Text style={styles.deleteBtnText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>{t.cart.subtotal}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t.cart.subtotal}</Text>
            <Text style={styles.summaryVal}>Rs. {cartTotal}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t.cart.deliveryFee}</Text>
            <Text style={styles.freeText}>{t.cart.freeDelivery}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>{t.cart.total}</Text>
            <Text style={styles.totalVal}>Rs. {cartTotal}</Text>
          </View>
          <Text style={styles.codBadge}>💵 {t.orders.cashOnDelivery}</Text>
        </View>

        {/* Delivery Information Form */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>📍 {t.cart.deliveryDetails}</Text>

          <Text style={styles.inputLabel}>{t.cart.deliveryCity} *</Text>
          <View style={styles.cityChips}>
            {APP_CONFIG.SUPPORTED_CITIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.cityChip, deliveryCity === c && styles.cityChipSelected]}
                onPress={() => setDeliveryCity(c)}
              >
                <Text
                  style={[
                    styles.cityChipText,
                    deliveryCity === c && styles.cityChipTextSelected,
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>{t.cart.deliveryAddress} *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Purano Buspark, Damak-5"
            placeholderTextColor={COLORS.textMuted}
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
          />

          <Text style={styles.inputLabel}>{t.cart.deliveryPhone} *</Text>
          <TextInput
            style={styles.input}
            placeholder="9800000000"
            placeholderTextColor={COLORS.textMuted}
            value={deliveryPhone}
            onChangeText={setDeliveryPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.inputLabel}>{t.cart.customerNote}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Optional instructions for delivery"
            placeholderTextColor={COLORS.textMuted}
            value={customerNote}
            onChangeText={setCustomerNote}
            multiline
            numberOfLines={2}
          />

          <TouchableOpacity
            style={[styles.checkoutBtn, placingOrder && styles.btnDisabled]}
            onPress={handleCheckout}
            disabled={placingOrder}
          >
            {placingOrder ? (
              <ActivityIndicator color={COLORS.textOnPrimary} />
            ) : (
              <Text style={styles.checkoutBtnText}>
                {t.cart.placeOrder} — Rs. {cartTotal}
              </Text>
            )}
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
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  emptyEmoji: {
    fontSize: 54,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  pageTitle: {
    fontSize: FONT_SIZES.title,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  itemLeft: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  itemName: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  itemShop: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: FONT_SIZES.body,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemLineTotal: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  deleteBtn: {
    padding: SPACING.xs,
    marginTop: SPACING.xs,
  },
  deleteBtnText: {
    fontSize: 18,
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.md,
    ...SHADOWS.sm,
  },
  cardHeading: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
  },
  summaryVal: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  freeText: {
    color: COLORS.success,
    fontWeight: '600',
    fontSize: FONT_SIZES.body,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
  },
  totalLabel: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  totalVal: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  codBadge: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.caption,
    color: COLORS.secondary,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: '#FDF0F5',
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  inputLabel: {
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
    height: 60,
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
  checkoutBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  checkoutBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: 'bold',
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  primaryBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: 'bold',
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
