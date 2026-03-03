import { Tabs, router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/colors';

export default function TabsLayout() {
  const { user } = useAuthStore();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopColor: Colors.tabBarBorder,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
          color: Colors.text,
        },
        headerShadowVisible: false,
        headerTitleAlign: 'center',
      }}
    >
      <Tabs.Screen
        name="races"
        options={{
          title: 'Corridas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flag-outline" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="my-races"
        options={{
          title: 'Minhas Corridas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ribbon-outline" size={size} color={color} />
          ),
          headerTitle: 'Minhas Corridas',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
          headerTitle: 'Meu Perfil',
          headerRight: user?.isAdmin
            ? () => (
                <TouchableOpacity
                  onPress={() => router.push('/(admin)')}
                  style={{ marginRight: 16 }}
                >
                  <Ionicons
                    name="settings-outline"
                    size={22}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              )
            : undefined,
        }}
      />
    </Tabs>
  );
}
