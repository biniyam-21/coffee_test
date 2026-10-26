import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';
import { useCart } from '../context/CartContext';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  showCart?: boolean;
  onCartPress?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showCart = true,
  onCartPress,
  rightAction,
}) => {
  const { itemCount } = useCart();

  return (
    <View style={styles.container}>
      <View style={styles.leftCol}>
        {title && <Text style={styles.title}>{title}</Text>}
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      <View style={styles.rightCol}>
        {rightAction}

        {showCart && onCartPress && (
          <TouchableOpacity
            onPress={onCartPress}
            style={styles.cartButton}
            accessibilityLabel={`Cart with ${itemCount} items`}
          >
            <Feather name="shopping-bag" size={20} color={colors.textInverse} />
            {itemCount > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{itemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftCol: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cartButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeCountText: {
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: '800',
  },
});
