import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius } from '../theme';

export interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  dot = false,
}) => {
  const getBadgeColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: colors.successBg,
          border: colors.successBorder,
          text: colors.success,
          dot: colors.success,
        };
      case 'warning':
        return {
          bg: colors.warningBg,
          border: colors.warningBorder,
          text: colors.warning,
          dot: colors.warning,
        };
      case 'error':
        return {
          bg: colors.errorBg,
          border: colors.errorBorder,
          text: colors.error,
          dot: colors.error,
        };
      case 'info':
        return {
          bg: colors.infoBg,
          border: colors.infoBorder,
          text: colors.info,
          dot: colors.info,
        };
      case 'neutral':
        return {
          bg: colors.surfaceSubtle,
          border: colors.border,
          text: colors.textSecondary,
          dot: colors.textMuted,
        };
      case 'primary':
      default:
        return {
          bg: colors.primaryBackground,
          border: colors.primaryLight,
          text: colors.primary,
          dot: colors.primary,
        };
    }
  };

  const scheme = getBadgeColors();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: scheme.bg,
          borderColor: scheme.border,
          paddingVertical: isSm ? 2 : 4,
          paddingHorizontal: isSm ? 6 : 10,
        },
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: scheme.dot }]} />}
      <Text
        style={[
          styles.text,
          {
            color: scheme.text,
            fontSize: isSm ? 10 : 12,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  text: {
    fontWeight: '700',
  },
});
