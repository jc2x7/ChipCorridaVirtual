import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { Config } from '@/constants/config';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { setUser, setLoading, setInitialized } = useAuthStore();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await authService.getUserProfile(firebaseUser.uid);

          // Auto-promote DEFAULT_ADMIN_EMAIL if not yet admin
          if (
            profile &&
            !profile.isAdmin &&
            firebaseUser.email?.toLowerCase() === Config.DEFAULT_ADMIN_EMAIL.toLowerCase()
          ) {
            try {
              await authService.setAdminRole(firebaseUser.uid, true);
              profile.isAdmin = true;
              console.log('[Auth] Auto-promoted default admin:', firebaseUser.email);
            } catch (e) {
              console.error('[Auth] Failed to auto-promote admin:', e);
            }
          }

          setUser(profile);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      setInitialized(true);
      SplashScreen.hideAsync();
    });

    return unsubscribe;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
