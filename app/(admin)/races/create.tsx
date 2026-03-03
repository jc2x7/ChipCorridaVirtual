import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { raceService } from '@/services/raceService';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/colors';

function buildStartTime(date: Date, time: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.getHours(),
    time.getMinutes(),
    0,
    0
  );
}

function defaultHour(): Date {
  const d = new Date();
  d.setHours(7, 0, 0, 0);
  return d;
}

export default function CreateRaceScreen() {
  const { user } = useAuthStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');

  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [date, setDate] = useState(() => new Date());
  const [time, setTime] = useState(defaultHour);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [saving, setSaving] = useState(false);

  /* ── Photo ───────────────────────────────────────────── */
  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  /* ── Submit ──────────────────────────────────────────── */
  const handleCreate = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      setNameError('O nome deve ter pelo menos 3 caracteres.');
      return;
    }
    setNameError('');

    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
      return;
    }

    setSaving(true);
    let raceId = '';

    try {
      raceId = await raceService.createRace(user.id, {
        name: trimmed,
        description: description.trim(),
        startTime: buildStartTime(date, time),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Não foi possível criar a corrida', msg);
      setSaving(false);
      return;
    }

    if (photoUri) {
      try {
        const url = await raceService.uploadRacePhoto(raceId, photoUri);
        await raceService.updateRace(raceId, { photoUrl: url });
      } catch {
        // foto falhou — corrida já criada, continua
      }
    }

    setSaving(false);

    Alert.alert(
      'Corrida criada!',
      'Agora desenhe o percurso e adicione os checkpoints.',
      [
        {
          text: 'Abrir editor de mapa',
          onPress: () => router.replace(`/(admin)/races/${raceId}/map-editor`),
        },
        {
          text: 'Ver minhas corridas',
          style: 'cancel',
          onPress: () => router.replace('/(admin)/races'),
        },
      ]
    );
  };

  /* ── Render ──────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      {/* ── Scroll area ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Cover photo ── */}
        <TouchableOpacity onPress={pickPhoto} activeOpacity={0.85} style={styles.coverArea}>
          {photoUri ? (
            <>
              <Image source={{ uri: photoUri }} style={styles.coverImage} resizeMode="cover" />
              <View style={styles.coverEditPill}>
                <Ionicons name="camera" size={14} color="#FFF" />
                <Text style={styles.coverEditText}>Alterar foto</Text>
              </View>
            </>
          ) : (
            <View style={styles.coverPlaceholder}>
              <View style={styles.coverIconCircle}>
                <Ionicons name="camera-outline" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.coverPlaceholderTitle}>Adicionar foto de capa</Text>
              <Text style={styles.coverPlaceholderSub}>Opcional · proporção 16:9</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Seção: Detalhes ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DETALHES</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nome da corrida</Text>
            <TextInput
              style={[styles.fieldInput, nameError ? styles.fieldInputError : null]}
              placeholder="Ex: Corrida do Parque 5k"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={(v) => { setName(v); if (nameError) setNameError(''); }}
              returnKeyType="next"
              maxLength={80}
            />
            {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}
          </View>

          <View style={[styles.field, styles.fieldLast]}>
            <Text style={styles.fieldLabel}>Descrição</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputMulti]}
              placeholder="Descreva a corrida, regras, percurso..."
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>
        </View>

        {/* ── Seção: Quando ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>QUANDO</Text>

          {/* Data */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => { setShowTimePicker(false); setShowDatePicker((v) => !v); }}
            activeOpacity={0.7}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Data de largada</Text>
              <Text style={styles.rowValue}>
                {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
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
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                onChange={(_e, picked) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (picked) setDate(picked);
                }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.confirmBtn} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.confirmBtnText}>Confirmar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.rowDivider} />

          {/* Hora */}
          <TouchableOpacity
            style={[styles.row, styles.rowLast]}
            onPress={() => { setShowDatePicker(false); setShowTimePicker((v) => !v); }}
            activeOpacity={0.7}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="time-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Horário de largada</Text>
              <Text style={styles.rowValue}>{format(time, "HH'h'mm")}</Text>
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
                value={time}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                is24Hour
                onChange={(_e, picked) => {
                  if (Platform.OS === 'android') setShowTimePicker(false);
                  if (picked) setTime(picked);
                }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.confirmBtn} onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.confirmBtnText}>Confirmar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ── Info ── */}
        <View style={styles.infoBar}>
          <Ionicons name="map-outline" size={16} color={Colors.secondary} />
          <Text style={styles.infoText}>
            Após criar, você desenhará o percurso e adicionará os checkpoints no editor de mapa.
          </Text>
        </View>
      </ScrollView>

      {/* ── Footer fixo ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createBtn, saving && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="flag" size={18} color="#FFF" />
              <Text style={styles.createBtnText}>Criar corrida</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },

  /* Cover */
  coverArea: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.surfaceSecondary,
    overflow: 'hidden',
  },
  coverImage: { width: '100%', height: '100%' },
  coverEditPill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  coverEditText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  coverIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  coverPlaceholderTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  coverPlaceholderSub: { fontSize: 12, color: Colors.textMuted },

  /* Section */
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

  /* Field */
  field: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 16,
  },
  fieldLast: {
    borderBottomWidth: 0,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  fieldInput: {
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 0,
    lineHeight: 22,
  },
  fieldInputError: { color: Colors.error },
  fieldInputMulti: { minHeight: 64, lineHeight: 22 },
  fieldError: { fontSize: 12, color: Colors.error, marginTop: 4 },

  /* Row (date/time) */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
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
  rowDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 48 },

  pickerWrap: {
    paddingBottom: 12,
  },
  confirmBtn: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 8,
  },
  confirmBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  /* Info */
  infoBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    margin: 16,
    backgroundColor: Colors.secondaryLight,
    borderRadius: 12,
    padding: 14,
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.secondary, lineHeight: 19 },

  /* Footer */
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  createBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});
