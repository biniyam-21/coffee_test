import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors, spacing, borderRadius } from '../../theme';

export interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ visible, onClose, onSwitchToRegister }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Please enter a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    setServerError(null);
    if (!validate()) return;

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      onClose();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Invalid credentials. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrors({});
    setServerError(null);
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
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerBrand}>AKUFADA</Text>
              <Text style={styles.headerTitle}>Welcome back</Text>
            </View>
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
            <Text style={styles.subtitle}>
              Sign in for saved orders, live preparation updates, and a quicker checkout.
            </Text>

            {serverError && (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorBannerText}>{serverError}</Text>
              </View>
            )}

            <Input
              label="Email Address"
              placeholder="customer@akufada.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              required
            />

            <Input
              label="Password"
              placeholder="••••••••"
              isPassword
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              required
            />

            <Button
              title="Sign In to Akufada"
              onPress={handleLogin}
              isLoading={isLoading}
              style={styles.loginBtn}
            />

            {/* Quick Demo Fill Buttons */}
            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>Quick Demo Accounts:</Text>
              <View style={styles.demoBtnRow}>
                <TouchableOpacity
                  onPress={() => fillDemo('admin@akufada.com', 'AdminSecret123!')}
                  style={styles.demoChip}
                >
                  <Text style={styles.demoChipText}>Admin</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => fillDemo('staff@akufada.com', 'StaffSecret123!')}
                  style={styles.demoChip}
                >
                  <Text style={styles.demoChipText}>Staff</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => fillDemo('customer@akufada.com', 'CustomerSecret123!')}
                  style={styles.demoChip}
                >
                  <Text style={styles.demoChipText}>Customer</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity onPress={onSwitchToRegister} style={styles.switchRow}>
              <Text style={styles.switchText}>
                Don&apos;t have an account? <Text style={styles.switchTextBold}>Register</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
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
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerBrand: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: colors.primaryBackground,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
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
    padding: spacing.xl,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    borderColor: colors.errorBorder,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  errorBannerText: {
    flex: 1,
    color: colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
  loginBtn: {
    marginTop: spacing.md,
  },
  demoBox: {
    marginTop: spacing.xxl,
    backgroundColor: colors.primaryBackground,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  demoBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  demoChip: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  demoChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  switchRow: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  switchText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  switchTextBold: {
    color: colors.primary,
    fontWeight: '700',
  },
});
