import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '@/services/authService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/colors';
import { Sex } from '@/types';

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
  age: z
    .string()
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 10 && Number(v) <= 100, {
      message: 'Idade inválida (10-100)',
    }),
  sex: z.enum(['M', 'F'], { message: 'Selecione o sexo' }),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { sex: undefined },
  });

  const selectedSex = watch('sex');

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await authService.register(
        data.email,
        data.password,
        data.name,
        Number(data.age),
        data.sex as Sex
      );
      // Root layout auth listener will redirect
    } catch (error: unknown) {
      const msg =
        error instanceof Error && error.message.includes('email-already-in-use')
          ? 'Este email já está cadastrado.'
          : 'Erro ao criar conta. Tente novamente.';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>
            Preencha seus dados para participar das corridas
          </Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Nome completo"
                placeholder="João Silva"
                value={value}
                onChangeText={onChange}
                autoCapitalize="words"
                leftIcon="person-outline"
                error={errors.name?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Email"
                placeholder="seu@email.com"
                value={value}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon="mail-outline"
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="age"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Idade"
                placeholder="25"
                value={value}
                onChangeText={onChange}
                keyboardType="number-pad"
                leftIcon="calendar-outline"
                error={errors.age?.message}
              />
            )}
          />

          {/* Sex selector */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>Sexo</Text>
            <View style={styles.sexRow}>
              {(['M', 'F'] as Sex[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setValue('sex', s)}
                  style={[
                    styles.sexOption,
                    selectedSex === s && styles.sexOptionActive,
                  ]}
                >
                  <Ionicons
                    name={s === 'M' ? 'man-outline' : 'woman-outline'}
                    size={22}
                    color={
                      selectedSex === s ? Colors.primary : Colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.sexLabel,
                      selectedSex === s && styles.sexLabelActive,
                    ]}
                  >
                    {s === 'M' ? 'Masculino' : 'Feminino'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.sex && (
              <Text style={styles.errorText}>{errors.sex.message}</Text>
            )}
          </View>

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Senha"
                placeholder="••••••••"
                value={value}
                onChangeText={onChange}
                isPassword
                leftIcon="lock-closed-outline"
                hint="Mínimo 6 caracteres"
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Confirmar senha"
                placeholder="••••••••"
                value={value}
                onChangeText={onChange}
                isPassword
                leftIcon="lock-closed-outline"
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <Button
            title="Criar Conta"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            fullWidth
            size="lg"
            style={{ marginTop: 8 }}
          />

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Já tem conta? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Entrar</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  header: { paddingTop: 60, paddingBottom: 32 },
  backButton: { marginBottom: 20, alignSelf: 'flex-start' },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: { fontSize: 15, color: Colors.textSecondary },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  sexRow: { flexDirection: 'row', gap: 12 },
  sexOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  sexOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  sexLabel: { fontSize: 15, color: Colors.textMuted, fontWeight: '500' },
  sexLabelActive: { color: Colors.primary, fontWeight: '700' },
  errorText: { fontSize: 12, color: Colors.error, marginTop: 4, marginLeft: 2 },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: { fontSize: 15, color: Colors.textSecondary },
  loginLink: { fontSize: 15, color: Colors.primary, fontWeight: '700' },
});
