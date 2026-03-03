import React, { useEffect, useState } from 'react';
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
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!id) {
      setLoadError('ID da corrida não encontrado.');
      setLoading(false);
      return;
    }

    raceService.getRace(id)
      .then((r) => {
        if (!r) {
          setLoadError('Corrida não encontrada.');
        } else {
          setRace(r);
          reset({ name: r.name, description: r.description });
          setStartDate(new Date(r.startTime));
          setStartTime(new Date(r.startTime));
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setLoadError(msg);
      })
      .finally(() => setLoading(false));
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

  const onSubmit = async (data: FormData) => {
    if (!id || !race) return;
    setSaving(true);
    try {
      const combined = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        startTime.getHours(),
        startTime.getMinutes()
      );

      if (photoUri) {
        try {
          const url = await raceService.uploadRacePhoto(id, photoUri);
          await raceService.updateRace(id, {
            name: data.name.trim(),
            description: data.description?.trim() ?? '',
            startTime: combined,
            photoUrl: url,
          });
        } catch {
          await raceService.updateRace(id, {
            name: data.name.trim(),
            description: data.description?.trim() ?? '',
            startTime: combined,
          });
        }
      } else {
        await raceService.updateRace(id, {
          name: data.name.trim(),
          description: data.description?.trim() ?? '',
          startTime: combined,
        });
      }

      Alert.alert('Salvo!', 'Corrida atualizada com sucesso.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Erro ao salvar', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading fullScreen />;

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Ionicons name="alert-circle-outline" size={52} color={Colors.textMuted} />
        <Text style={styles.errorTitle}>{loadError}</Text>
        <Button title="Voltar" onPress={() => router.back()} size="sm" style={{ marginTop: 8 }} />
      </SafeAreaView>
    );
  }

  if (!race) return null;

  const photoSource = photoUri ?? (race.photoUrl || null);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Foto de capa */}
        <TouchableOpacity onPress={pickPhoto} style={styles.photoPicker} activeOpacity={0.8}>
          {photoSource ? (
            <Image source={{ uri: photoSource }} style={styles.photoImg} resizeMode="cover" />
          ) : (
            <View style={styles.photoEmpty}>
              <Ionicons name="camera-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.photoEmptyText}>Adicionar foto</Text>
            </View>
          )}
          <View style={styles.photoEditBadge}>
            <Ionicons name="camera" size={18} color="#FFF" />
          </View>
        </TouchableOpacity>

        {/* Nome */}
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

        {/* Descrição */}
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

        {/* Data e Hora */}
        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Data de largada</Text>
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
            <Text style={styles.label}>Hora</Text>
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

        {/* Links rápidos */}
        <View style={styles.quickLinks}>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => router.push(`/(admin)/races/${id}/map-editor`)}
            activeOpacity={0.7}
          >
            <Ionicons name="map-outline" size={20} color={Colors.secondary} />
            <Text style={styles.quickLinkText}>Editor de Mapa</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => router.push(`/(admin)/races/${id}/participants`)}
            activeOpacity={0.7}
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
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  content: { padding: 20, paddingBottom: 40 },

  photoPicker: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  photoImg: { width: '100%', height: 160 },
  photoEmpty: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceSecondary,
  },
  photoEmptyText: { fontSize: 14, color: Colors.textMuted },
  photoEditBadge: {
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
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 48 },

  errorTitle: { fontSize: 16, color: Colors.textMuted, textAlign: 'center' },
});
