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

export interface RegisterModalProps {
  visible: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  visible,
  onClose,
  onSwitchToLogin,
}) => {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) {
      errs.fullName = 'Full name is required';
    }
    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    setServerError(null);
    if (!validate()) return;

    setIsLoading(true);
    try {
      await register(email.trim(), password, fullName.trim(), phoneNumber.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      setServerError(
        err instanceof Error ? err.message : 'Registration failed. Please verify details.',
      );
    } finally {
      setIsLoading(false);
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
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerBrand}>AKUFADA</Text>
              <Text style={styles.headerTitle}>Create Account</Text>
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
              Join Akufada for easy ordering, order history, and live tracking.
            </Text>

            {serverError && (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorBannerText}>{serverError}</Text>
              </View>
            )}

            <Input
              label="Full Name"
              placeholder="Abebe Kebede"
              value={fullName}
              onChangeText={setFullName}
              error={errors.fullName}
              required
            />

            <Input
              label="Email Address"
              placeholder="abebe@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              required
            />

            <Input
              label="Phone Number (Optional)"
              placeholder="+251911223344"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />

            <Input
              label="Password"
              placeholder="Min. 8 characters"
              isPassword
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              helperText="At least 8 characters with letters, numbers, and symbols"
              required
            />

            <Button
              title="Create Account"
              onPress={handleRegister}
              isLoading={isLoading}
              style={styles.registerBtn}
            />

            <TouchableOpacity onPress={onSwitchToLogin} style={styles.switchRow}>
              <Text style={styles.switchText}>
                Already registered? <Text style={styles.switchTextBold}>Sign In</Text>
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
  registerBtn: {
    marginTop: spacing.md,
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
