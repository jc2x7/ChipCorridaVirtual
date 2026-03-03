import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Race } from '@/types';
import { raceService } from '@/services/raceService';
import { RaceCard } from '@/components/race/RaceCard';
import { Loading } from '@/components/ui/Loading';
import { Colors } from '@/constants/colors';

export default function RacesScreen() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setError(false);
    const unsubscribe = raceService.subscribeToPublishedRaces(
      (r) => {
        setRaces(r);
        setLoading(false);
      },
      () => {
        setLoading(false);
        setError(true);
      }
    );
    return unsubscribe;
  }, []);

  const filtered = races.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loading fullScreen message="Carregando corridas..." />;

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
        <Ionicons name="cloud-offline-outline" size={48} color={Colors.textMuted} />
        <Text style={[styles.emptyTitle, { marginTop: 12 }]}>Erro ao carregar corridas</Text>
        <Text style={styles.emptyText}>Verifique sua conexão e tente novamente</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Corridas</Text>
        <Text style={styles.subtitle}>Encontre e participe das corridas</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar corridas..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Ionicons
            name="close-circle"
            size={18}
            color={Colors.textMuted}
            onPress={() => setSearch('')}
          />
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <RaceCard
            race={item}
            onPress={() => router.push(`/(tabs)/races/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="flag-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {search ? 'Nenhuma corrida encontrada' : 'Sem corridas disponíveis'}
            </Text>
            <Text style={styles.emptyText}>
              {search
                ? 'Tente outra busca'
                : 'Em breve novas corridas serão publicadas'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});
