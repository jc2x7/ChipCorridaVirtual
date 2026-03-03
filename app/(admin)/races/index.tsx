import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Race, RaceStatus } from '@/types';
import { raceService } from '@/services/raceService';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { Colors } from '@/constants/colors';

const STATUS_LABEL: Record<RaceStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicada',
  active: 'Ao vivo',
  finished: 'Encerrada',
};

const STATUS_VARIANT: Record<RaceStatus, 'default' | 'info' | 'success' | 'error'> = {
  draft: 'default',
  published: 'info',
  active: 'success',
  finished: 'default',
};

export default function AdminRacesScreen() {
  const { initialized } = useAuthStore();
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One-shot getDocs — much simpler and more reliable than onSnapshot.
  // If it fails, we show the actual error and let the user pull-to-refresh.
  const load = useCallback(async () => {
    try {
      const data = await raceService.getAllRaces();
      setRaces(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar corridas';
      console.error('[AdminRaces] load error:', msg);
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Wait for Firebase Auth to finish restoring the session before reading
  // Firestore. Without this guard the read fires with no auth token and
  // gets permission-denied.
  useEffect(() => {
    if (!initialized) return;
    load();
  }, [initialized, load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const confirmStatusChange = (race: Race, next: RaceStatus) => {
    const label: Record<RaceStatus, string> = {
      draft: 'mover para rascunho',
      published: 'publicar',
      active: 'iniciar ao vivo',
      finished: 'encerrar',
    };
    Alert.alert(
      'Alterar status',
      `Deseja ${label[next]} a corrida "${race.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await raceService.updateRace(race.id, { status: next });
              load();
            } catch (e: unknown) {
              Alert.alert('Erro', e instanceof Error ? e.message : 'Tente novamente.');
            }
          },
        },
      ]
    );
  };

  const confirmDelete = (race: Race) => {
    Alert.alert(
      'Excluir corrida',
      `Excluir "${race.name}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await raceService.deleteRace(race.id);
              load();
            } catch (e: unknown) {
              Alert.alert('Erro', e instanceof Error ? e.message : 'Tente novamente.');
            }
          },
        },
      ]
    );
  };

  if (loading) return <Loading fullScreen />;

  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['bottom']}>
        <Ionicons name="cloud-offline-outline" size={52} color={Colors.textMuted} />
        <Text style={styles.errorTitle}>Erro ao carregar corridas</Text>
        <Text style={styles.errorSub}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => { setLoading(true); setError(null); load(); }}
        >
          <Ionicons name="refresh-outline" size={16} color="#FFF" />
          <Text style={styles.retryBtnText}>Tentar novamente</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.topBar}>
        <Text style={styles.count}>
          {races.length} corrida{races.length !== 1 ? 's' : ''}
        </Text>
        <Button
          title="Nova corrida"
          size="sm"
          icon={<Ionicons name="add" size={16} color="#FFF" />}
          onPress={() => router.push('/(admin)/races/create')}
        />
      </View>

      <FlatList
        data={races}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="flag-outline" size={52} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Nenhuma corrida criada</Text>
            <Text style={styles.emptySub}>Toque em "Nova corrida" para começar</Text>
          </View>
        }
        renderItem={({ item: race }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardName} numberOfLines={1}>{race.name}</Text>
              <Badge
                label={STATUS_LABEL[race.status]}
                variant={STATUS_VARIANT[race.status]}
                size="sm"
              />
            </View>

            <Text style={styles.cardDate}>
              {format(race.startTime, "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
            </Text>
            <Text style={styles.cardMeta}>
              {race.checkpoints.length} checkpoint{race.checkpoints.length !== 1 ? 's' : ''}
              {'  ·  '}
              {race.participantCount ?? 0} atleta{(race.participantCount ?? 0) !== 1 ? 's' : ''}
            </Text>

            <View style={styles.actions}>
              <ActionBtn
                icon="create-outline"
                label="Editar"
                onPress={() => router.push(`/(admin)/races/${race.id}`)}
              />
              <ActionBtn
                icon="map-outline"
                label="Mapa"
                onPress={() => router.push(`/(admin)/races/${race.id}/map-editor`)}
              />
              <ActionBtn
                icon="people-outline"
                label="Atletas"
                onPress={() => router.push(`/(admin)/races/${race.id}/participants`)}
              />

              {race.status === 'draft' && (
                <ActionBtn
                  icon="globe-outline"
                  label="Publicar"
                  color={Colors.secondary}
                  onPress={() => confirmStatusChange(race, 'published')}
                />
              )}
              {race.status === 'published' && (
                <ActionBtn
                  icon="play-circle-outline"
                  label="Iniciar"
                  color={Colors.success}
                  onPress={() => confirmStatusChange(race, 'active')}
                />
              )}
              {race.status === 'active' && (
                <ActionBtn
                  icon="stop-circle-outline"
                  label="Encerrar"
                  color={Colors.warning}
                  onPress={() => confirmStatusChange(race, 'finished')}
                />
              )}

              <ActionBtn
                icon="trash-outline"
                label="Excluir"
                color={Colors.error}
                onPress={() => confirmDelete(race)}
              />
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function ActionBtn({
  icon,
  label,
  color = Colors.textSecondary,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={17} color={color} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center', gap: 10 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  count: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  cardName: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1 },
  cardDate: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  cardMeta: { fontSize: 12, color: Colors.textMuted, marginBottom: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
  },
  actionLabel: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.textMuted },
  emptySub: { fontSize: 13, color: Colors.textMuted },
  errorTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  errorSub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 4,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
