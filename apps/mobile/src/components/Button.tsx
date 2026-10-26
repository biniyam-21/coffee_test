import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { colors, borderRadius, spacing } from '../theme';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  isLoading = false,
  icon,
  style,
}) => {
  const getContainerStyle = (): ViewStyle[] => {
    const list: ViewStyle[] = [styles.base];

    if (size === 'sm') list.push(styles.sizeSm);
    else if (size === 'lg') list.push(styles.sizeLg);
    else list.push(styles.sizeMd);

    switch (variant) {
      case 'primary':
        list.push(styles.primaryContainer);
        break;
      case 'secondary':
        list.push(styles.secondaryContainer);
        break;
      case 'outline':
        list.push(styles.outlineContainer);
        break;
      case 'danger':
        list.push(styles.dangerContainer);
        break;
      case 'ghost':
        list.push(styles.ghostContainer);
        break;
    }

    if (disabled || isLoading) {
      list.push(styles.disabled);
    }

    if (style) {
      list.push(style);
    }

    return list;
  };

  const getTextStyle = (): TextStyle[] => {
    const list: TextStyle[] = [styles.baseText];

    if (size === 'sm') list.push(styles.textSm);
    else if (size === 'lg') list.push(styles.textLg);
    else list.push(styles.textMd);

    switch (variant) {
      case 'primary':
      case 'danger':
        list.push(styles.whiteText);
        break;
      case 'secondary':
      case 'outline':
      case 'ghost':
        list.push(styles.darkText);
        break;
    }

    return list;
  };

  const spinnerColor =
    variant === 'primary' || variant === 'danger' ? colors.textInverse : colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      style={getContainerStyle()}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconMargin}>{icon}</View>}
          <Text style={getTextStyle()}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMargin: {
    marginRight: spacing.sm,
  },
  sizeSm: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  sizeMd: {
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    minHeight: 48,
  },
  sizeLg: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
    minHeight: 52,
  },
  primaryContainer: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryContainer: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlineContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dangerContainer: {
    backgroundColor: colors.error,
  },
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  baseText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  textSm: {
    fontSize: 12,
  },
  textMd: {
    fontSize: 14,
  },
  textLg: {
    fontSize: 16,
  },
  whiteText: {
    color: colors.textInverse,
  },
  darkText: {
    color: colors.textPrimary,
  },
});
