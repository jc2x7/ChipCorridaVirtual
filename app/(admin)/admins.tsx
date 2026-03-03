import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@/types';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/colors';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { Config } from '@/constants/config';

export default function AdminsScreen() {
  const { user: currentUser } = useAuthStore();
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const loadAdmins = async () => {
    const list = await authService.getAdmins();
    setAdmins(list);
    setLoading(false);
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleAddAdmin = async () => {
    if (!searchEmail.trim()) return;
    setAdding(true);
    try {
      const user = await authService.searchUserByEmail(searchEmail.trim());
      if (!user) {
        Alert.alert(
          'Usuário não encontrado',
          'Nenhum usuário cadastrado com este email.'
        );
        return;
      }
      if (user.isAdmin) {
        Alert.alert('Info', 'Este usuário já é administrador.');
        return;
      }
      Alert.alert(
        'Adicionar administrador',
        `Deseja dar permissão de administrador para ${user.name}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            onPress: async () => {
              await authService.setAdminRole(user.id, true);
              setSearchEmail('');
              await loadAdmins();
              Alert.alert('Pronto!', `${user.name} agora é administrador.`);
            },
          },
        ]
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível buscar o usuário.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveAdmin = (user: User) => {
    if (
      user.email.toLowerCase() === Config.DEFAULT_ADMIN_EMAIL.toLowerCase()
    ) {
      Alert.alert('Operação negada', 'Não é possível remover o administrador padrão.');
      return;
    }
    if (user.id === currentUser?.id) {
      Alert.alert('Operação negada', 'Você não pode remover sua própria permissão.');
      return;
    }
    Alert.alert(
      'Remover administrador',
      `Deseja remover a permissão de administrador de ${user.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            await authService.setAdminRole(user.id, false);
            await loadAdmins();
          },
        },
      ]
    );
  };

  if (loading) return <Loading fullScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Add Admin */}
      <View style={styles.addSection}>
        <Text style={styles.addTitle}>Adicionar administrador</Text>
        <Text style={styles.addSubtitle}>
          Busque pelo email de um usuário cadastrado
        </Text>
        <View style={styles.addRow}>
          <View style={styles.searchInput}>
            <Ionicons name="mail-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.searchTextInput}
              placeholder="email@usuario.com"
              placeholderTextColor={Colors.textMuted}
              value={searchEmail}
              onChangeText={setSearchEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <Button
            title="Buscar"
            onPress={handleAddAdmin}
            loading={adding}
            size="sm"
            disabled={!searchEmail.trim()}
          />
        </View>
      </View>

      {/* Admins List */}
      <Text style={styles.listTitle}>
        Administradores ({admins.length})
      </Text>

      <FlatList
        data={admins}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="shield-outline"
              size={48}
              color={Colors.textMuted}
            />
            <Text style={styles.emptyText}>Nenhum administrador</Text>
          </View>
        }
        renderItem={({ item: admin }) => {
          const isDefault =
            admin.email.toLowerCase() ===
            Config.DEFAULT_ADMIN_EMAIL.toLowerCase();
          const isMe = admin.id === currentUser?.id;

          return (
            <View style={styles.adminCard}>
              <View style={styles.adminLeft}>
                <View style={styles.adminAvatar}>
                  <Ionicons
                    name="shield-checkmark"
                    size={20}
                    color={Colors.secondary}
                  />
                </View>
                <View style={styles.adminInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.adminName}>{admin.name}</Text>
                    {isDefault && (
                      <Badge label="Padrão" variant="info" size="sm" />
                    )}
                    {isMe && (
                      <Badge label="Você" variant="default" size="sm" />
                    )}
                  </View>
                  <Text style={styles.adminEmail}>{admin.email}</Text>
                </View>
              </View>

              {!isDefault && !isMe && (
                <TouchableOpacity
                  onPress={() => handleRemoveAdmin(admin)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={22}
                    color={Colors.error}
                  />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  addSection: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  addTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  addSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  addRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
    height: 42,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchTextInput: { flex: 1, fontSize: 14, color: Colors.text },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  adminLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  adminAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  adminName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  adminEmail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.textMuted },
});
