import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, Marker, Circle } from 'react-native-maps';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Race, Registration } from '@/types';
import { raceService } from '@/services/raceService';
import { registrationService } from '@/services/registrationService';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { LeaderboardList } from '@/components/race/LeaderboardList';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { Colors } from '@/constants/colors';

export default function RaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [race, setRace] = useState<Race | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  const { entries, maleEntries, femaleEntries } = useLeaderboard(id, race);

  useEffect(() => {
    if (!id) return;
    const unsub = raceService.subscribeToRace(id, (r) => {
      setRace(r);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    registrationService
      .getUserRegistrationForRace(id, user.id)
      .then(setRegistration);
  }, [id, user]);

  const handleJoinRequest = async () => {
    if (!user || !race) return;
    setJoining(true);
    try {
      await registrationService.requestToJoin(race.id, user);
      const reg = await registrationService.getUserRegistrationForRace(
        race.id,
        user.id
      );
      setRegistration(reg);
      Alert.alert(
        'Solicitação enviada!',
        'Aguarde o organizador aprovar sua participação.'
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar a solicitação.');
    } finally {
      setJoining(false);
    }
  };

  const handleStartTracking = () => {
    router.push(`/(tabs)/races/track/${id}`);
  };

  if (loading || !race) return <Loading fullScreen message="Carregando..." />;

  const formattedDate = format(race.startTime, "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
    locale: ptBR,
  });

  const mapRegion =
    race.checkpoints.length > 0
      ? {
          latitude: race.checkpoints[0].latitude,
          longitude: race.checkpoints[0].longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }
      : {
          latitude: -15.7801,
          longitude: -47.9292,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        };

  const isApproved = registration?.status === 'approved';
  const isActive = race.status === 'active';

  return (
    <>
      <Stack.Screen options={{ title: race.name }} />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover Image */}
        {race.photoUrl ? (
          <Image
            source={{ uri: race.photoUrl }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="flag" size={60} color={Colors.textMuted} />
          </View>
        )}

        <View style={styles.content}>
          {/* Title & Status */}
          <View style={styles.titleRow}>
            <Text style={styles.raceName}>{race.name}</Text>
            <Badge
              label={
                race.status === 'active'
                  ? 'AO VIVO'
                  : race.status === 'published'
                  ? 'Aberta'
                  : race.status === 'finished'
                  ? 'Encerrada'
                  : 'Rascunho'
              }
              variant={
                race.status === 'active'
                  ? 'error'
                  : race.status === 'published'
                  ? 'success'
                  : 'default'
              }
            />
          </View>

          {race.description ? (
            <Text style={styles.description}>{race.description}</Text>
          ) : null}

          {/* Info Cards */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.infoLabel}>Data e hora</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {formattedDate}
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons
                name="flag-outline"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.infoLabel}>Checkpoints</Text>
              <Text style={styles.infoValue}>
                {race.checkpoints.length} pontos
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons
                name="people-outline"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.infoLabel}>Atletas</Text>
              <Text style={styles.infoValue}>
                {race.participantCount ?? 0} inscritos
              </Text>
            </View>
          </View>

          {/* Map Preview */}
          {race.checkpoints.length > 0 && (
            <View style={styles.mapSection}>
              <Text style={styles.sectionTitle}>Percurso</Text>
              <View style={styles.mapContainer}>
                <MapView
                  style={StyleSheet.absoluteFill}
                  initialRegion={mapRegion}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                >
                  {race.route.length > 1 && (
                    <Polyline
                      coordinates={race.route}
                      strokeColor={Colors.routeColor}
                      strokeWidth={3}
                    />
                  )}
                  {race.checkpoints.map((cp) => (
                    <React.Fragment key={cp.id}>
                      <Circle
                        center={{
                          latitude: cp.latitude,
                          longitude: cp.longitude,
                        }}
                        radius={100}
                        strokeColor={
                          cp.isStart
                            ? Colors.checkpointStart
                            : cp.isFinish
                            ? Colors.checkpointFinish
                            : Colors.checkpointNormal
                        }
                        fillColor={
                          cp.isStart
                            ? `${Colors.checkpointStart}22`
                            : cp.isFinish
                            ? `${Colors.checkpointFinish}22`
                            : `${Colors.checkpointNormal}22`
                        }
                        strokeWidth={2}
                      />
                      <Marker
                        coordinate={{
                          latitude: cp.latitude,
                          longitude: cp.longitude,
                        }}
                        title={cp.name}
                        pinColor={
                          cp.isStart
                            ? Colors.checkpointStart
                            : cp.isFinish
                            ? Colors.checkpointFinish
                            : Colors.checkpointNormal
                        }
                      />
                    </React.Fragment>
                  ))}
                </MapView>
              </View>

              {/* Checkpoint List */}
              <View style={styles.checkpointList}>
                {[...race.checkpoints]
                  .sort((a, b) => a.order - b.order)
                  .map((cp, idx) => (
                    <View key={cp.id} style={styles.checkpointItem}>
                      <View
                        style={[
                          styles.checkpointDot,
                          {
                            backgroundColor: cp.isStart
                              ? Colors.checkpointStart
                              : cp.isFinish
                              ? Colors.checkpointFinish
                              : Colors.checkpointNormal,
                          },
                        ]}
                      >
                        <Text style={styles.checkpointDotText}>{idx + 1}</Text>
                      </View>
                      {idx < race.checkpoints.length - 1 && (
                        <View style={styles.checkpointLine} />
                      )}
                      <Text style={styles.checkpointName}>{cp.name}</Text>
                      {cp.isStart && (
                        <Badge label="Largada" variant="success" size="sm" />
                      )}
                      {cp.isFinish && (
                        <Badge label="Chegada" variant="error" size="sm" />
                      )}
                    </View>
                  ))}
              </View>
            </View>
          )}

          {/* Leaderboard (if active/finished) */}
          {(race.status === 'active' || race.status === 'finished') && (
            <View style={styles.leaderboardSection}>
              <Text style={styles.sectionTitle}>
                {race.status === 'active' ? 'Ranking ao vivo' : 'Resultado final'}
              </Text>
              <LeaderboardList
                entries={entries}
                maleEntries={maleEntries}
                femaleEntries={femaleEntries}
                currentUserId={user?.id}
              />
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            {race.status === 'finished' ? (
              <Badge label="Corrida encerrada" variant="default" />
            ) : race.status === 'active' && isApproved ? (
              <Button
                title="Rastrear minha corrida"
                onPress={handleStartTracking}
                fullWidth
                size="lg"
                icon={<Ionicons name="navigate" size={18} color="#FFF" />}
              />
            ) : registration ? (
              <Badge
                label={
                  registration.status === 'pending'
                    ? 'Aguardando aprovação do organizador'
                    : registration.status === 'approved'
                    ? 'Você está inscrito!'
                    : 'Inscrição não aprovada'
                }
                variant={
                  registration.status === 'pending'
                    ? 'warning'
                    : registration.status === 'approved'
                    ? 'success'
                    : 'error'
                }
              />
            ) : race.status === 'published' ? (
              <Button
                title="Solicitar participação"
                onPress={handleJoinRequest}
                loading={joining}
                fullWidth
                size="lg"
                icon={
                  <Ionicons name="person-add-outline" size={18} color="#FFF" />
                }
              />
            ) : null}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  coverImage: { width: '100%', height: 220 },
  coverPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 20 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  raceName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    flex: 1,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  infoCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoLabel: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  mapSection: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  mapContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  checkpointList: { gap: 0 },
  checkpointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  checkpointDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkpointDotText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  checkpointLine: {
    position: 'absolute',
    left: 13,
    top: 34,
    width: 2,
    height: 20,
    backgroundColor: Colors.border,
  },
  checkpointName: { flex: 1, fontSize: 14, color: Colors.text, fontWeight: '500' },
  leaderboardSection: { marginBottom: 24 },
  actions: { paddingBottom: 40 },
});
