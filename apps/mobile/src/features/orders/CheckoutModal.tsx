import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api-client';
import { Order } from '../../types/api';
import { formatCurrency } from '../../lib/formatters';
import { Button } from '../../components/Button';
import { colors, spacing, borderRadius } from '../../theme';

export interface CheckoutModalProps {
  visible: boolean;
  onClose: () => void;
  onRequireAuth: () => void;
  onOrderCreated: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  visible,
  onClose,
  onRequireAuth,
  onOrderCreated,
}) => {
  const { items, subtotalCents, taxCents, totalCents, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [customerNotes, setCustomerNotes] = useState('');
  const [paymentProvider, setPaymentProvider] = useState<
    'CASH_ON_PICKUP' | 'MOCK_GATEWAY' | 'CHAPA'
  >('CASH_ON_PICKUP');
  const [simulateOutcome, setSimulateOutcome] = useState<'SUCCESS' | 'DECLINED'>('SUCCESS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlaceOrder = async () => {
    setError(null);
    setIsSubmitting(true);

    const idempotencyKey = `mob-idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const payload = {
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
        customerNotes: customerNotes.trim() || undefined,
        payment: {
          provider: paymentProvider,
          ...(paymentProvider === 'MOCK_GATEWAY' ? { simulateOutcome } : {}),
        },
      };

      const order = await apiRequest<Order>('/orders', {
        method: 'POST',
        idempotencyKey,
        body: JSON.stringify(payload),
      });

      if (paymentProvider === 'CHAPA') {
        const checkoutUrl = order.payment?.checkoutUrl;
        if (!checkoutUrl) {
          Alert.alert(
            'Order created',
            'The order is waiting for payment, but Chapa did not return a checkout link. You can check the payment status from order details.',
          );
        } else {
          try {
            await Linking.openURL(checkoutUrl);
          } catch {
            Alert.alert(
              'Order created',
              'Could not open Chapa checkout. Return to the app and check the payment status from order details.',
            );
          }
        }
      }

      clearCart();
      onOrderCreated(order);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to place order. Please review your cart.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Review &amp; Place Order</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel="Close modal"
            >
              <Feather name="x" size={20} color={colors.textInverse} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {error && (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {/* Auth Gate Check */}
            {!isAuthenticated ? (
              <View style={styles.authPromptCard}>
                <Feather name="user" size={32} color={colors.textInverse} style={styles.authIcon} />
                <Text style={styles.authTitle}>Sign in to place your order</Text>
                <Text style={styles.authSubtitle}>
                  Please sign in or register an account so we can link this order to your profile
                  for live tracking.
                </Text>
                <Button
                  title="Sign In / Register"
                  onPress={onRequireAuth}
                  style={styles.authActionBtn}
                />
              </View>
            ) : (
              <>
                {/* Account Summary */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Customer Account</Text>
                  <Text style={styles.customerName}>{user?.fullName}</Text>
                  <Text style={styles.customerEmail}>{user?.email}</Text>
                </View>

                {/* Items Review */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Items ({items.length})</Text>
                  {items.map((item) => (
                    <View key={item.product.id} style={styles.itemRow}>
                      <Text style={styles.itemQuantity}>{item.quantity}x</Text>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.product.name}
                      </Text>
                      <Text style={styles.itemPrice}>
                        {formatCurrency(item.product.basePriceCents * item.quantity)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Special Instructions */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Barista Instructions (Optional)</Text>
                  <TextInput
                    placeholder="e.g. Oat milk in latte, extra hot, pickup in 10m"
                    placeholderTextColor={colors.textMuted}
                    value={customerNotes}
                    onChangeText={setCustomerNotes}
                    multiline
                    numberOfLines={3}
                    style={styles.notesInput}
                  />
                </View>

                {/* Payment Method */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Payment Method</Text>
                  <TouchableOpacity
                    onPress={() => setPaymentProvider('CASH_ON_PICKUP')}
                    style={[styles.radioRow, paymentProvider === 'CASH_ON_PICKUP' && styles.radioRowActive]}
                  >
                    <View style={styles.radioOuter}>
                      {paymentProvider === 'CASH_ON_PICKUP' && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.radioTextCol}>
                      <Text style={styles.radioTitle}>Cash on pickup</Text>
                      <Text style={styles.radioDesc}>Pay at the counter when you collect your order.</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setPaymentProvider('MOCK_GATEWAY'); setSimulateOutcome('SUCCESS'); }}
                    style={[styles.radioRow, paymentProvider === 'MOCK_GATEWAY' && simulateOutcome === 'SUCCESS' && styles.radioRowActive]}
                  >
                    <View style={styles.radioOuter}>
                      {paymentProvider === 'MOCK_GATEWAY' && simulateOutcome === 'SUCCESS' && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.radioTextCol}>
                      <Text style={styles.radioTitle}>Test payment — successful</Text>
                      <Text style={styles.radioDesc}>Sandbox simulation; no real payment is taken.</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setPaymentProvider('MOCK_GATEWAY'); setSimulateOutcome('DECLINED'); }}
                    style={[styles.radioRow, paymentProvider === 'MOCK_GATEWAY' && simulateOutcome === 'DECLINED' && styles.radioRowActive]}
                  >
                    <View style={styles.radioOuter}>
                      {paymentProvider === 'MOCK_GATEWAY' && simulateOutcome === 'DECLINED' && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.radioTextCol}>
                      <Text style={styles.radioTitle}>Test payment — declined</Text>
                      <Text style={styles.radioDesc}>Simulates a failed charge; the order is not placed.</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setPaymentProvider('CHAPA')}
                    style={[styles.radioRow, paymentProvider === 'CHAPA' && styles.radioRowActive]}
                  >
                    <View style={styles.radioOuter}>
                      {paymentProvider === 'CHAPA' && <View style={styles.radioInner} />}
                    </View>
                    <View style={styles.radioTextCol}>
                      <Text style={styles.radioTitle}>Chapa</Text>
                      <Text style={styles.radioDesc}>Continue to Chapa’s secure payment page.</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Pricing Summary */}
                <View style={styles.sectionCard}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Subtotal</Text>
                    <Text style={styles.breakdownValue}>{formatCurrency(subtotalCents)}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Sales Tax (10%)</Text>
                    <Text style={styles.breakdownValue}>{formatCurrency(taxCents)}</Text>
                  </View>
                  <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
                    <Text style={styles.breakdownTotalLabel}>Total Due</Text>
                    <Text style={styles.breakdownTotalValue}>{formatCurrency(totalCents)}</Text>
                  </View>
                </View>

                {/* Submit Action */}
                <Button
                  title={`${paymentProvider === 'CHAPA' ? 'Continue to Chapa' : 'Confirm & Place Order'} • ${formatCurrency(totalCents)}`}
                  onPress={handlePlaceOrder}
                  isLoading={isSubmitting}
                  size="lg"
                  style={styles.placeOrderBtn}
                />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    borderColor: colors.errorBorder,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  errorBannerText: {
    flex: 1,
    color: colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
  authPromptCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  authIcon: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  authTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  authSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl,
  },
  authActionBtn: {
    width: '100%',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  customerEmail: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
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
  notesInput: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
  },
  radioRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBackground,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioTextCol: {
    flex: 1,
  },
  radioTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  radioDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  breakdownLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  breakdownTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  breakdownTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  breakdownTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  placeOrderBtn: {
    marginTop: spacing.md,
  },
});
