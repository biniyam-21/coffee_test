import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { NavigationController } from './src/navigation/NavigationController';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <NavigationController />
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
