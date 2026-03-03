import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { raceService } from '@/services/raceService';
import { Loading } from '@/components/ui/Loading';
import { Colors } from '@/constants/colors';

export default function EditRaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading]       = useState(true);
  const [loadError, setLoadError]   = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);

  const [name, setName]             = useState('');
  const [description, setDesc]      = useState('');
  const [nameError, setNameError]   = useState('');
  const [photoUri, setPhotoUri]     = useState<string | null>(null);
  const [photoUrl, setPhotoUrl]     = useState('');
  const [startDate, setStartDate]   = useState(new Date());
  const [startTime, setStartTime]   = useState(new Date());

  const [showDatePicker, setShowDate] = useState(false);
  const [showTimePicker, setShowTime] = useState(false);

  // Initialise the form once from Firestore, then leave state alone so user
  // edits are not overwritten on subsequent snapshot deliveries.
  const formReady = useRef(false);

  useEffect(() => {
    if (!id) {
      setLoadError('ID da corrida não encontrado.');
      setLoading(false);
      return;
    }

    const unsub = raceService.subscribeToRace(
      id,
      (r) => {
        if (!r) {
          setLoadError('Corrida não encontrada.');
          setLoading(false);
          return;
        }
        if (!formReady.current) {
          setName(r.name);
          setDesc(r.description ?? '');
          setPhotoUrl(r.photoUrl ?? '');
          setStartDate(new Date(r.startTime));
          setStartTime(new Date(r.startTime));
          formReady.current = true;
        }
        setLoading(false);
      },
      (err) => {
        setLoadError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [id]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setNameError('O nome deve ter pelo menos 3 caracteres.');
      return;
    }
    setNameError('');

    if (!id) return;

    const combined = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate(),
      startTime.getHours(),
      startTime.getMinutes(),
      0, 0
    );

    setSaving(true);
    try {
      const updates: Parameters<typeof raceService.updateRace>[1] = {
        name: trimmed,
        description: description.trim(),
        startTime: combined,
      };

      if (photoUri) {
        try {
          const url = await raceService.uploadRacePhoto(id, photoUri);
          updates.photoUrl = url;
        } catch {
          // photo upload failed — save the rest anyway
        }
      }

      await raceService.updateRace(id, updates);
      Alert.alert('Salvo!', 'Corrida atualizada com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      Alert.alert('Erro ao salvar', err instanceof Error ? err.message : 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loading) return <Loading fullScreen />;

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={52} color={Colors.textMuted} />
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const photoSource = photoUri ?? (photoUrl || null);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Cover photo */}
        <TouchableOpacity onPress={pickPhoto} style={styles.photoPicker} activeOpacity={0.8}>
          {photoSource ? (
            <Image source={{ uri: photoSource }} style={styles.photoImg} resizeMode="cover" />
          ) : (
            <View style={styles.photoEmpty}>
              <Ionicons name="camera-outline" size={28} color={Colors.textMuted} />
              <Text style={styles.photoEmptyText}>Adicionar foto de capa</Text>
            </View>
          )}
          <View style={styles.photoBadge}>
            <Ionicons name="camera" size={16} color="#FFF" />
          </View>
        </TouchableOpacity>

        {/* Details section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DETALHES</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>NOME DA CORRIDA</Text>
            <TextInput
              style={[styles.fieldInput, nameError ? { color: Colors.error } : null]}
              value={name}
              onChangeText={(v) => { setName(v); if (nameError) setNameError(''); }}
              placeholder="Ex: Corrida do Parque 5k"
              placeholderTextColor={Colors.textMuted}
              maxLength={80}
            />
            {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}
          </View>

          <View style={[styles.field, styles.fieldLast]}>
            <Text style={styles.fieldLabel}>DESCRIÇÃO</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldMulti]}
              value={description}
              onChangeText={setDesc}
              placeholder="Descreva a corrida..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>
        </View>

        {/* When section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>QUANDO</Text>

          {/* Date row */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => { setShowTime(false); setShowDate((v) => !v); }}
            activeOpacity={0.7}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Data de largada</Text>
              <Text style={styles.rowValue}>
                {format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </Text>
            </View>
            <Ionicons
              name={showDatePicker ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          {showDatePicker && (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_e, d) => {
                  if (Platform.OS === 'android') setShowDate(false);
                  if (d) setStartDate(d);
                }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.confirmBtn} onPress={() => setShowDate(false)}>
                  <Text style={styles.confirmBtnText}>Confirmar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.divider} />

          {/* Time row */}
          <TouchableOpacity
            style={[styles.row, styles.rowLast]}
            onPress={() => { setShowDate(false); setShowTime((v) => !v); }}
            activeOpacity={0.7}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="time-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Horário</Text>
              <Text style={styles.rowValue}>{format(startTime, "HH'h'mm")}</Text>
            </View>
            <Ionicons
              name={showTimePicker ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          {showTimePicker && (
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={startTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                is24Hour
                onChange={(_e, d) => {
                  if (Platform.OS === 'android') setShowTime(false);
                  if (d) setStartTime(d);
                }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.confirmBtn} onPress={() => setShowTime(false)}>
                  <Text style={styles.confirmBtnText}>Confirmar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Quick links */}
        <View style={styles.links}>
          <TouchableOpacity
            style={styles.link}
            onPress={() => router.push(`/(admin)/races/${id}/map-editor`)}
            activeOpacity={0.7}
          >
            <Ionicons name="map-outline" size={20} color={Colors.secondary} />
            <Text style={styles.linkText}>Editor de Mapa</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.link}
            onPress={() => router.push(`/(admin)/races/${id}/participants`)}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={20} color={Colors.secondary} />
            <Text style={styles.linkText}>Gerenciar Atletas</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Fixed footer save button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#FFF" />
              <Text style={styles.saveBtnText}>Salvar alterações</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  content: { paddingBottom: 16 },

  photoPicker: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.surfaceSecondary,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImg: { width: '100%', height: '100%' },
  photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoEmptyText: { fontSize: 14, color: Colors.textMuted },
  photoBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: {
    backgroundColor: Colors.surface,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 12,
  },
  field: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 16,
  },
  fieldLast: { borderBottomWidth: 0, marginBottom: 4 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldInput: { fontSize: 16, color: Colors.text, paddingVertical: 0, lineHeight: 22 },
  fieldMulti: { minHeight: 64 },
  fieldError: { fontSize: 12, color: Colors.error, marginTop: 4 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  rowLast: { paddingBottom: 16 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', marginBottom: 2 },
  rowValue: { fontSize: 15, fontWeight: '700', color: Colors.text },

  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 48 },

  pickerWrap: { paddingBottom: 12 },
  confirmBtn: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 8,
  },
  confirmBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  links: {
    backgroundColor: Colors.surface,
    marginTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
    overflow: 'hidden',
  },
  link: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  linkText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  errorText: { fontSize: 16, color: Colors.textMuted, textAlign: 'center' },
  backBtn: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
