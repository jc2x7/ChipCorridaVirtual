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
import DateTimePicker from '@react-native-community/datetimepicker';
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

function defaultTime() {
  const d = new Date();
  d.setHours(7, 0, 0, 0);
  return d;
}

export default function CreateRaceScreen() {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [startTime, setStartTime] = useState(defaultTime);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const onSubmit = async (data: FormData) => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }

    setSaving(true);
    let raceId: string | null = null;

    try {
      const combined = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        startTime.getHours(),
        startTime.getMinutes()
      );

      raceId = await raceService.createRace(user.id, {
        name: data.name.trim(),
        description: data.description?.trim() ?? '',
        startTime: combined,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Erro ao criar corrida', msg);
      setSaving(false);
      return;
    }

    if (photoUri) {
      try {
        const url = await raceService.uploadRacePhoto(raceId, photoUri);
        await raceService.updateRace(raceId, { photoUrl: url });
      } catch {
        // photo failed — race already saved, continue
      }
    }

    setSaving(false);

    Alert.alert('Corrida criada!', 'Configure o percurso no editor de mapa.', [
      {
        text: 'Abrir mapa',
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
        {/* Foto de capa */}
        <TouchableOpacity onPress={pickPhoto} style={styles.photoPicker} activeOpacity={0.8}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoImg} resizeMode="cover" />
          ) : (
            <View style={styles.photoEmpty}>
              <Ionicons name="camera-outline" size={36} color={Colors.textMuted} />
              <Text style={styles.photoEmptyText}>Adicionar foto de capa</Text>
              <Text style={styles.photoEmptySub}>Opcional • proporção 16:9</Text>
            </View>
          )}
          {photoUri && (
            <View style={styles.photoEditBadge}>
              <Ionicons name="camera" size={20} color="#FFF" />
            </View>
          )}
        </TouchableOpacity>

        {/* Nome */}
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

        {/* Descrição */}
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
            />
          )}
        />

        {/* Data e Hora */}
        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Data de largada *</Text>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              <Text style={styles.pickerText}>
                {format(startDate, "dd 'de' MMM, yyyy", { locale: ptBR })}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.flex1}>
            <Text style={styles.label}>Hora *</Text>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={18} color={Colors.primary} />
              <Text style={styles.pickerText}>{format(startTime, 'HH:mm')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <View style={styles.pickerCard}>
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={new Date()}
              onChange={(_e, date) => {
                if (Platform.OS === 'android') setShowDatePicker(false);
                if (date) setStartDate(date);
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.doneBtn} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.doneBtnText}>Confirmar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {showTimePicker && (
          <View style={styles.pickerCard}>
            <DateTimePicker
              value={startTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              is24Hour
              onChange={(_e, date) => {
                if (Platform.OS === 'android') setShowTimePicker(false);
                if (date) setStartTime(date);
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.doneBtn} onPress={() => setShowTimePicker(false)}>
                <Text style={styles.doneBtnText}>Confirmar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Dica */}
        <View style={styles.hint}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.secondary} />
          <Text style={styles.hintText}>
            Após criar, você poderá desenhar o percurso e adicionar checkpoints no editor de mapa.
          </Text>
        </View>

        <Button
          title="Criar corrida"
          onPress={handleSubmit(onSubmit)}
          loading={saving}
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
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  photoImg: { width: '100%', height: 180 },
  photoEmpty: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceSecondary,
  },
  photoEmptyText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  photoEmptySub: { fontSize: 12, color: Colors.textMuted },
  photoEditBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  flex1: { flex: 1 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  pickerText: { fontSize: 14, fontWeight: '600', color: Colors.text },

  pickerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  doneBtn: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  doneBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

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
