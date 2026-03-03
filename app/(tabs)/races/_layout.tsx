import { Stack } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function RacesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
          color: Colors.text,
        },
        headerShadowVisible: false,
        headerTitleAlign: 'center',
        headerBackTitle: 'Voltar',
        headerTintColor: Colors.primary,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Corridas', headerLargeTitle: true }}
      />
      <Stack.Screen name="[id]" options={{ title: 'Detalhes' }} />
      <Stack.Screen
        name="track/[raceId]"
        options={{ title: 'Rastreamento', headerShown: false }}
      />
    </Stack>
  );
}
