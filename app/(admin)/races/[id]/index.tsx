import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { Race } from '@/types';
import { raceService } from '@/services/raceService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loading } from '@/components/ui/Loading';
import { Colors } from '@/constants/colors';

const schema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditRaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [race, setRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Date/time picker state
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [startTimeDate, setStartTimeDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!id) return;
    raceService
      .getRace(id)
      .then((r) => {
        if (r) {
          setRace(r);
          reset({ name: r.name, description: r.description });
          setStartDate(r.startTime);
          setStartTimeDate(r.startTime);
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        console.error('[EditRace] load error:', err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) setStartDate(selected);
  };

  const onTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selected) setStartTimeDate(selected);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const onSubmit = async (data: FormData) => {
    if (!id || !race) return;
    setSaving(true);
    try {
      const startTime = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        startTimeDate.getHours(),
        startTimeDate.getMinutes()
      );

      const updates: Parameters<typeof raceService.updateRace>[1] = {
        name: data.name,
        description: data.description ?? '',
        startTime,
      };

      if (photoUri) {
        const photoUrl = await raceService.uploadRacePhoto(id, photoUri);
        updates.photoUrl = photoUrl;
      }

      await raceService.updateRace(id, updates);
      Alert.alert('Salvo!', 'Corrida atualizada com sucesso.');
    } catch (error) {
      console.error('[EditRace] save error:', error);
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading fullScreen />;

  if (notFound || !race) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={{ fontSize: 16, color: Colors.textMuted, marginTop: 12 }}>
          Corrida não encontrada
        </Text>
        <Button title="Voltar" onPress={() => router.back()} size="sm" style={{ marginTop: 16 }} />
      </SafeAreaView>
    );
  }

  const photoSource = photoUri ?? race.photoUrl;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo */}
        <TouchableOpacity
          onPress={pickImage}
          style={styles.photoPicker}
          activeOpacity={0.8}
        >
          {photoSource ? (
            <Image
              source={{ uri: photoSource }}
              style={styles.photoPreview}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.photoPlaceholderText}>Adicionar foto</Text>
            </View>
          )}
          <View style={styles.photoOverlay}>
            <Ionicons name="camera" size={18} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Nome da corrida"
              value={value}
              onChangeText={onChange}
              leftIcon="flag-outline"
              error={errors.name?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Descrição"
              value={value}
              onChangeText={onChange}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 80, paddingTop: 12 }}
              leftIcon="document-text-outline"
            />
          )}
        />

        {/* Date & Time Pickers */}
        <View style={styles.dateTimeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Data de largada</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.pickerBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              <Text style={styles.pickerBtnText}>
                {format(startDate, "dd 'de' MMM, yyyy", { locale: ptBR })}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Hora</Text>
            <TouchableOpacity
              onPress={() => setShowTimePicker(true)}
              style={styles.pickerBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={18} color={Colors.primary} />
              <Text style={styles.pickerBtnText}>
                {format(startTimeDate, 'HH:mm')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
              onChange={onDateChange}
              locale="pt-BR"
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.pickerDoneBtn}
              >
                <Text style={styles.pickerDoneBtnText}>Confirmar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {showTimePicker && (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={startTimeDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
              is24Hour
              onChange={onTimeChange}
              locale="pt-BR"
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                onPress={() => setShowTimePicker(false)}
                style={styles.pickerDoneBtn}
              >
                <Text style={styles.pickerDoneBtnText}>Confirmar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Quick Links */}
        <View style={styles.quickLinks}>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => router.push(`/(admin)/races/${id}/map-editor`)}
          >
            <Ionicons name="map-outline" size={20} color={Colors.secondary} />
            <Text style={styles.quickLinkText}>Editor de Mapa</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.quickLinkDivider} />

          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => router.push(`/(admin)/races/${id}/participants`)}
          >
            <Ionicons name="people-outline" size={20} color={Colors.secondary} />
            <Text style={styles.quickLinkText}>Gerenciar Atletas</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Button
          title="Salvar alterações"
          onPress={handleSubmit(onSubmit)}
          loading={saving}
          fullWidth
          size="lg"
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  photoPicker: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  photoPreview: { width: '100%', height: 160 },
  photoPlaceholder: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceSecondary,
  },
  photoPlaceholderText: { fontSize: 14, color: Colors.textMuted },
  photoOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTimeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  pickerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  pickerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerDoneBtn: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  pickerDoneBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  quickLinks: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  quickLinkText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },
  quickLinkDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 48 },
});
