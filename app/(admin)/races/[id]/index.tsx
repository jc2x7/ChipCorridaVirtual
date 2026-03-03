import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Race } from '@/types';
import { raceService } from '@/services/raceService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loading } from '@/components/ui/Loading';
import { Colors } from '@/constants/colors';

const schema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  startDate: z.string().min(1),
  startTime: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

export default function EditRaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [race, setRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!id) return;
    raceService.getRace(id).then((r) => {
      setRace(r);
      if (r) {
        reset({
          name: r.name,
          description: r.description,
          startDate: format(r.startTime, 'yyyy-MM-dd'),
          startTime: format(r.startTime, 'HH:mm'),
        });
      }
      setLoading(false);
    });
  }, [id]);

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
      const [year, month, day] = data.startDate.split('-').map(Number);
      const [hour, minute] = data.startTime.split(':').map(Number);
      const startTime = new Date(year, month - 1, day, hour, minute);

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
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !race) return <Loading fullScreen />;

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

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="startDate"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Data de largada"
                  value={value}
                  onChangeText={onChange}
                  hint="AAAA-MM-DD"
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
                  label="Hora"
                  value={value}
                  onChangeText={onChange}
                  hint="HH:MM"
                  leftIcon="time-outline"
                  error={errors.startTime?.message}
                />
              )}
            />
          </View>
        </View>

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
  row: { flexDirection: 'row', gap: 12 },
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
