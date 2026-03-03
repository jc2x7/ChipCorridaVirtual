import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, {
  Polyline,
  Marker,
  Circle,
  MapPressEvent,
  Region,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Race, Checkpoint, RoutePoint } from '@/types';
import { raceService } from '@/services/raceService';
import { Colors } from '@/constants/colors';
import { Loading } from '@/components/ui/Loading';
import { Button } from '@/components/ui/Button';

function haversineDistance(
  p1: { latitude: number; longitude: number },
  p2: { latitude: number; longitude: number }
): number {
  const R = 6371; // km
  const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1.latitude * Math.PI) / 180) *
      Math.cos((p2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcRouteDistanceKm(points: RoutePoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(points[i - 1], points[i]);
  }
  return total;
}

type EditorMode = 'route' | 'checkpoint' | 'start' | 'finish';

const modeConfig: Record<
  EditorMode,
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  route: { label: 'Rota', color: Colors.routeColor, icon: 'git-merge-outline' },
  checkpoint: {
    label: 'Checkpoint',
    color: Colors.checkpointNormal,
    icon: 'flag-outline',
  },
  start: {
    label: 'Largada',
    color: Colors.checkpointStart,
    icon: 'play-circle-outline',
  },
  finish: {
    label: 'Chegada',
    color: Colors.checkpointFinish,
    icon: 'stop-circle-outline',
  },
};

