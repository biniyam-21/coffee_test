import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { CartItem } from '../../types/api';
import { formatCurrency } from '../../lib/formatters';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { colors, spacing, borderRadius, shadows } from '../../theme';

export interface CartScreenProps {
  onProceedToCheckout: () => void;
  onExploreMenu: () => void;
}

export const CartScreen: React.FC<CartScreenProps> = ({ onProceedToCheckout, onExploreMenu }) => {
  const {
    items,
    itemCount,
    subtotalCents,
    taxCents,
    totalCents,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const renderCartItem = ({ item }: { item: CartItem }) => {
    return (
      <View style={styles.cartCard}>
        <View style={styles.itemHeader}>
          <View style={styles.titleCol}>
            <Text style={styles.itemName}>{item.product.name}</Text>
            <Text style={styles.unitPrice}>{formatCurrency(item.product.basePriceCents)} each</Text>
          </View>
          <Text style={styles.lineTotal}>
            {formatCurrency(item.product.basePriceCents * item.quantity)}
          </Text>
        </View>

        <View style={styles.controlsRow}>
          {/* Quantity Controls */}
          <View style={styles.quantityPicker}>
            <TouchableOpacity
              onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
              style={styles.pickerBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Decrease quantity"
            >
              {item.quantity === 1 ? (
                <Feather name="trash-2" size={16} color={colors.textInverse} />
              ) : (
                <Feather name="minus" size={16} color={colors.textInverse} />
              )}
            </TouchableOpacity>

            <Text style={styles.pickerValue}>{item.quantity}</Text>

            <TouchableOpacity
              onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
              disabled={item.quantity >= item.product.inventory.availableQuantity}
              style={[
                styles.pickerBtn,
                item.quantity >= item.product.inventory.availableQuantity &&
                  styles.pickerBtnDisabled,
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Increase quantity"
            >
              <Feather
                name="plus"
                size={16}
                color={
                  colors.textInverse
                }
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => removeItem(item.product.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title={`Your Cart (${itemCount})`}
        subtitle="Review selections before checkout"
        showCart={false}
        rightAction={
          items.length > 0 ? (
            <TouchableOpacity onPress={clearCart} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🛍️</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Add some freshly roasted coffee or artisan pastries from our menu!
          </Text>
          <Button title="Explore Coffee Menu" onPress={onExploreMenu} style={styles.exploreBtn} />
        </View>
      ) : (
        <View style={styles.filledContainer}>
          <FlatList
            data={items}
            keyExtractor={(item) => item.product.id}
            renderItem={renderCartItem}
            contentContainerStyle={styles.cartList}
          />

          {/* Checkout Breakdown Footer */}
          <View style={styles.footerSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(subtotalCents)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Estimated Tax (10%)</Text>
              <Text style={styles.summaryValue}>{formatCurrency(taxCents)}</Text>
            </View>

            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Estimated Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalCents)}</Text>
            </View>

            <Button
              title={`Proceed to Checkout • ${formatCurrency(totalCents)}`}
              onPress={onProceedToCheckout}
              size="lg"
              style={styles.checkoutBtn}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  clearBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  clearBtnText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
  },
  filledContainer: {
    flex: 1,
  },
  cartList: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  cartCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  titleCol: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  unitPrice: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  lineTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  quantityPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  pickerBtnDisabled: {
    opacity: 0.3,
  },
  pickerValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 28,
    textAlign: 'center',
  },
  removeText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  footerSummary: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
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
  checkoutBtn: {
    marginTop: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  emptyEmoji: {
    fontSize: 54,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xxl,
  },
  exploreBtn: {
    minWidth: 180,
  },
});
