import { useEffect } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Loading } from '@/components/ui/Loading';

export default function Index() {
  const { user, initialized } = useAuthStore();

  if (!initialized) {
    return (
      <View style={{ flex: 1 }}>
        <Loading fullScreen message="Carregando..." />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)/races" />;
}
