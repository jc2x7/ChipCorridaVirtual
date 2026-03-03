import { Stack, router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

export default function AdminLayout() {
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
        headerTintColor: Colors.primary,
        headerBackTitle: 'Voltar',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Painel do Organizador',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen name="races/index" options={{ title: 'Corridas' }} />
      <Stack.Screen name="races/create" options={{ title: 'Nova Corrida' }} />
      <Stack.Screen name="races/[id]/index" options={{ title: 'Editar Corrida' }} />
      <Stack.Screen
        name="races/[id]/map-editor"
        options={{ title: 'Editar Mapa', headerShown: false }}
      />
      <Stack.Screen
        name="races/[id]/participants"
        options={{ title: 'Participantes' }}
      />
      <Stack.Screen name="admins" options={{ title: 'Administradores' }} />
    </Stack>
  );
}
