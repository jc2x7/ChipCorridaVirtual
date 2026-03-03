import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  MapPressEvent,
  Region,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Race, Checkpoint, RoutePoint } from '@/types';
import { raceService } from '@/services/raceService';
import { Colors } from '@/constants/colors';
import { Loading } from '@/components/ui/Loading';

// ─── Mode definitions ─────────────────────────────────────────────────────────

type EditorMode = 'route' | 'checkpoint' | 'start' | 'finish';

const MODES: {
  mode: EditorMode;
  label: string;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { mode: 'route',      label: 'Rota',        color: Colors.routeColor,        icon: 'git-merge-outline' },
  { mode: 'checkpoint', label: 'Checkpoint',  color: Colors.checkpointNormal,  icon: 'flag-outline' },
  { mode: 'start',      label: 'Largada',     color: Colors.checkpointStart,   icon: 'play-circle-outline' },
  { mode: 'finish',     label: 'Chegada',     color: Colors.checkpointFinish,  icon: 'checkmark-circle-outline' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineKm(
  p1: { latitude: number; longitude: number },
  p2: { latitude: number; longitude: number }
): number {
  const R = 6371;
  const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((p1.latitude * Math.PI) / 180) *
      Math.cos((p2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcRouteKm(points: RoutePoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineKm(points[i - 1], points[i]);
  return total;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [race, setRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<EditorMode>('checkpoint');
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);

  const mapRef = useRef<MapView>(null);
  const mapReady = useRef(false);
  const currentRegion = useRef<Region | null>(null);

  // distanceKm must be computed BEFORE any conditional return (Rules of Hooks)
  const distanceKm = useMemo(() => calcRouteKm(route), [route]);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    const unsub = raceService.subscribeToRace(
      id,
      (r) => {
        setRace(r);
        // Initialise route/checkpoints only once — don't overwrite user edits
        if (r && !mapReady.current) {
          setRoute(r.route ?? []);
          setCheckpoints(r.checkpoints ?? []);
          mapReady.current = true;
        }
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [id]);

  if (loading) return <Loading fullScreen />;

  if (!race) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.notFoundText}>Corrida não encontrada.</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Computed values (after loading guard) ──────────────────────────────────

  const initialRegion: Region = {
    latitude:  checkpoints[0]?.latitude  ?? route[0]?.latitude  ?? -15.7801,
    longitude: checkpoints[0]?.longitude ?? route[0]?.longitude ?? -47.9292,
    latitudeDelta:  0.05,
    longitudeDelta: 0.05,
  };

  const sortedCps = [...checkpoints].sort((a, b) => a.order - b.order);
  const hasStart  = checkpoints.some((c) => c.isStart);
  const hasFinish = checkpoints.some((c) => c.isFinish);

  // ── Map press handler ──────────────────────────────────────────────────────
  // NOTE: Alert.alert() is intentionally NOT called here — calling Alert inside
  // a MapPressEvent handler causes crashes on some versions of react-native-maps
  // on Android. Start / finish points are silently replaced instead.

  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;

    if (mode === 'route') {
      setRoute((prev) => [...prev, { latitude, longitude }]);
      return;
    }

    if (mode === 'checkpoint') {
      const normalCount = checkpoints.filter((c) => !c.isStart && !c.isFinish).length;
      const newCp: Checkpoint = {
        id: `cp_${Date.now()}`,
        name: `Checkpoint ${normalCount + 1}`,
        latitude,
        longitude,
        order: checkpoints.length,
        isStart: false,
        isFinish: false,
      };
      setCheckpoints((prev) => {
        const updated = [...prev, newCp];
        return updated.map((cp, idx) => ({ ...cp, order: idx }));
      });
      return;
    }

    if (mode === 'start') {
      // Replace any existing start silently (no Alert inside map press)
      const newCp: Checkpoint = {
        id: `start_${Date.now()}`,
        name: 'Largada',
        latitude,
        longitude,
        order: 0,
        isStart: true,
        isFinish: false,
      };
      setCheckpoints((prev) => {
        const without = prev.filter((c) => !c.isStart);
        return [newCp, ...without].map((cp, idx) => ({ ...cp, order: idx }));
      });
      return;
    }

    if (mode === 'finish') {
      // Replace any existing finish silently (no Alert inside map press)
      const newCp: Checkpoint = {
        id: `finish_${Date.now()}`,
        name: 'Chegada',
        latitude,
        longitude,
        order: 999,
        isStart: false,
        isFinish: true,
      };
      setCheckpoints((prev) => {
        const without = prev.filter((c) => !c.isFinish);
        return [...without, newCp].map((cp, idx) => ({ ...cp, order: idx }));
      });
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!id) return;
    if (!hasStart || !hasFinish) {
      Alert.alert(
        'Percurso incompleto',
        `Adicione ${!hasStart ? 'a Largada' : 'a Chegada'} antes de salvar.`
      );
      return;
    }
    setSaving(true);
    try {
      await raceService.updateRace(id, { route, checkpoints });
      Alert.alert('Mapa salvo!', 'Percurso salvo com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o mapa.');
    } finally {
      setSaving(false);
    }
  };

  // ── Zoom controls ──────────────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* ── Map area (flex:1) ─────────────────────────────────────────── */}
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={initialRegion}
          onPress={handleMapPress}
          onRegionChangeComplete={(r) => { currentRegion.current = r; }}
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

          {/* Route dot markers (only in route mode) */}
          {mode === 'route' && route.map((pt, idx) => (
            <Marker
              key={`rpt_${idx}`}
              coordinate={pt}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => {
                if (idx === route.length - 1) {
                  setRoute((prev) => prev.slice(0, -1));
                }
              }}
            >
              <View style={[styles.routeDot, idx === route.length - 1 && styles.routeDotLast]} />
            </Marker>
          ))}

          {/* Checkpoints */}
          {sortedCps.map((cp) => {
            const color = cp.isStart
              ? Colors.checkpointStart
              : cp.isFinish
              ? Colors.checkpointFinish
              : Colors.checkpointNormal;

            return (
              <React.Fragment key={cp.id}>
                <Circle
                  center={{ latitude: cp.latitude, longitude: cp.longitude }}
                  radius={100}
                  strokeColor={color}
                  fillColor={`${color}30`}
                  strokeWidth={2}
                />
                <Marker
                  coordinate={{ latitude: cp.latitude, longitude: cp.longitude }}
                  title={cp.name}
                  pinColor={color}
                  onPress={() =>
                    Alert.alert(cp.name, 'Remover este ponto?', [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Remover',
                        style: 'destructive',
                        onPress: () =>
                          setCheckpoints((prev) =>
                            prev
                              .filter((c) => c.id !== cp.id)
                              .map((c, idx) => ({ ...c, order: idx }))
                          ),
                      },
                    ])
                  }
                />
              </React.Fragment>
            );
          })}
        </MapView>

        {/* Top bar — overlaid only on the map, not on the controls below */}
        <SafeAreaView style={styles.topBar} edges={['top']}>
          <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.topTitle} numberOfLines={1}>{race.name}</Text>
          <View style={styles.topBtn} />
        </SafeAreaView>

        {/* Zoom controls (bottom-right of map) */}
        <View style={styles.zoom}>
          <TouchableOpacity style={styles.zoomBtn} onPress={zoomIn}>
            <Ionicons name="add" size={22} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.zoomDivider} />
          <TouchableOpacity style={styles.zoomBtn} onPress={zoomOut}>
            <Ionicons name="remove" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Controls panel — BELOW the map, NO touch conflicts ────────── */}
      <View style={styles.panel}>
        {/* Stats */}
        <View style={styles.stats}>
          <StatItem
            value={distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`}
            label="distância"
            color={Colors.primary}
          />
          <StatItem
            value={String(checkpoints.filter((c) => !c.isStart && !c.isFinish).length)}
            label="checkpoints"
          />
          <StatItem
            value={hasStart ? '✓' : '✗'}
            label="Largada"
            color={hasStart ? Colors.success : Colors.error}
          />
          <StatItem
            value={hasFinish ? '✓' : '✗'}
            label="Chegada"
            color={hasFinish ? Colors.success : Colors.error}
          />
        </View>

        {/* Mode buttons */}
        <View style={styles.modes}>
          {MODES.map((item) => {
            const active = mode === item.mode;
            return (
              <TouchableOpacity
                key={item.mode}
                style={[
                  styles.modeBtn,
                  active && { backgroundColor: `${item.color}18`, borderColor: item.color },
                ]}
                onPress={() => setMode(item.mode)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon}
                  size={15}
                  color={active ? item.color : Colors.textMuted}
                />
                <Text style={[styles.modeTxt, active && { color: item.color, fontWeight: '700' }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action row */}
        <View style={styles.actionRow}>
          {mode === 'route' && route.length > 0 && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.warningBg }]}
              onPress={() => setRoute((prev) => prev.slice(0, -1))}
            >
              <Ionicons name="arrow-undo" size={15} color={Colors.warning} />
              <Text style={[styles.actionBtnTxt, { color: Colors.warning }]}>Desfazer</Text>
            </TouchableOpacity>
          )}

          {(route.length > 0 || checkpoints.length > 0) && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.errorBg }]}
              onPress={() =>
                Alert.alert('Limpar tudo?', 'Remove rota e todos os pontos.', [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Limpar',
                    style: 'destructive',
                    onPress: () => { setRoute([]); setCheckpoints([]); },
                  },
                ])
              }
            >
              <Ionicons name="trash-outline" size={15} color={Colors.error} />
              <Text style={[styles.actionBtnTxt, { color: Colors.error }]}>Limpar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark" size={16} color="#FFF" />
            <Text style={styles.saveBtnTxt}>{saving ? 'Salvando…' : 'Salvar mapa'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Stat mini-component ──────────────────────────────────────────────────────

function StatItem({
  value,
  label,
  color = Colors.text,
}: {
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  notFoundText: { fontSize: 16, color: Colors.textMuted },
  backLink: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backLinkText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // Map wrapper — takes all remaining space above the panel
  mapWrapper: { flex: 1 },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 12,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.50)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  zoom: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  zoomBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  zoomDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 8 },

  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.routeColor,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  routeDotLast: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.primary },

  // Controls panel (NOT overlaid on map — placed below it)
  panel: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 12,
  },

  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, color: Colors.textMuted },

  modes: { flexDirection: 'row', gap: 6 },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  modeTxt: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  actionBtnTxt: { fontSize: 13, fontWeight: '600' },

  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
  },
  saveBtnTxt: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
