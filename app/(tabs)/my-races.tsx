import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Registration, Race } from '@/types';
import { registrationService } from '@/services/registrationService';
import { raceService } from '@/services/raceService';
import { useAuthStore } from '@/stores/authStore';
import { RaceCard } from '@/components/race/RaceCard';
import { Loading } from '@/components/ui/Loading';
import { Colors } from '@/constants/colors';

interface RaceWithRegistration {
  race: Race;
  registration: Registration;
}

export default function MyRacesScreen() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<RaceWithRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = registrationService.subscribeToMyRegistrations(
      user.id,
      async (registrations) => {
        const racePromises = registrations.map(async (reg) => {
          const race = await raceService.getRace(reg.raceId);
          return race ? { race, registration: reg } : null;
        });
        const results = await Promise.all(racePromises);
        const filtered = results.filter(
          (r): r is RaceWithRegistration => r !== null
        );
        // Sort by start time
        filtered.sort(
          (a, b) =>
            b.race.startTime.getTime() - a.race.startTime.getTime()
        );
        setItems(filtered);
        setLoading(false);
      }
    );
    return unsub;
  }, [user]);

  if (loading) return <Loading fullScreen message="Carregando..." />;

  return (
    <SafeAreaView
      style={styles.container}
      edges={['bottom']}
    >
      <FlatList
        data={items}
        keyExtractor={(item) => item.registration.id}
        renderItem={({ item }) => (
          <RaceCard
            race={item.race}
            onPress={() =>
              router.push(`/(tabs)/races/${item.race.id}`)
            }
            showStatus
            userStatus={item.registration.status}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="ribbon-outline"
              size={56}
              color={Colors.textMuted}
            />
            <Text style={styles.emptyTitle}>
              Nenhuma corrida ainda
            </Text>
            <Text style={styles.emptyText}>
              Vá em "Corridas" e solicite participação
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 20 },
  empty: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
