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
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const unsub = raceService.subscribeToAllRaces(
      (data) => {
        setRaces(data);
        setLoading(false);
        setError(false);
      },
      () => {
        setLoading(false);
        setError(true);
      }
    );
    return unsub;
  }, []);

  const confirmStatusChange = (race: Race, next: RaceStatus) => {
    const action: Record<RaceStatus, string> = {
      draft: 'mover para rascunho',
      published: 'publicar',
      active: 'iniciar',
      finished: 'encerrar',
    };
    Alert.alert(
      'Alterar status',
      `Deseja ${action[next]} a corrida "${race.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => raceService.updateRace(race.id, { status: next }),
        },
      ]
    );
  };

  const confirmDelete = (race: Race) => {
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

  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={['bottom']}>
        <Ionicons name="cloud-offline-outline" size={52} color={Colors.textMuted} />
        <Text style={styles.errorTitle}>Erro ao carregar corridas</Text>
        <Text style={styles.errorSub}>Verifique sua conexão e tente novamente</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.topBar}>
        <Text style={styles.count}>{races.length} corrida{races.length !== 1 ? 's' : ''}</Text>
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
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="flag-outline" size={52} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Nenhuma corrida criada</Text>
          </View>
        }
        renderItem={({ item: race }) => (
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardName} numberOfLines={1}>{race.name}</Text>
              <Badge label={STATUS_LABEL[race.status]} variant={STATUS_VARIANT[race.status]} size="sm" />
            </View>

            <Text style={styles.cardDate}>
              {format(race.startTime, "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
            </Text>
            <Text style={styles.cardMeta}>
              {race.checkpoints.length} checkpoint{race.checkpoints.length !== 1 ? 's' : ''}
              {'  •  '}
              {race.participantCount ?? 0} atleta{(race.participantCount ?? 0) !== 1 ? 's' : ''}
            </Text>

            {/* Actions */}
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
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, color: Colors.textMuted },
  errorTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  errorSub: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});
