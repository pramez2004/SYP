import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import { API_ENDPOINTS } from '../constants/config';

interface Order {
  id: number;
  status: string;
  shop_name: string;
  total: string;
  item_count: number;
  payment_method: string;
  is_paid: boolean;
  placed_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  placed: COLORS.statusPlaced,
  confirmed: COLORS.statusConfirmed,
  packed: COLORS.statusPacked,
  out_for_delivery: COLORS.statusDelivery,
  delivered: COLORS.statusDelivered,
  cancelled: COLORS.statusCancelled,
};

const STATUS_EMOJIS: Record<string, string> = {
  placed: '📋',
  confirmed: '✅',
  packed: '📦',
  out_for_delivery: '🚚',
  delivered: '🎉',
  cancelled: '❌',
};

export default function OrdersScreen({ navigation }: any) {
  const { t, language } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const isSeller = user?.role === 'seller';

  useEffect(() => {
    if (isAuthenticated) loadOrders();
    else setLoading(false);
  }, [isAuthenticated]);

  const loadOrders = async () => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.ORDERS);
      setOrders(res.data.results || res.data || []);
    } catch (e) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }, []);

  const handleCancelOrder = (orderId: number) => {
    Alert.alert(t.orders.cancelOrder, t.orders.cancelOrderConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.confirm,
        style: 'destructive',
        onPress: async () => {
          setCancellingId(orderId);
          try {
            await apiClient.post(`${API_ENDPOINTS.ORDERS}${orderId}/cancel/`);
            Alert.alert(t.common.success, t.orders.cancelOrderSuccess);
            loadOrders();
          } catch (e: any) {
            const detail = e.response?.data?.detail || t.orders.cancelFailed;
            Alert.alert(t.common.error, detail);
          } finally {
            setCancellingId(null);
          }
        },
      },
    ]);
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      placed: t.orders.placed,
      confirmed: t.orders.confirmed,
      packed: t.orders.packed,
      out_for_delivery: t.orders.outForDelivery,
      delivered: t.orders.delivered,
      cancelled: t.orders.cancelled,
    };
    return statusLabels[status] || status;
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.emptyEmoji}>🔒</Text>
        <Text style={styles.emptyText}>{t.orders.loginToView}</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>{t.auth.login}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t.orders.title}</Text>
        {isSeller ? (
          <TouchableOpacity
            style={styles.sellerOrdersLink}
            onPress={() => navigation.navigate('SellerOrders')}
          >
            <Text style={styles.sellerOrdersLinkText}>🏪 {t.seller.incomingOrders}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyText}>{t.orders.noOrders}</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('Marketplace')}
          >
            <Text style={styles.shopButtonText}>{t.orders.browseMarketplace}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.ordersList}>
          {orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>#{order.id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[order.status] || COLORS.textSecondary) + '20' }]}>
                  <Text style={styles.statusEmoji}>{STATUS_EMOJIS[order.status] || '📋'}</Text>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[order.status] || COLORS.textSecondary }]}>
                    {getStatusLabel(order.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.orderShop}>🏪 {order.shop_name}</Text>

              <View style={styles.orderFooter}>
                <Text style={styles.orderItems}>
                  {order.item_count} {t.orders.itemsCount}
                </Text>
                <Text style={styles.orderTotal}>Rs. {order.total}</Text>
              </View>

              <View style={styles.cardBottomRow}>
                <Text style={styles.orderDate}>
                  {new Date(order.placed_at).toLocaleDateString(
                    language === 'ne' ? 'ne-NP' : 'en-US',
                    { year: 'numeric', month: 'short', day: 'numeric' },
                  )}
                </Text>

                {/* Cancel Button for customer while order is in 'placed' status */}
                {order.status === 'placed' ? (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleCancelOrder(order.id)}
                    disabled={cancellingId === order.id}
                  >
                    {cancellingId === order.id ? (
                      <ActivityIndicator size="small" color={COLORS.error} />
                    ) : (
                      <Text style={styles.cancelBtnText}>{t.orders.cancelOrder}</Text>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.heading,
    fontWeight: '800',
    color: COLORS.primary,
  },
  sellerOrdersLink: {
    backgroundColor: '#FFF0ED',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  sellerOrdersLinkText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.caption,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.bodyLarge,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  loginButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: '700',
  },
  shopButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  shopButtonText: {
    color: COLORS.textOnPrimary,
    fontWeight: '600',
    fontSize: FONT_SIZES.body,
  },
  ordersList: {
    paddingHorizontal: SPACING.lg,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
  },
  statusEmoji: {
    fontSize: 12,
  },
  statusText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '700',
  },
  orderShop: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  orderItems: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
  },
  orderTotal: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  orderDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  cancelBtnText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
  },
});
