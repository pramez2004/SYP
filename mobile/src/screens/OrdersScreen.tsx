import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';

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
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticated) loadOrders();
    else setLoading(false);
  }, [isAuthenticated]);

  const loadOrders = async () => {
    try {
      const res = await apiClient.get('/api/orders/');
      setOrders(res.data.results || res.data);
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

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = language === 'ne'
      ? {
          placed: t.orders.placed,
          confirmed: t.orders.confirmed,
          packed: t.orders.packed,
          out_for_delivery: t.orders.outForDelivery,
          delivered: t.orders.delivered,
          cancelled: 'रद्द',
        }
      : {
          placed: 'Placed',
          confirmed: 'Confirmed',
          packed: 'Packed',
          out_for_delivery: 'Out for Delivery',
          delivered: 'Delivered',
          cancelled: 'Cancelled',
        };
    return statusLabels[status] || status;
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.emptyEmoji}>🔒</Text>
        <Text style={styles.emptyText}>
          {language === 'ne' ? 'कृपया लग इन गर्नुहोस्' : 'Please log in to view your orders'}
        </Text>
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
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyText}>
            {language === 'ne' ? 'कुनै अर्डर छैन' : 'No orders yet'}
          </Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => navigation.navigate('MarketplaceTab')}
          >
            <Text style={styles.shopButtonText}>
              {language === 'ne' ? 'बजार हेर्नुहोस्' : 'Browse Marketplace'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.ordersList}>
          {orders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
            >
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>#{order.id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[order.status] + '20' }]}>
                  <Text style={styles.statusEmoji}>{STATUS_EMOJIS[order.status]}</Text>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[order.status] }]}>
                    {getStatusLabel(order.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.orderShop}>{order.shop_name}</Text>

              <View style={styles.orderFooter}>
                <Text style={styles.orderItems}>
                  {order.item_count} {language === 'ne' ? 'सामान' : 'items'}
                </Text>
                <Text style={styles.orderTotal}>Rs. {order.total}</Text>
              </View>

              <Text style={styles.orderDate}>
                {new Date(order.placed_at).toLocaleDateString(
                  language === 'ne' ? 'ne-NP' : 'en-US',
                  { year: 'numeric', month: 'short', day: 'numeric' },
                )}
              </Text>
            </TouchableOpacity>
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
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.heading,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  ordersList: {
    paddingHorizontal: SPACING.lg,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
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
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: 4,
  },
  statusEmoji: {
    fontSize: 12,
  },
  statusText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
  },
  orderShop: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItems: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textMuted,
  },
  orderTotal: {
    fontSize: FONT_SIZES.subtitle,
    fontWeight: '800',
    color: COLORS.primary,
  },
  orderDate: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  shopButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  shopButtonText: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
    fontSize: FONT_SIZES.body,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  loginButtonText: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
    fontSize: FONT_SIZES.bodyLarge,
  },
});
