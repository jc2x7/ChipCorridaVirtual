import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
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
import { raceService } from '@/services/raceService';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/colors';

const schema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CreateRaceScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Date/time state — defaults to today + 07:00
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [startTimeDate, setStartTimeDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) setStartDate(selected);
  };

  const onTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selected) setStartTimeDate(selected);
  };

  const onSubmit = async (data: FormData) => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
      return;
    }

    setLoading(true);
    let raceId: string | null = null;

    try {
      // 1. Build start time
      const startTime = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        startTimeDate.getHours(),
        startTimeDate.getMinutes()
      );

      // 2. Create race in Firestore (WITHOUT photo)
      console.log('[CreateRace] creating race for user:', user.id, 'isAdmin:', user.isAdmin);
      raceId = await raceService.createRace(user.id, {
        name: data.name,
        description: data.description ?? '',
        startTime,
      });
      console.log('[CreateRace] race created, id:', raceId);
    } catch (error: unknown) {
      console.error('[CreateRace] create error:', error);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
        Alert.alert(
          'Sem permissão',
          'Sua conta não tem permissão de admin. Faça logout e login novamente para ativar.'
        );
      } else {
        Alert.alert('Erro ao criar corrida', msg);
      }
      setLoading(false);
      return;
    }

    // 3. Upload photo separately (non-blocking — race already exists)
    if (photoUri) {
      try {
        console.log('[CreateRace] uploading photo...');
        const photoUrl = await raceService.uploadRacePhoto(raceId, photoUri);
        await raceService.updateRace(raceId, { photoUrl });
        console.log('[CreateRace] photo uploaded');
      } catch (photoError) {
        console.error('[CreateRace] photo upload failed (race still created):', photoError);
        // Don't block — race was created, photo just failed
      }
    }

    setLoading(false);

    Alert.alert('Corrida criada!', 'Agora configure o mapa e os checkpoints.', [
      {
        text: 'Configurar mapa',
        onPress: () => router.replace(`/(admin)/races/${raceId}/map-editor`),
      },
      {
        text: 'Depois',
        onPress: () => router.replace('/(admin)/races'),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Picker */}
        <TouchableOpacity
          onPress={pickImage}
          style={styles.photoPicker}
          activeOpacity={0.8}
        >
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.photoPreview}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera-outline" size={36} color={Colors.textMuted} />
              <Text style={styles.photoPlaceholderText}>Adicionar foto de capa</Text>
              <Text style={styles.photoPlaceholderSub}>Opcional - 16:9 recomendado</Text>
            </View>
          )}
          {photoUri && (
            <View style={styles.photoOverlay}>
              <Ionicons name="camera" size={22} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Nome da corrida *"
              placeholder="Ex: Corrida do Parque 5k"
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
              placeholder="Descreva a corrida, percurso, regras..."
              value={value}
              onChangeText={onChange}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 100, paddingTop: 12 }}
              leftIcon="document-text-outline"
              error={errors.description?.message}
            />
          )}
        />

        {/* Date & Time Pickers */}
        <View style={styles.dateTimeRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Data de largada *</Text>
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
            <Text style={styles.label}>Hora *</Text>
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

        {/* Native Date Picker */}
        {showDatePicker && (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
              minimumDate={new Date()}
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

        {/* Native Time Picker */}
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

        <View style={styles.hint}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.secondary} />
          <Text style={styles.hintText}>
            Após criar, você poderá desenhar o percurso e adicionar os checkpoints no editor de mapa.
          </Text>
        </View>

        <Button
          title="Criar Corrida"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          fullWidth
          size="lg"
          icon={<Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />}
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
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  photoPreview: { width: '100%', height: 180 },
  photoPlaceholder: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceSecondary,
  },
  photoPlaceholderText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  photoPlaceholderSub: { fontSize: 12, color: Colors.textMuted },
  photoOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.secondaryLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  hintText: { flex: 1, fontSize: 13, color: Colors.secondary, lineHeight: 18 },
});