export default function MapEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [race, setRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<EditorMode>('checkpoint');
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const mapRef = useRef<MapView>(null);
  const currentRegion = useRef<Region | null>(null);

  const zoomIn = () => {
    const base = currentRegion.current ?? initialRegion;
    mapRef.current?.animateToRegion(
      { ...base, latitudeDelta: base.latitudeDelta / 2, longitudeDelta: base.longitudeDelta / 2 },
      250
    );
  };

  const zoomOut = () => {
    const base = currentRegion.current ?? initialRegion;
    mapRef.current?.animateToRegion(
      { ...base, latitudeDelta: base.latitudeDelta * 2, longitudeDelta: base.longitudeDelta * 2 },
      250
    );
  };

  useEffect(() => {
    if (!id) return;
    raceService.getRace(id).then((r) => {
      setRace(r);
      if (r) {
        setRoute(r.route);
        setCheckpoints(r.checkpoints);
      }
      setLoading(false);
    });
  }, [id]);

  const handleMapPress = (e: MapPressEvent) => {
    const coords = e.nativeEvent.coordinate;

    if (mode === 'route') {
      setRoute((prev) => [
        ...prev,
        { latitude: coords.latitude, longitude: coords.longitude },
      ]);
    } else if (mode === 'checkpoint') {
      const order = checkpoints.filter(
        (c) => !c.isStart && !c.isFinish
      ).length + 1;
      const newCp: Checkpoint = {
        id: `cp_${Date.now()}`,
        name: `Checkpoint ${order}`,
        latitude: coords.latitude,
        longitude: coords.longitude,
        order: checkpoints.length,
        isStart: false,
        isFinish: false,
      };
      setCheckpoints((prev) => {
        // Reassign orders
        const updated = [...prev, newCp];
        return updated.map((cp, idx) => ({ ...cp, order: idx }));
      });
    } else if (mode === 'start') {
      const existing = checkpoints.find((c) => c.isStart);
      if (existing) {
        Alert.alert(
          'Largada já definida',
          'Deseja substituir o ponto de largada?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Substituir',
              onPress: () => {
                setCheckpoints((prev) => {
                  const filtered = prev.filter((c) => !c.isStart);
                  const newCp: Checkpoint = {
                    id: `start_${Date.now()}`,
                    name: 'Largada',
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    order: -1,
                    isStart: true,
                    isFinish: false,
                  };
                  const updated = [newCp, ...filtered];
                  return updated.map((cp, idx) => ({ ...cp, order: idx }));
                });
              },
            },
          ]
        );
      } else {
        const newCp: Checkpoint = {
          id: `start_${Date.now()}`,
          name: 'Largada',
          latitude: coords.latitude,
          longitude: coords.longitude,
          order: 0,
          isStart: true,
          isFinish: false,
        };
        setCheckpoints((prev) => {
          const updated = [newCp, ...prev];
          return updated.map((cp, idx) => ({ ...cp, order: idx }));
        });
      }
    } else if (mode === 'finish') {
      const existing = checkpoints.find((c) => c.isFinish);
      if (existing) {
        Alert.alert(
          'Chegada já definida',
          'Deseja substituir o ponto de chegada?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Substituir',
              onPress: () => {
                setCheckpoints((prev) => {
                  const filtered = prev.filter((c) => !c.isFinish);
                  const newCp: Checkpoint = {
                    id: `finish_${Date.now()}`,
                    name: 'Chegada',
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    order: filtered.length,
                    isStart: false,
                    isFinish: true,
                  };
                  return [...filtered, newCp].map((cp, idx) => ({
                    ...cp,
                    order: idx,
                  }));
                });
              },
            },
          ]
        );
      } else {
        const newCp: Checkpoint = {
          id: `finish_${Date.now()}`,
          name: 'Chegada',
          latitude: coords.latitude,
          longitude: coords.longitude,
          order: checkpoints.length,
          isStart: false,
          isFinish: true,
        };
        setCheckpoints((prev) => [
          ...prev,
          { ...newCp, order: prev.length },
        ]);
      }
    }
  };

  const removeLastRoutePoint = () => {
    setRoute((prev) => prev.slice(0, -1));
  };

  const removeCheckpoint = (cpId: string) => {
    setCheckpoints((prev) => {
      const filtered = prev.filter((c) => c.id !== cpId);
      return filtered.map((cp, idx) => ({ ...cp, order: idx }));
    });
  };

  const clearRoute = () => {
    Alert.alert('Limpar rota', 'Deseja remover todos os pontos da rota?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpar', style: 'destructive', onPress: () => setRoute([]) },
    ]);
  };

  const clearAll = () => {
    Alert.alert(
      'Limpar tudo',
      'Remover rota e todos os checkpoints?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: () => {
            setRoute([]);
            setCheckpoints([]);
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!id) return;

    const hasStart = checkpoints.some((c) => c.isStart);
    const hasFinish = checkpoints.some((c) => c.isFinish);

    if (!hasStart || !hasFinish) {
      Alert.alert(
        'Percurso incompleto',
        'É necessário definir a largada e a chegada antes de salvar.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSaving(true);
    try {
      await raceService.updateRace(id, { route, checkpoints });
      Alert.alert('Mapa salvo!', 'Percurso e checkpoints salvos com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o mapa.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !race) return <Loading fullScreen />;

  const initialRegion = {
    latitude: checkpoints[0]?.latitude ?? -15.7801,
    longitude: checkpoints[0]?.longitude ?? -47.9292,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const distanceKm = useMemo(() => calcRouteDistanceKm(route), [route]);

  const sortedCheckpoints = [...checkpoints].sort(
    (a, b) => a.order - b.order
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        onPress={handleMapPress}
        onRegionChangeComplete={(region) => { currentRegion.current = region; }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Route polyline */}
        {route.length > 1 && (
          <Polyline
            coordinates={route}
            strokeColor={Colors.routeColor}
            strokeWidth={4}
          />
        )}

        {/* Route dragging preview points */}
        {mode === 'route' &&
          route.map((pt, idx) => (
            <Marker
              key={`rpt_${idx}`}
              coordinate={pt}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => {
                if (idx === route.length - 1) {
                  Alert.alert('Remover ponto?', '', [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Remover',
                      onPress: () =>
                        setRoute((prev) =>
                          prev.filter((_, i) => i !== idx)
                        ),
                    },
                  ]);
                }
              }}
            >
              <View
                style={[
                  styles.routePoint,
                  idx === route.length - 1 && styles.routePointLast,
                ]}
              />
            </Marker>
          ))}

        {/* Checkpoints */}
        {sortedCheckpoints.map((cp) => (
          <React.Fragment key={cp.id}>
            <Circle
              center={{ latitude: cp.latitude, longitude: cp.longitude }}
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
                  ? `${Colors.checkpointStart}25`
                  : cp.isFinish
                  ? `${Colors.checkpointFinish}25`
                  : `${Colors.checkpointNormal}25`
              }
              strokeWidth={2}
            />
            <Marker
              coordinate={{
                latitude: cp.latitude,
                longitude: cp.longitude,
              }}
              title={cp.name}
              onPress={() => {
                Alert.alert(cp.name, 'O que deseja fazer?', [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: () => removeCheckpoint(cp.id),
                  },
                ]);
              }}
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

      {/* Top Bar */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <View style={styles.topBarRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.topBtn}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.topTitle}>{race.name}</Text>

          <TouchableOpacity
            onPress={() => setShowHelp(!showHelp)}
            style={styles.topBtn}
          >
            <Ionicons
              name="help-circle-outline"
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {showHelp && (
          <View style={styles.helpBox}>
            <Text style={styles.helpText}>
              • Selecione um modo abaixo e toque no mapa{'\n'}
              • Raio de 100m ao redor de cada checkpoint{'\n'}
              • Toque em um marcador para removê-lo{'\n'}
              • Defina Largada e Chegada obrigatoriamente
            </Text>
          </View>
        )}
      </SafeAreaView>

      {/* Zoom Controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity onPress={zoomIn} style={styles.zoomBtn}>
          <Ionicons name="add" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.zoomDivider} />
        <TouchableOpacity onPress={zoomOut} style={styles.zoomBtn}>
          <Ionicons name="remove" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Mode Selector */}
      <View style={styles.modeBar}>
        {(Object.keys(modeConfig) as EditorMode[]).map((m) => {
          const cfg = modeConfig[m];
          const isActive = mode === m;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={[styles.modeBtn, isActive && { borderColor: cfg.color }]}
            >
              <Ionicons
                name={cfg.icon}
                size={18}
                color={isActive ? cfg.color : Colors.textMuted}
              />
              <Text
                style={[
                  styles.modeBtnText,
                  isActive && { color: cfg.color, fontWeight: '700' },
                ]}
              >
                {cfg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom Panel */}
      <View style={styles.bottomPanel}>
        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: Colors.primary }]}>
              {distanceKm < 1
                ? `${Math.round(distanceKm * 1000)}m`
                : `${distanceKm.toFixed(1)}km`}
            </Text>
            <Text style={styles.statLbl}>distância</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>
              {checkpoints.filter((c) => !c.isStart && !c.isFinish).length}
            </Text>
            <Text style={styles.statLbl}>checkpoints</Text>
          </View>
          <View style={styles.stat}>
            <Text
              style={[
                styles.statNum,
                {
                  color: checkpoints.some((c) => c.isStart)
                    ? Colors.success
                    : Colors.error,
                },
              ]}
            >
              {checkpoints.some((c) => c.isStart) ? '✓' : '✗'}
            </Text>
            <Text style={styles.statLbl}>Largada</Text>
          </View>
          <View style={styles.stat}>
            <Text
              style={[
                styles.statNum,
                {
                  color: checkpoints.some((c) => c.isFinish)
                    ? Colors.success
                    : Colors.error,
                },
              ]}
            >
              {checkpoints.some((c) => c.isFinish) ? '✓' : '✗'}
            </Text>
            <Text style={styles.statLbl}>Chegada</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {mode === 'route' && route.length > 0 && (
            <TouchableOpacity
              onPress={removeLastRoutePoint}
              style={[styles.actionBtn, { backgroundColor: Colors.warningBg }]}
            >
              <Ionicons name="arrow-undo" size={16} color={Colors.warning} />
              <Text style={[styles.actionBtnText, { color: Colors.warning }]}>
                Desfazer
              </Text>
            </TouchableOpacity>
          )}

          {(route.length > 0 || checkpoints.length > 0) && (
            <TouchableOpacity
              onPress={clearAll}
              style={[styles.actionBtn, { backgroundColor: Colors.errorBg }]}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
              <Text style={[styles.actionBtnText, { color: Colors.error }]}>
                Limpar tudo
              </Text>
            </TouchableOpacity>
          )}

          <Button
            title="Salvar"
            onPress={handleSave}
            loading={saving}
            size="sm"
            icon={<Ionicons name="checkmark" size={16} color="#FFF" />}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  helpBox: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  helpText: { color: '#FFFFFF', fontSize: 13, lineHeight: 20 },
  modeBar: {
    position: 'absolute',
    left: 12,
    top: 120,
    gap: 8,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  modeBtnText: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  routePoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.routeColor,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  routePointLast: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  stat: { alignItems: 'center', gap: 2 },
  statNum: { fontSize: 18, fontWeight: '800', color: Colors.text },
  statLbl: { fontSize: 11, color: Colors.textMuted },
  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  zoomControls: {
    position: 'absolute',
    right: 12,
    top: 120,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
  },
  zoomBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
});
