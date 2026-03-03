import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, {
  Polyline,
  Marker,
  Circle,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Race, TrackingEntry } from '@/types';
import { raceService } from '@/services/raceService';
import { trackingService } from '@/services/trackingService';
import { registrationService } from '@/services/registrationService';
import { useAuthStore } from '@/stores/authStore';
import { useTrackingStore } from '@/stores/trackingStore';
import { useLocation } from '@/hooks/useLocation';
import { Colors } from '@/constants/colors';
import { formatTime } from '@/lib/haversine';
import { Loading } from '@/components/ui/Loading';

export default function TrackScreen() {
  const { raceId } = useLocalSearchParams<{ raceId: string }>();
  const { user } = useAuthStore();
  const {
    activeRaceId,
    trackingId,
    setActiveRace,
    setTracking,
    setIsTracking,
    reset,
  } = useTrackingStore();

  const [race, setRace] = useState<Race | null>(null);
  const [tracking, setLocalTracking] = useState<TrackingEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentLocation, setCurrentLocation] =
    useState<{ latitude: number; longitude: number } | null>(null);
  const [nextCheckpointDistance, setNextCheckpointDistance] = useState<
    number | null
  >(null);

  const mapRef = useRef<MapView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  const {
    requestPermissions,
    startForegroundTracking,
    startBackgroundTracking,
    stopBackgroundTracking,
  } = useLocation();

  // Load race
  useEffect(() => {
    if (!raceId) return;
    const unsub = raceService.subscribeToRace(raceId, (r) => {
      setRace(r);
      setLoading(false);
    });
    return unsub;
  }, [raceId]);

  // Subscribe to tracking
  useEffect(() => {
    if (!raceId || !user) return;
    const unsub = trackingService.subscribeToMyTracking(
      raceId,
      user.id,
      (t) => {
        setLocalTracking(t);
        setTracking(t);

        if (t?.isFinished) {
          stopTimer();
          Alert.alert(
            '🏁 Parabéns!',
            `Você completou a corrida!\nTempo: ${formatTime(t.totalTime ?? 0)}`,
            [{ text: 'Ver ranking', onPress: () => router.back() }]
          );
        }
      }
    );
    return unsub;
  }, [raceId, user]);

  // Initialize tracking
  useEffect(() => {
    if (!race || !user) return;
    initTracking();
    return () => cleanup();
  }, [race?.id, user?.id]);

  const initTracking = async () => {
    if (!race || !user) return;

    // Check registration
    const reg = await registrationService.getUserRegistrationForRace(
      race.id,
      user.id
    );
    if (!reg || reg.status !== 'approved') {
      Alert.alert(
        'Acesso negado',
        'Você precisa estar inscrito e aprovado para rastrear.',
        [{ text: 'Voltar', onPress: () => router.back() }]
      );
      return;
    }

    if (race.status !== 'active') {
      Alert.alert('Corrida não iniciada', 'Aguarde o organizador iniciar a corrida.', [
        { text: 'Voltar', onPress: () => router.back() },
      ]);
      return;
    }

    // Request location permissions
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert(
        'Permissão necessária',
        'Precisamos da localização para rastrear os checkpoints.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }

    // Start tracking doc
    const tId = await trackingService.startTracking(
      race.id,
      user.id,
      user.name,
      user.sex,
      user.age
    );
    setActiveRace(race.id, tId);
    setIsTracking(true);

    // Start timer
    startTimer();

    // Start location
    const sub = await startForegroundTracking();
    if (sub) locationSubRef.current = sub;

    await startBackgroundTracking();

    // Watch location for checkpoint validation
    const locSub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 5,
      },
      async (loc) => {
        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setCurrentLocation(coords);

        // Center map on user
        mapRef.current?.animateToRegion(
          {
            ...coords,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          500
        );

        if (!tracking || tracking.isFinished) return;

        // Update position in Firestore (throttled)
        await trackingService.updateLastPosition(
          tId,
          coords.latitude,
          coords.longitude
        );

        // Check checkpoint proximity
        const nextCp = trackingService.checkAndRecordCheckpoints(
          tracking,
          race,
          coords.latitude,
          coords.longitude,
          race.startTime
        );

        if (nextCp) {
          const sorted = [...race.checkpoints].sort(
            (a, b) => a.order - b.order
          );
          const cpIndex = sorted.findIndex((c) => c.id === nextCp.checkpointId);
          const isFinish = cpIndex === sorted.length - 1;

          await trackingService.recordCheckpoint(
            tId,
            nextCp,
            race.startTime,
            isFinish
          );

          if (!isFinish) {
            Alert.alert('✅ Checkpoint!', `Você passou por: ${nextCp.checkpointName}`);
          }
        }
      }
    );
    locationSubRef.current = locSub;
  };

  const startTimer = () => {
    if (!race) return;
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - race.startTime.getTime()) / 1000
      );
      setElapsedTime(Math.max(0, elapsed));
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cleanup = async () => {
    stopTimer();
    if (locationSubRef.current) {
      locationSubRef.current.remove();
    }
    await stopBackgroundTracking();
  };

  if (loading || !race) return <Loading fullScreen message="Preparando rastreamento..." />;

  const checkpointsPassed = tracking?.checkpointsPassed.length ?? 0;
  const totalCheckpoints = race.checkpoints.length;
  const sortedCheckpoints = [...race.checkpoints].sort(
    (a, b) => a.order - b.order
  );
  const nextCheckpoint = sortedCheckpoints.find(
    (cp) =>
      !tracking?.checkpointsPassed.some((p) => p.checkpointId === cp.id)
  );

  const mapRegion = currentLocation ?? {
    latitude:
      race.checkpoints[0]?.latitude ?? -15.7801,
    longitude:
      race.checkpoints[0]?.longitude ?? -47.9292,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{ ...mapRegion, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
        showsUserLocation
        showsMyLocationButton={false}
        followsUserLocation
      >
        {race.route.length > 1 && (
          <Polyline
            coordinates={race.route}
            strokeColor={Colors.routeColor}
            strokeWidth={4}
            strokeColors={[Colors.routeColor]}
          />
        )}

        {sortedCheckpoints.map((cp) => {
          const passed = tracking?.checkpointsPassed.some(
            (p) => p.checkpointId === cp.id
          );
          const isNext = cp.id === nextCheckpoint?.id;

          return (
            <React.Fragment key={cp.id}>
              <Circle
                center={{ latitude: cp.latitude, longitude: cp.longitude }}
                radius={100}
                strokeColor={
                  passed
                    ? Colors.checkpointPassed
                    : isNext
                    ? Colors.primary
                    : cp.isStart
                    ? Colors.checkpointStart
                    : cp.isFinish
                    ? Colors.checkpointFinish
                    : Colors.checkpointNormal
                }
                fillColor={
                  passed
                    ? `${Colors.checkpointPassed}33`
                    : isNext
                    ? `${Colors.primary}33`
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
                  passed
                    ? Colors.checkpointPassed
                    : isNext
                    ? Colors.primary
                    : cp.isFinish
                    ? Colors.checkpointFinish
                    : Colors.checkpointStart
                }
              />
            </React.Fragment>
          );
        })}
      </MapView>

      {/* Top HUD */}
      <SafeAreaView style={styles.hud} edges={['top']}>
        <View style={styles.hudHeader}>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Sair do rastreamento?',
                'Seu progresso será salvo, mas a corrida continuará.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Sair',
                    style: 'destructive',
                    onPress: () => { cleanup(); router.back(); },
                  },
                ]
              );
            }}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.timer}>
            <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
            <Text style={styles.timerLabel}>Tempo de corrida</Text>
          </View>

          <View style={styles.checkpointsBadge}>
            <Text style={styles.checkpointsBadgeText}>
              {checkpointsPassed}/{totalCheckpoints}
            </Text>
            <Text style={styles.checkpointsBadgeLabel}>CPs</Text>
          </View>
        </View>

        {/* Next Checkpoint */}
        {nextCheckpoint && !tracking?.isFinished && (
          <View style={styles.nextCheckpoint}>
            <Ionicons name="navigate" size={16} color={Colors.primary} />
            <Text style={styles.nextCheckpointText} numberOfLines={1}>
              Próximo: {nextCheckpoint.name}
              {nextCheckpoint.isFinish ? ' 🏁' : ''}
            </Text>
          </View>
        )}

        {tracking?.isFinished && (
          <View style={styles.finishedBanner}>
            <Text style={styles.finishedText}>
              🏁 Chegada! {formatTime(tracking.totalTime ?? 0)}
            </Text>
          </View>
        )}
      </SafeAreaView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.progressContainer}>
          <View style={styles.progressRow}>
            {sortedCheckpoints.map((cp, idx) => {
              const passed = tracking?.checkpointsPassed.some(
                (p) => p.checkpointId === cp.id
              );
              return (
                <React.Fragment key={cp.id}>
                  <View
                    style={[
                      styles.progressDot,
                      passed && styles.progressDotPassed,
                      cp.id === nextCheckpoint?.id && styles.progressDotNext,
                    ]}
                  />
                  {idx < sortedCheckpoints.length - 1 && (
                    <View
                      style={[
                        styles.progressConnector,
                        passed && styles.progressConnectorPassed,
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
          <Text style={styles.progressText}>
            {checkpointsPassed} de {totalCheckpoints} checkpoints
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  hudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  timerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  checkpointsBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkpointsBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  checkpointsBadgeLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  nextCheckpoint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextCheckpointText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  finishedBanner: {
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  finishedText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  progressContainer: { gap: 8 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.border,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  progressDotPassed: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  progressDotNext: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  progressConnector: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.border,
    maxWidth: 40,
  },
  progressConnectorPassed: { backgroundColor: Colors.success },
  progressText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
});
