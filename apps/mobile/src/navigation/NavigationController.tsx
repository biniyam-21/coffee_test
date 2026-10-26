import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { Order } from '../types/api';
import { MenuScreen } from '../features/menu/MenuScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { CartScreen } from '../features/cart/CartScreen';
import { OrderHistoryScreen } from '../features/orders/OrderHistoryScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { LoginModal } from '../features/auth/LoginModal';
import { RegisterModal } from '../features/auth/RegisterModal';
import { CheckoutModal } from '../features/orders/CheckoutModal';
import { OrderTrackModal } from '../features/orders/OrderTrackModal';
import { colors, spacing, borderRadius } from '../theme';

export type TabType = 'home' | 'menu' | 'orders' | 'profile';

export const NavigationController: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [menuCategory, setMenuCategory] = useState<string | undefined>();

  // Modal Flow States
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

  const openAuth = () => setIsLoginOpen(true);

  const handleOrderCreated = (order: Order) => {
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setTrackingOrderId(order.id);
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onOpenCart={() => setIsCartOpen(true)} onOpenMenu={(category) => {
          setMenuCategory(category);
          setActiveTab('menu');
        }} onOpenProfile={() => setActiveTab('profile')} />;
      case 'menu':
        return <MenuScreen onOpenCart={() => setIsCartOpen(true)} initialCategory={menuCategory} />;
      case 'orders':
        return (
          <OrderHistoryScreen onExploreMenu={() => setActiveTab('menu')} onRequireAuth={openAuth} />
        );
      case 'profile':
        return <ProfileScreen onRequireAuth={openAuth} />;
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Main Active Screen */}
      <View style={styles.screenContainer}>{renderActiveScreen()}</View>

      {/* Bottom Navigation Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('home')}
          style={[styles.tabButton, activeTab === 'home' && styles.tabButtonActive]}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'home' }}
        >
          <Feather name="home" size={19} color={activeTab === 'home' ? colors.textInverse : colors.textMuted} />
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setMenuCategory(undefined);
            setActiveTab('menu');
          }}
          style={[styles.tabButton, activeTab === 'menu' && styles.tabButtonActive]}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'menu' }}
        >
          <Feather name="coffee" size={19} color={activeTab === 'menu' ? colors.textInverse : colors.textMuted} />
          <Text style={[styles.tabLabel, activeTab === 'menu' && styles.tabLabelActive]}>Menu</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('orders')}
          style={[styles.tabButton, activeTab === 'orders' && styles.tabButtonActive]}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'orders' }}
        >
          <Feather name="clock" size={19} color={activeTab === 'orders' ? colors.textInverse : colors.textMuted} />
          <Text style={[styles.tabLabel, activeTab === 'orders' && styles.tabLabelActive]}>
            Orders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('profile')}
          style={[styles.tabButton, activeTab === 'profile' && styles.tabButtonActive]}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'profile' }}
        >
          <Feather name="user" size={19} color={activeTab === 'profile' ? colors.textInverse : colors.textMuted} />
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isCartOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsCartOpen(false)}>
        <SafeAreaView style={styles.cartModal}>
          <CartScreen onProceedToCheckout={() => setIsCheckoutOpen(true)} onExploreMenu={() => {
            setIsCartOpen(false);
            setActiveTab('menu');
          }} />
        </SafeAreaView>
      </Modal>

      {/* Modals & Overlays */}
      <LoginModal
        visible={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToRegister={() => {
          setIsLoginOpen(false);
          setIsRegisterOpen(true);
        }}
      />

      <RegisterModal
        visible={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSwitchToLogin={() => {
          setIsRegisterOpen(false);
          setIsLoginOpen(true);
        }}
      />

      <CheckoutModal
        visible={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onRequireAuth={() => {
          setIsCheckoutOpen(false);
          setIsLoginOpen(true);
        }}
        onOrderCreated={handleOrderCreated}
      />

      <OrderTrackModal
        orderId={trackingOrderId}
        visible={!!trackingOrderId}
        onClose={() => setTrackingOrderId(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  screenContainer: {
    flex: 1,
  },
  cartModal: { flex: 1, backgroundColor: colors.background },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 22,
    padding: 5,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 17,
  },
  tabButtonActive: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingHorizontal: 7,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  cartIconWrapper: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: colors.textInverse,
    fontSize: 9,
    fontWeight: '800',
  },
});
