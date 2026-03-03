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
import { Ionicons } from '@expo/vector-icons';
import { raceService } from '@/services/raceService';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/colors';

const schema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Data de largada obrigatória'),
  startTime: z.string().min(1, 'Hora de largada obrigatória'),
});

type FormData = z.infer<typeof schema>;

export default function CreateRaceScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      startDate: '',
      startTime: '',
    },
  });

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

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setLoading(true);
    try {
      // Parse date/time
      const [year, month, day] = data.startDate.split('-').map(Number);
      const [hour, minute] = data.startTime.split(':').map(Number);
      const startTime = new Date(year, month - 1, day, hour, minute);

      if (isNaN(startTime.getTime())) {
        Alert.alert('Erro', 'Data ou hora inválida.');
        return;
      }

      const raceId = await raceService.createRace(user.id, {
        name: data.name,
        description: data.description ?? '',
        startTime,
      });

      // Upload photo if selected
      if (photoUri) {
        setUploadingPhoto(true);
        const photoUrl = await raceService.uploadRacePhoto(raceId, photoUri);
        await raceService.updateRace(raceId, { photoUrl });
        setUploadingPhoto(false);
      }

      Alert.alert('Corrida criada!', 'Agora configure o mapa e os checkpoints.', [
        {
          text: 'Configurar mapa',
          onPress: () => router.replace(`/(admin)/races/${raceId}/map-editor`),
        },
        {
          text: 'Depois',
          onPress: () => router.replace('/(admin)/races/index'),
        },
      ]);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível criar a corrida. Tente novamente.');
    } finally {
      setLoading(false);
      setUploadingPhoto(false);
    }
  };

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

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
              <Text style={styles.photoPlaceholderText}>
                Adicionar foto de capa
              </Text>
              <Text style={styles.photoPlaceholderSub}>
                Opcional • 16:9 recomendado
              </Text>
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

        <View style={styles.dateTimeRow}>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="startDate"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Data de largada *"
                  placeholder={today}
                  value={value}
                  onChangeText={onChange}
                  keyboardType={Platform.OS === 'ios' ? 'default' : 'default'}
                  hint="Formato: AAAA-MM-DD"
                  leftIcon="calendar-outline"
                  error={errors.startDate?.message}
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="startTime"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Hora *"
                  placeholder="07:00"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="numbers-and-punctuation"
                  hint="Formato: HH:MM"
                  leftIcon="time-outline"
                  error={errors.startTime?.message}
                />
              )}
            />
          </View>
        </View>

        <View style={styles.hint}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={Colors.secondary}
          />
          <Text style={styles.hintText}>
            Após criar, você poderá desenhar o percurso e adicionar os
            checkpoints no editor de mapa.
          </Text>
        </View>

        <Button
          title={uploadingPhoto ? 'Enviando foto...' : 'Criar Corrida'}
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
  dateTimeRow: { flexDirection: 'row', gap: 12 },
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
