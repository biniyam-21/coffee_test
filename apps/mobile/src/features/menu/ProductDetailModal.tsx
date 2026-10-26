import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Product } from '../../types/api';
import { formatCurrency } from '../../lib/formatters';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { colors, spacing, borderRadius } from '../../theme';

export interface ProductDetailModalProps {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  visible,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const inStock = product.inventory.inStock && product.inventory.availableQuantity > 0;
  const maxAvailable = product.inventory.availableQuantity || 0;

  const handleAdd = () => {
    onAddToCart(product, quantity);
    setQuantity(1);
    onClose();
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
          <Text style={styles.headerTitle}>Product Details</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityLabel="Close modal"
          >
            <Feather name="x" size={20} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* API imagery with an on-device café photo fallback. */}
          <View style={styles.imagePlaceholder}>
            <Image source={product.imageUrl ? { uri: product.imageUrl } : require('../../../assets/brew-bean-latte.jpg')} style={styles.productImage} />
          </View>

          {/* Details */}
          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.categoryText}>{product.category.name}</Text>
            </View>
            <Text style={styles.price}>{formatCurrency(product.basePriceCents)}</Text>
          </View>

          <View style={styles.stockRow}>
            {inStock ? (
              <Badge label={`${maxAvailable} available in stock`} variant="success" dot size="md" />
            ) : (
              <Badge label="Sold Out" variant="error" size="md" />
            )}
          </View>

          <Text style={styles.description}>
            {product.description ||
              'Artisan coffee handcrafted with single-origin beans, roasted fresh daily.'}
          </Text>

          {/* Quantity Controls */}
          {inStock && (
            <View style={styles.quantitySection}>
              <Text style={styles.quantityLabel}>Quantity:</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
                >
                  <Feather
                    name="minus"
                    size={18}
                    color={colors.textInverse}
                  />
                </TouchableOpacity>

                <Text style={styles.qtyText}>{quantity}</Text>

                <TouchableOpacity
                  onPress={() => setQuantity((q) => Math.min(maxAvailable, q + 1))}
                  disabled={quantity >= maxAvailable}
                  style={[styles.qtyBtn, quantity >= maxAvailable && styles.qtyBtnDisabled]}
                >
                  <Feather
                    name="plus"
                    size={18}
                    color={colors.textInverse}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Add Action Button */}
          <View style={styles.footerAction}>
            <Button
              title={
                inStock
                  ? `Add to Cart • ${formatCurrency(product.basePriceCents * quantity)}`
                  : 'Currently Unavailable'
              }
              onPress={handleAdd}
              disabled={!inStock}
              size="lg"
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
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
  content: {
    flex: 1,
    padding: spacing.xl,
  },
  imagePlaceholder: {
    height: 180,
    backgroundColor: colors.primaryBackground,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  productImage: { width: '100%', height: '100%', borderRadius: borderRadius.xl },
  imagePlaceholderEmoji: {
    fontSize: 54,
    marginBottom: 4,
  },
  imageCategoryBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleCol: {
    flex: 1,
    marginRight: spacing.md,
  },
  productName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  categoryText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  stockRow: {
    marginVertical: spacing.sm,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xl,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  qtyBtnDisabled: {
    opacity: 0.3,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 32,
    textAlign: 'center',
  },
  footerAction: {
    marginTop: 'auto',
  },
});
