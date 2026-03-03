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
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Registration } from '@/types';
import { registrationService } from '@/services/registrationService';
import { authService } from '@/services/authService';
import { Colors } from '@/constants/colors';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';

export default function ParticipantsScreen() {
  const { id: raceId } = useLocalSearchParams<{ id: string }>();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected'
  >('all');

  useEffect(() => {
    if (!raceId) return;
    const unsub = registrationService.subscribeToRaceRegistrations(
      raceId,
      (regs) => {
        setRegistrations(regs);
        setLoading(false);
      }
    );
    return unsub;
  }, [raceId]);

  const handleAddByEmail = async () => {
    if (!searchEmail.trim() || !raceId) return;
    setSearching(true);
    try {
      const user = await authService.searchUserByEmail(searchEmail.trim());
      if (!user) {
        Alert.alert(
          'Usuário não encontrado',
          'Nenhum atleta encontrado com este email.'
        );
        return;
      }
      setAdding(true);
      await registrationService.addParticipantByEmail(raceId, user);
      setSearchEmail('');
      Alert.alert('Atleta adicionado!', `${user.name} foi adicionado e aprovado.`);
    } catch {
      Alert.alert('Erro', 'Não foi possível adicionar o atleta.');
    } finally {
      setSearching(false);
      setAdding(false);
    }
  };

  const handleUpdateStatus = async (
    reg: Registration,
    newStatus: 'approved' | 'rejected'
  ) => {
    if (!raceId) return;
    try {
      await registrationService.updateStatus(reg.id, newStatus, raceId);
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o status.');
    }
  };

  const filtered =
    filter === 'all'
      ? registrations
      : registrations.filter((r) => r.status === filter);

  const counts = {
    all: registrations.length,
    pending: registrations.filter((r) => r.status === 'pending').length,
    approved: registrations.filter((r) => r.status === 'approved').length,
    rejected: registrations.filter((r) => r.status === 'rejected').length,
  };

  if (loading) return <Loading fullScreen />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Add Participant */}
      <View style={styles.addSection}>
        <Text style={styles.addTitle}>Adicionar atleta</Text>
        <View style={styles.addRow}>
          <View style={styles.searchInput}>
            <Ionicons name="mail-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.searchTextInput}
              placeholder="email@atleta.com"
              placeholderTextColor={Colors.textMuted}
              value={searchEmail}
              onChangeText={setSearchEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {searchEmail.length > 0 && (
              <TouchableOpacity onPress={() => setSearchEmail('')}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            )}
          </View>
          <Button
            title="Adicionar"
            onPress={handleAddByEmail}
            loading={searching || adding}
            size="sm"
            disabled={!searchEmail.trim()}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === f && styles.filterTabTextActive,
              ]}
            >
              {f === 'all'
                ? 'Todos'
                : f === 'pending'
                ? 'Aguardando'
                : f === 'approved'
                ? 'Aprovados'
                : 'Rejeitados'}
            </Text>
            {counts[f] > 0 && (
              <View
                style={[
                  styles.filterCount,
                  filter === f && { backgroundColor: Colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.filterCountText,
                    filter === f && { color: '#FFFFFF' },
                  ]}
                >
                  {counts[f]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="people-outline"
              size={48}
              color={Colors.textMuted}
            />
            <Text style={styles.emptyText}>
              {filter === 'pending'
                ? 'Sem solicitações pendentes'
                : 'Nenhum atleta encontrado'}
            </Text>
          </View>
        }
        renderItem={({ item: reg }) => (
          <View style={styles.regCard}>
            <View style={styles.regLeft}>
              <View style={styles.regAvatar}>
                <Text style={styles.regAvatarText}>
                  {reg.userName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.regInfo}>
                <Text style={styles.regName}>{reg.userName}</Text>
                <Text style={styles.regEmail}>{reg.userEmail}</Text>
                <View style={styles.regMeta}>
                  <Badge
                    label={reg.userSex === 'M' ? 'M' : 'F'}
                    variant={reg.userSex === 'M' ? 'male' : 'female'}
                    size="sm"
                  />
                  <Text style={styles.regAge}>{reg.userAge} anos</Text>
                  <Text style={styles.regDate}>
                    {format(reg.requestedAt, 'dd/MM', { locale: ptBR })}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.regRight}>
              {reg.status === 'pending' ? (
                <View style={styles.pendingActions}>
                  <TouchableOpacity
                    onPress={() => handleUpdateStatus(reg, 'approved')}
                    style={[styles.actionIcon, styles.approveIcon]}
                  >
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={Colors.success}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleUpdateStatus(reg, 'rejected')}
                    style={[styles.actionIcon, styles.rejectIcon]}
                  >
                    <Ionicons name="close" size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <Badge
                  label={
                    reg.status === 'approved' ? 'Aprovado' : 'Rejeitado'
                  }
                  variant={
                    reg.status === 'approved' ? 'success' : 'error'
                  }
                  size="sm"
                />
              )}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  addSection: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  addTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
  },
  filterTabActive: { backgroundColor: Colors.primaryBg },
  filterTabText: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  filterTabTextActive: { color: Colors.primary, fontWeight: '700' },
  filterCount: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: { fontSize: 10, fontWeight: '700', color: Colors.text },
  list: { padding: 16 },
  regCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  regLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  regAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regAvatarText: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  regInfo: { flex: 1 },
  regName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  regEmail: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  regMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  regAge: { fontSize: 12, color: Colors.textMuted },
  regDate: { fontSize: 11, color: Colors.textMuted },
  regRight: { alignItems: 'flex-end' },
  pendingActions: { flexDirection: 'row', gap: 8 },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveIcon: { backgroundColor: Colors.successBg },
  rejectIcon: { backgroundColor: Colors.errorBg },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.textMuted },
});
