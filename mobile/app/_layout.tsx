import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/src/context/AuthContext';
import { CartProvider } from '@/src/context/CartContext';
import { WalletProvider } from '@/src/context/WalletContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <WalletProvider>
          <CartProvider>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="create-profile" options={{ headerShown: false }} />
            <Stack.Screen name="dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="order" options={{ headerShown: false }} />
            <Stack.Screen name="cart" options={{ headerShown: false }} />
            <Stack.Screen name="checkout" options={{ headerShown: false }} />
            <Stack.Screen name="payment" options={{ headerShown: false }} />
            <Stack.Screen name="order-confirmed" options={{ headerShown: false }} />
            <Stack.Screen name="order-history" options={{ headerShown: false }} />
            <Stack.Screen name="saved-addresses" options={{ headerShown: false }} />
            <Stack.Screen name="track-order" options={{ headerShown: false }} />
            <Stack.Screen name="water-intake" options={{ headerShown: false }} />
            <Stack.Screen name="plan-subscription" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="login-otp" options={{ headerShown: false }} />
            <Stack.Screen name="corporate-profile" options={{ headerShown: false }} />
            <Stack.Screen name="corporate-validation" options={{ headerShown: false }} />
            <Stack.Screen name="corporate-dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="corporate-invoices" options={{ headerShown: false }} />
            <Stack.Screen name="corporate-order-history" options={{ headerShown: false }} />
            <Stack.Screen name="supplier-onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="supplier-onboarding-status" options={{ headerShown: false }} />
            <Stack.Screen name="supplier-dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="supplier-verification-pending" options={{ headerShown: false }} />
            <Stack.Screen name="supplier-incoming-orders" options={{ headerShown: false }} />
            <Stack.Screen name="supplier-assign-rider" options={{ headerShown: false }} />
            <Stack.Screen name="supplier-order-history" options={{ headerShown: false }} />
            <Stack.Screen name="supplier-products" options={{ headerShown: false }} />
            <Stack.Screen name="supplier-financials" options={{ headerShown: false }} />
            <Stack.Screen name="supplier-wallet" options={{ headerShown: false }} />
            <Stack.Screen name="supplier-support" options={{ headerShown: false }} />
            <Stack.Screen name="delivery-onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="delivery-verification-pending" options={{ headerShown: false }} />
            <Stack.Screen name="delivery-dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="delivery-incoming-orders" options={{ headerShown: false }} />
            <Stack.Screen name="delivery-summary" options={{ headerShown: false }} />
            <Stack.Screen name="delivery-financials" options={{ headerShown: false }} />
            <Stack.Screen name="delivery-help" options={{ headerShown: false }} />
            <Stack.Screen name="delivery-profile" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </CartProvider>
        </WalletProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
