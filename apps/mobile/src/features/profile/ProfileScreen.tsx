import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Header } from '../../components/Header';
import { colors, spacing, borderRadius, shadows } from '../../theme';

export interface ProfileScreenProps {
  onRequireAuth: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onRequireAuth }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your Akufada account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await logout();
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header
        title="Account & Settings"
        subtitle="Preferences and connectivity"
        showCart={false}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        {isAuthenticated && user ? (
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.fullName.slice(0, 1).toUpperCase()}</Text>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.fullName}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              {user.phoneNumber ? <Text style={styles.userPhone}>{user.phoneNumber}</Text> : null}

              <View style={styles.rolesRow}>
                {user.roles.map((r) => (
                  <Badge key={r} label={r} variant="primary" size="sm" />
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.guestCard}>
            <View style={styles.guestIcon}><Ionicons name="person-circle-outline" size={32} color={colors.textInverse} /></View>
            <Text style={styles.guestTitle}>Welcome to Akufada</Text>
            <Text style={styles.guestSubtitle}>
              Sign in to manage previous orders, access personalized coffee recommendations, and
              expedited checkout.
            </Text>
            <Button
              title="Sign In / Register"
              onPress={onRequireAuth}
              style={styles.guestAuthBtn}
            />
          </View>
        )}

        {/* Customer-facing account and ordering help */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionHeader}>Your Akufada account</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Feather name="coffee" size={18} color={colors.textInverse} />
            </View>
            <View style={styles.settingCol}>
              <Text style={styles.settingLabel}>Browse the menu</Text>
              <Text style={styles.settingValue}>Find coffee, tea, and freshly baked pastries.</Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Feather name="clock" size={18} color={colors.textInverse} />
            </View>
            <View style={styles.settingCol}>
              <Text style={styles.settingLabel}>Follow each order</Text>
              <Text style={styles.settingValue}>See preparation progress and order history.</Text>
            </View>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Feather name="heart" size={18} color={colors.textInverse} />
            </View>
            <View style={styles.settingCol}>
              <Text style={styles.settingLabel}>Made around your routine</Text>
              <Text style={styles.settingValue}>Sign in to make checkout and repeat visits easier.</Text>
            </View>
          </View>
        </View>

        {/* Security & Logout Actions */}
        {isAuthenticated && (
          <View style={styles.logoutSection}>
            <Button
              title="Sign Out"
              variant="outline"
              onPress={handleLogout}
              isLoading={isLoggingOut}
              icon={<View style={styles.logoutIcon}><Feather name="log-out" size={16} color={colors.textInverse} /></View>}
              style={styles.logoutBtn}
            />
          </View>
        )}

        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            Akufada &bull; Freshly prepared, just for you
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryBackground,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  userPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rolesRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  guestCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  guestIcon: { width: 56, height: 56, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  guestTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  guestSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl,
  },
  guestAuthBtn: {
    width: '100%',
  },
  settingsSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingCol: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  settingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  logoutSection: {
    marginTop: spacing.sm,
  },
  logoutIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoutBtn: {
    borderColor: colors.errorBorder,
  },
  footerNote: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  footerNoteText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
