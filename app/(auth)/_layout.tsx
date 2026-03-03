import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function AuthLayout() {
  const { user, initialized } = useAuthStore();

  useEffect(() => {
    if (initialized && user) {
      router.replace('/(tabs)/races');
    }
  }, [user, initialized]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
