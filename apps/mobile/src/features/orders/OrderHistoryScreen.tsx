import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Order, PaginatedResult } from '../../types/api';
import { apiRequest } from '../../lib/api-client';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDateTime, getOrderStatusBadgeConfig } from '../../lib/formatters';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { OrderTrackModal } from './OrderTrackModal';
import { colors, spacing, borderRadius, shadows } from '../../theme';

export interface OrderHistoryScreenProps {
  onExploreMenu: () => void;
  onRequireAuth: () => void;
}

export const OrderHistoryScreen: React.FC<OrderHistoryScreenProps> = ({
  onExploreMenu,
  onRequireAuth,
}) => {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    setError(null);
    try {
      const res = await apiRequest<PaginatedResult<Order>>('/orders?limit=20');
      setOrders(res.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load orders history.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchOrders();
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const badge = getOrderStatusBadgeConfig(item.status);

    return (
      <TouchableOpacity
        onPress={() => setSelectedOrderId(item.id)}
        activeOpacity={0.85}
        style={styles.orderCard}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderNumber}>Order #{item.orderNumber}</Text>
            <Text style={styles.orderDate}>{formatDateTime(item.createdAt)}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: badge.backgroundColor,
                borderColor: badge.borderColor,
              },
            ]}
          >
            <View style={[styles.statusDot, { backgroundColor: badge.dotColor }]} />
            <Text style={[styles.statusText, { color: badge.textColor }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Line Items Preview */}
        <View style={styles.itemsPreview}>
          {item.items?.slice(0, 3).map((line) => (
            <Text key={line.id} style={styles.itemLine} numberOfLines={1}>
              {line.quantity}x {line.productName}
            </Text>
          ))}
          {(item.items?.length || 0) > 3 && (
            <Text style={styles.moreItemsText}>+{(item.items?.length || 0) - 3} more items</Text>
          )}
        </View>

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.totalLabel}>
            Total: <Text style={styles.totalValue}>{formatCurrency(item.totalCents)}</Text>
          </Text>

          <View style={styles.trackLinkRow}>
            <Text style={styles.trackLinkText}>Live Track</Text>
            <View style={styles.trackIconTile}><Feather name="chevron-right" size={14} color={colors.textInverse} /></View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="My Orders"
        subtitle="Track previous orders and beverage receipts"
        showCart={false}
      />

      {error ? (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {!isAuthenticated ? (
        <View style={styles.centerContainer}>
          <View style={styles.lockIconTile}><Feather name="lock" size={22} color={colors.textInverse} /></View>
          <Text style={styles.centerTitle}>Sign in to view your orders</Text>
          <Text style={styles.centerSubtitle}>
            Your order history is securely associated with your authenticated account.
          </Text>
          <Button title="Sign In / Register" onPress={onRequireAuth} style={styles.authBtn} />
        </View>
      ) : isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading previous orders...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>☕</Text>
          <Text style={styles.centerTitle}>No orders yet</Text>
          <Text style={styles.centerSubtitle}>
            You haven&apos;t placed any coffee orders with Akufada yet!
          </Text>
          <Button title="Browse Menu" onPress={onExploreMenu} style={styles.exploreBtn} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
            />
          }
        />
      )}

      {/* Live Track Modal */}
      <OrderTrackModal
        orderId={selectedOrderId}
        visible={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    borderColor: colors.errorBorder,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    margin: spacing.lg,
    gap: spacing.sm,
  },
  errorBannerText: {
    flex: 1,
    color: colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  orderDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemsPreview: {
    paddingVertical: spacing.xs,
  },
  itemLine: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  moreItemsText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  totalValue: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
  trackLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 2,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  centerIcon: {
    marginBottom: spacing.md,
  },
  lockIconTile: { width: 54, height: 54, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  trackIconTile: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  centerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  centerSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl,
  },
  authBtn: {
    minWidth: 180,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  exploreBtn: {
    minWidth: 180,
  },
});
