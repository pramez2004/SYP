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
import { API_ENDPOINTS } from '../constants/config';
import { useLanguage } from '../context/LanguageContext';
import apiClient from '../services/apiClient';

interface OrderItem {
  id: number;
  product_name: string;
  unit_price: string;
  quantity: number;
  line_total: string;
}

interface Order {
  id: number;
  status: string;
  customer_name?: string;
  shop_name: string;
  delivery_city: string;
  delivery_address: string;
  delivery_phone: string;
  customer_note?: string;
  total: string;
  is_paid: boolean;
  placed_at: string;
  items?: OrderItem[];
}

const ALLOWED_TRANSITIONS: Record<string, { label: string; status: string; color: string }[]> = {
  placed: [
    { label: 'Confirm Order', status: 'confirmed', color: COLORS.statusConfirmed },
    { label: 'Reject / Cancel', status: 'cancelled', color: COLORS.statusCancelled },
  ],
  confirmed: [
    { label: 'Mark as Packed', status: 'packed', color: COLORS.statusPacked },
    { label: 'Reject / Cancel', status: 'cancelled', color: COLORS.statusCancelled },
  ],
  packed: [
    { label: 'Send Out for Delivery', status: 'out_for_delivery', color: COLORS.statusDelivery },
  ],
  out_for_delivery: [
    { label: 'Mark as Delivered (COD Paid)', status: 'delivered', color: COLORS.statusDelivered },
  ],
  delivered: [],
  cancelled: [],
};

const STATUS_COLORS: Record<string, string> = {
  placed: COLORS.statusPlaced,
  confirmed: COLORS.statusConfirmed,
  packed: COLORS.statusPacked,
  out_for_delivery: COLORS.statusDelivery,
  delivered: COLORS.statusDelivered,
  cancelled: COLORS.statusCancelled,
};

export default function SellerOrdersScreen() {
  const { t } = useLanguage();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.ORDERS);
      const orderList = res.data.results || res.data || [];
      // Fetch details for each order to show customer info and items
      const detailedOrders = await Promise.all(
        orderList.map(async (o: any) => {
          try {
            const detail = await apiClient.get(`${API_ENDPOINTS.ORDERS}${o.id}/`);
            return detail.data;
          } catch {
            return o;
          }
        })
      );
      setOrders(detailedOrders);
    } catch (e) {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleUpdateStatus = (orderId: number, newStatus: string, label: string) => {
    Alert.alert(
      t.orders.updateStatus,
      `${t.seller.confirmStatusChange} #${orderId} -> "${label}"?`,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.confirm,
          onPress: async () => {
            setUpdatingId(orderId);
            try {
              await apiClient.post(`${API_ENDPOINTS.ORDERS}${orderId}/update_status/`, {
                status: newStatus,
              });
              Alert.alert(t.common.success, t.seller.statusUpdated);
              loadOrders();
            } catch (error: any) {
              const detail = error.response?.data?.detail || t.seller.updateStatusFailed;
              Alert.alert(t.common.error, detail);
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOrders(); }} />}
    >
      <Text style={styles.pageTitle}>{t.seller.incomingOrders} ({orders.length})</Text>

      {orders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyText}>{t.seller.noIncomingOrders}</Text>
        </View>
      ) : (
        orders.map((order) => {
          const transitions = ALLOWED_TRANSITIONS[order.status] || [];
          const statusColor = STATUS_COLORS[order.status] || COLORS.textSecondary;
          const isUpdating = updatingId === order.id;

          return (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderIdText}>{t.orders.orderId}{order.id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                  <Text style={styles.statusBadgeText}>{order.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>👤 {t.seller.customer}:</Text>
                <Text style={styles.detailValue}>{order.customer_name || t.seller.customer}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>📞 {t.seller.phone}:</Text>
                <Text style={styles.detailValue}>{order.delivery_phone}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>📍 {t.seller.deliveryAddress}:</Text>
                <Text style={styles.detailValue}>{order.delivery_address}, {order.delivery_city}</Text>
              </View>

              {order.customer_note ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>📝 {t.seller.note}:</Text>
                  <Text style={styles.detailValue}>{order.customer_note}</Text>
                </View>
              ) : null}

              {/* Items List */}
              {order.items && order.items.length > 0 ? (
                <View style={styles.itemsBox}>
                  {order.items.map((it) => (
                    <Text key={it.id} style={styles.itemLine}>
                      • {it.quantity}x {it.product_name} — Rs. {it.line_total}
                    </Text>
                  ))}
                </View>
              ) : null}

              <View style={styles.totalRow}>
                <Text style={styles.totalText}>{t.cart.total}: Rs. {order.total}</Text>
                <Text style={[styles.paidText, { color: order.is_paid ? COLORS.success : COLORS.warning }]}>
                  {order.is_paid ? t.orders.paidCod : t.orders.unpaidCod}
                </Text>
              </View>

              {/* Status Update Transition Buttons */}
              {transitions.length > 0 ? (
                <View style={styles.transitionBox}>
                  <Text style={styles.transitionTitle}>{t.orders.updateStatus}:</Text>
                  <View style={styles.transitionButtons}>
                    {transitions.map((tr) => (
                      <TouchableOpacity
                        key={tr.status}
                        style={[styles.transitionBtn, { backgroundColor: tr.color }, isUpdating && styles.btnDisabled]}
                        onPress={() => handleUpdateStatus(order.id, tr.status, tr.label)}
                        disabled={isUpdating}
                      >
                        <Text style={styles.transitionBtnText}>{tr.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={styles.terminalStateText}>{t.seller.terminalState} ({order.status}).</Text>
              )}
            </View>
          );
        })
      )}
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
  pageTitle: {
    fontSize: FONT_SIZES.title,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: SPACING.lg,
    ...SHADOWS.sm,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZES.bodyLarge,
    color: COLORS.textSecondary,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  orderIdText: {
    fontSize: FONT_SIZES.bodyLarge,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusBadgeText: {
    color: COLORS.textOnPrimary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    width: 130,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  detailValue: {
    flex: 1,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textPrimary,
  },
  itemsBox: {
    backgroundColor: COLORS.surfaceElevated,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginVertical: SPACING.xs,
  },
  itemLine: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.xs,
    marginTop: SPACING.xs,
  },
  totalText: {
    fontSize: FONT_SIZES.body,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  paidText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
  },
  transitionBox: {
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.xs,
  },
  transitionTitle: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  transitionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  transitionBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  transitionBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
  },
  terminalStateText: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
