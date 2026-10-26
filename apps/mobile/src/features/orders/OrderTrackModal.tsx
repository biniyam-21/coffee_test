import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Order, OrderStatus } from '../../types/api';
import { apiRequest } from '../../lib/api-client';
import { formatCurrency, formatDateTime, getOrderStatusBadgeConfig } from '../../lib/formatters';
import { Button } from '../../components/Button';
import { colors, spacing, borderRadius } from '../../theme';

export interface OrderTrackModalProps {
  orderId: string | null;
  visible: boolean;
  onClose: () => void;
}

export const OrderTrackModal: React.FC<OrderTrackModalProps> = ({ orderId, visible, onClose }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const data = await apiRequest<Order>(`/orders/${orderId}`);
      setOrder(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to locate order tracking data.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (visible && orderId) {
      setIsLoading(true);
      fetchOrder();
    }
  }, [visible, orderId, fetchOrder]);

  // Periodic polling every 8s for active orders
  useEffect(() => {
    if (!visible || !order) return;
    const isTerminal =
      order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED;
    if (isTerminal) return;

    const interval = setInterval(() => {
      fetchOrder();
    }, 8000);

    return () => clearInterval(interval);
  }, [visible, order, fetchOrder]);

  const handleCancelOrder = () => {
    if (!order) return;

    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This will release reserved inventory.',
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              await apiRequest(`/orders/${order.id}/cancel`, {
                method: 'POST',
                body: JSON.stringify({ reason: 'Customer mobile cancellation' }),
              });
              await fetchOrder();
            } catch (err: unknown) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to cancel order.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ],
    );
  };

  const handleVerifyPayment = async () => {
    const txRef = order?.payment?.transactionId;
    if (!txRef) return;
    setIsVerifyingPayment(true);
    try {
      await apiRequest('/payments/chapa/verify', { params: { tx_ref: txRef } });
      await fetchOrder();
    } catch (err: unknown) {
      Alert.alert('Payment status', err instanceof Error ? err.message : 'Could not verify this payment.');
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  if (!visible) return null;

  const badgeConfig = order ? getOrderStatusBadgeConfig(order.status) : null;
  const canCancel =
    order &&
    order.payment?.provider !== 'CHAPA' &&
    (order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED);

  // Timeline Step evaluation
  const steps = [
    {
      id: OrderStatus.CONFIRMED,
      title: 'Order Confirmed',
      desc: 'Order received and sent to barista',
      icon: 'check-circle' as const,
    },
    {
      id: OrderStatus.IN_PREPARATION,
      title: 'In Preparation',
      desc: 'Barista is crafting your beverage',
      icon: 'coffee' as const,
    },
    {
      id: OrderStatus.READY_FOR_PICKUP,
      title: 'Ready for Pickup',
      desc: 'Waiting at the counter for you',
      icon: 'package' as const,
    },
    {
      id: OrderStatus.COMPLETED,
      title: 'Completed',
      desc: 'Order enjoyed!',
      icon: 'smile' as const,
    },
  ];

  const getStepState = (stepId: OrderStatus) => {
    if (!order) return 'upcoming';
    if (order.status === OrderStatus.CANCELLED) return 'cancelled';

    const orderRanks: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.CONFIRMED]: 1,
      [OrderStatus.IN_PREPARATION]: 2,
      [OrderStatus.READY_FOR_PICKUP]: 3,
      [OrderStatus.COMPLETED]: 4,
      [OrderStatus.CANCELLED]: -1,
    };

    const currentRank = orderRanks[order.status] ?? 0;
    const stepRank = orderRanks[stepId] ?? 0;

    if (currentRank > stepRank) return 'complete';
    if (currentRank === stepRank) return 'current';
    return 'upcoming';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Order Tracking</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityLabel="Close modal"
          >
            <Feather name="x" size={20} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Fetching order timeline...</Text>
          </View>
        ) : error || !order ? (
          <View style={styles.centerContainer}>
            <Feather name="alert-circle" size={42} color={colors.error} />
            <Text style={styles.errorTitle}>Order Not Found</Text>
            <Text style={styles.errorDesc}>{error || 'Could not locate order details.'}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Order Card Info */}
            <View style={styles.orderSummaryCard}>
              <View style={styles.summaryTopRow}>
                <View>
                  <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
                  <Text style={styles.orderDate}>Placed {formatDateTime(order.createdAt)}</Text>
                </View>

                {badgeConfig && (
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: badgeConfig.backgroundColor,
                        borderColor: badgeConfig.borderColor,
                      },
                    ]}
                  >
                    <View style={[styles.statusDot, { backgroundColor: badgeConfig.dotColor }]} />
                    <Text style={[styles.statusText, { color: badgeConfig.textColor }]}>
                      {badgeConfig.label}
                    </Text>
                  </View>
                )}
              </View>

              {order.payment ? (
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentLabel}>
                    Payment · {order.payment.provider || 'Payment'}
                  </Text>
                  <Text style={styles.paymentStatus}>{order.payment.status || 'Unknown'}</Text>
                  {order.payment.provider === 'CHAPA' && order.payment.status === 'PENDING' ? (
                    <Button
                      title="Check Chapa payment status"
                      variant="outline"
                      onPress={handleVerifyPayment}
                      isLoading={isVerifyingPayment}
                      style={styles.paymentButton}
                    />
                  ) : null}
                </View>
              ) : null}

              {/* Cancellation Notice if Cancelled */}
              {order.status === OrderStatus.CANCELLED && (
                <View style={styles.cancelledBanner}>
                  <Feather name="x-circle" size={16} color={colors.error} />
                  <Text style={styles.cancelledBannerText}>
                    This order was cancelled. Reserved inventory was returned.
                  </Text>
                </View>
              )}
            </View>

            {/* Preparation Timeline */}
            {order.status !== OrderStatus.CANCELLED && (
              <View style={styles.timelineCard}>
                <Text style={styles.cardHeader}>Live Preparation Progress</Text>
                <View style={styles.stepsContainer}>
                  {steps.map((step, idx) => {
                    const state = getStepState(step.id);
                    const isComplete = state === 'complete';
                    const isCurrent = state === 'current';

                    return (
                      <View key={step.id} style={styles.stepItem}>
                        <View style={styles.stepLeftCol}>
                          <View
                            style={[
                              styles.stepCircle,
                              isComplete && styles.stepCircleComplete,
                              isCurrent && styles.stepCircleCurrent,
                            ]}
                          >
                            <Feather
                              name={step.icon}
                              size={16}
                              color={
                                isComplete || isCurrent ? colors.textInverse : colors.textMuted
                              }
                            />
                          </View>
                          {idx < steps.length - 1 && (
                            <View
                              style={[
                                styles.stepConnector,
                                (isComplete || isCurrent) && styles.stepConnectorActive,
                              ]}
                            />
                          )}
                        </View>

                        <View style={styles.stepRightCol}>
                          <Text
                            style={[
                              styles.stepTitle,
                              isCurrent && styles.stepTitleCurrent,
                              isComplete && styles.stepTitleComplete,
                            ]}
                          >
                            {step.title}
                          </Text>
                          <Text style={styles.stepDesc}>{step.desc}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Ordered Items Table */}
            <View style={styles.itemsCard}>
              <Text style={styles.cardHeader}>Items in Order</Text>
              {order.items?.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <Text style={styles.itemPrice}>{formatCurrency(item.lineTotalCents)}</Text>
                </View>
              ))}

              {order.customerNotes && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesHeader}>Barista Notes:</Text>
                  <Text style={styles.notesBody}>&ldquo;{order.customerNotes}&rdquo;</Text>
                </View>
              )}

              {/* Pricing Breakdown */}
              <View style={styles.pricingDivider} />
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Subtotal</Text>
                <Text style={styles.priceValue}>{formatCurrency(order.subtotalCents)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Tax (10%)</Text>
                <Text style={styles.priceValue}>{formatCurrency(order.taxCents)}</Text>
              </View>
              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Paid</Text>
                <Text style={styles.totalValue}>{formatCurrency(order.totalCents)}</Text>
              </View>
            </View>

            {/* Cancel Action */}
            {canCancel && (
              <Button
                title="Cancel Order"
                variant="danger"
                onPress={handleCancelOrder}
                isLoading={isCancelling}
                style={styles.cancelBtn}
              />
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  errorDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  orderSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  paymentInfo: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  paymentLabel: { fontSize: 12, color: colors.textMuted, textTransform: 'capitalize' },
  paymentStatus: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginTop: 3 },
  paymentButton: { marginTop: spacing.sm },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontSize: 18,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  cancelledBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
  },
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  stepsContainer: {
    paddingLeft: spacing.xs,
  },
  stepItem: {
    flexDirection: 'row',
    minHeight: 52,
  },
  stepLeftCol: {
    alignItems: 'center',
    marginRight: spacing.md,
    width: 32,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepCircleComplete: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepCircleCurrent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepConnector: {
    width: 2,
    flex: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 4,
  },
  stepConnectorActive: {
    backgroundColor: colors.primaryLight,
  },
  stepRightCol: {
    flex: 1,
    paddingBottom: spacing.lg,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  stepTitleCurrent: {
    color: colors.primary,
    fontWeight: '800',
  },
  stepTitleComplete: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  stepDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  itemQuantity: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    width: 28,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  notesBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  notesHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  notesBody: {
    fontSize: 12,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
  pricingDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  priceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  cancelBtn: {
    marginTop: spacing.sm,
  },
});
