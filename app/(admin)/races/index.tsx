import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Race, RaceStatus } from '@/types';
import { raceService } from '@/services/raceService';
import { Colors } from '@/constants/colors';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';

const statusLabel: Record<RaceStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicada',
  active: 'Ao vivo',
  finished: 'Encerrada',
};
const statusVariant: Record<RaceStatus, 'default' | 'info' | 'success' | 'error'> = {
  draft: 'default',
  published: 'info',
  active: 'success',
  finished: 'default',
};

export default function AdminRacesScreen() {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = raceService.subscribeToAllRaces((r) => {
      setRaces(r);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleStatusChange = (race: Race, newStatus: RaceStatus) => {
    const labels: Record<RaceStatus, string> = {
      draft: 'rascunho',
      published: 'publicar',
      active: 'iniciar',
      finished: 'encerrar',
    };
    Alert.alert(
      'Alterar status',
      `Deseja ${labels[newStatus]} a corrida "${race.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => raceService.updateRace(race.id, { status: newStatus }),
        },
      ]
    );
  };

  const handleDelete = (race: Race) => {
    Alert.alert(
      'Excluir corrida',
      `Tem certeza que quer excluir "${race.name}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => raceService.deleteRace(race.id),
        },
      ]
    );
  };

  if (loading) return <Loading fullScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.count}>{races.length} corridas</Text>
        <Button
          title="Nova corrida"
          onPress={() => router.push('/(admin)/races/create')}
          size="sm"
          icon={<Ionicons name="add" size={16} color="#FFF" />}
        />
      </View>

      <FlatList
        data={races}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="flag-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Nenhuma corrida criada</Text>
          </View>
        }
        renderItem={({ item: race }) => (
          <View style={styles.raceCard}>
            <View style={styles.raceHeader}>
              <Text style={styles.raceName} numberOfLines={1}>
                {race.name}
              </Text>
              <Badge
                label={statusLabel[race.status]}
                variant={statusVariant[race.status]}
                size="sm"
              />
            </View>

            <Text style={styles.raceDate}>
              {format(race.startTime, "dd MMM yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </Text>

            <Text style={styles.raceMeta}>
              {race.checkpoints.length} checkpoints •{' '}
              {race.participantCount ?? 0} atletas
            </Text>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  router.push(`/(admin)/races/${race.id}/index`)
                }
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={Colors.textSecondary}
                />
                <Text style={styles.actionText}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  router.push(`/(admin)/races/${race.id}/map-editor`)
                }
              >
                <Ionicons
                  name="map-outline"
                  size={18}
                  color={Colors.textSecondary}
                />
                <Text style={styles.actionText}>Mapa</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  router.push(`/(admin)/races/${race.id}/participants`)
                }
              >
                <Ionicons
                  name="people-outline"
                  size={18}
                  color={Colors.textSecondary}
                />
                <Text style={styles.actionText}>Atletas</Text>
              </TouchableOpacity>

              {race.status === 'draft' && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleStatusChange(race, 'published')}
                >
                  <Ionicons
                    name="globe-outline"
                    size={18}
                    color={Colors.secondary}
                  />
                  <Text style={[styles.actionText, { color: Colors.secondary }]}>
                    Publicar
                  </Text>
                </TouchableOpacity>
              )}

              {race.status === 'published' && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleStatusChange(race, 'active')}
                >
                  <Ionicons
                    name="play-circle-outline"
                    size={18}
                    color={Colors.success}
                  />
                  <Text style={[styles.actionText, { color: Colors.success }]}>
                    Iniciar
                  </Text>
                </TouchableOpacity>
              )}

              {race.status === 'active' && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleStatusChange(race, 'finished')}
                >
                  <Ionicons
                    name="stop-circle-outline"
                    size={18}
                    color={Colors.warning}
                  />
                  <Text style={[styles.actionText, { color: Colors.warning }]}>
                    Encerrar
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleDelete(race)}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={Colors.error}
                />
                <Text style={[styles.actionText, { color: Colors.error }]}>
                  Excluir
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  count: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  list: { padding: 20, paddingTop: 0 },
  raceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  raceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  raceName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  raceDate: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  raceMeta: { fontSize: 12, color: Colors.textMuted, marginBottom: 14 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
  },
  actionText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, color: Colors.textMuted },
});
