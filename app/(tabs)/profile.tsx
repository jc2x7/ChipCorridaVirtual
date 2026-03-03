import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Colors } from '@/constants/colors';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja mesmo sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.badgeRow}>
            <Badge
              label={user.sex === 'M' ? 'Masculino' : 'Feminino'}
              variant={user.sex === 'M' ? 'male' : 'female'}
            />
            <Badge label={`${user.age} anos`} variant="default" />
            {user.isAdmin && (
              <Badge label="Administrador" variant="info" />
            )}
          </View>
        </View>

        {/* Stats */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons
                name="calendar-outline"
                size={24}
                color={Colors.primary}
              />
              <Text style={styles.statValue}>{user.age}</Text>
              <Text style={styles.statLabel}>Anos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Ionicons
                name={user.sex === 'M' ? 'man-outline' : 'woman-outline'}
                size={24}
                color={
                  user.sex === 'M' ? Colors.maleColor : Colors.femaleColor
                }
              />
              <Text style={styles.statValue}>
                {user.sex === 'M' ? 'M' : 'F'}
              </Text>
              <Text style={styles.statLabel}>Sexo</Text>
            </View>
          </View>
        </Card>

        {/* Admin Panel */}
        {user.isAdmin && (
          <TouchableOpacity
            onPress={() => router.push('/(admin)')}
            style={styles.adminButton}
            activeOpacity={0.8}
          >
            <View style={styles.adminButtonLeft}>
              <View style={styles.adminIconContainer}>
                <Ionicons name="shield-checkmark" size={22} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.adminButtonTitle}>Painel do Organizador</Text>
                <Text style={styles.adminButtonSubtitle}>
                  Gerenciar corridas e atletas
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        )}

        {/* Menu Items */}
        <Card style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <Ionicons
              name="person-outline"
              size={20}
              color={Colors.textSecondary}
            />
            <Text style={styles.menuItemText}>Editar perfil</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <Ionicons
              name="notifications-outline"
              size={20}
              color={Colors.textSecondary}
            />
            <Text style={styles.menuItemText}>Notificações</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
            <Ionicons
              name="help-circle-outline"
              size={20}
              color={Colors.textSecondary}
            />
            <Text style={styles.menuItemText}>Ajuda e suporte</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        </Card>

        <Button
          title="Sair da conta"
          variant="outline"
          onPress={handleLogout}
          loading={loggingOut}
          fullWidth
          style={{ marginTop: 8 }}
          icon={
            <Ionicons
              name="log-out-outline"
              size={18}
              color={Colors.primary}
            />
          }
        />

        <Text style={styles.version}>ChipCorrida Virtual v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  userName: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  statsCard: { marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 6 },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textMuted },
  statDivider: { width: 1, backgroundColor: Colors.border },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.secondaryLight,
  },
  adminButtonLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  adminIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminButtonTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  adminButtonSubtitle: { fontSize: 12, color: Colors.textSecondary },
  menuCard: { marginBottom: 16, padding: 0 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  menuItemText: { flex: 1, fontSize: 15, color: Colors.text },
  menuDivider: { height: 1, backgroundColor: Colors.border, marginLeft: 50 },
  version: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
});
