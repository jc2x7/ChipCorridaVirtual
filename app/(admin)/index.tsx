import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { raceService } from '@/services/raceService';
import { Race } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [races, setRaces] = useState<Race[]>([]);

  useEffect(() => {
    const unsub = raceService.subscribeToAllRaces(setRaces);
    return unsub;
  }, []);

  const stats = {
    total: races.length,
    active: races.filter((r) => r.status === 'active').length,
    published: races.filter((r) => r.status === 'published').length,
    draft: races.filter((r) => r.status === 'draft').length,
  };

  const menuItems = [
    {
      title: 'Gerenciar Corridas',
      subtitle: `${stats.total} corridas cadastradas`,
      icon: 'flag' as const,
      color: Colors.primary,
      onPress: () => router.push('/(admin)/races/index'),
    },
    {
      title: 'Nova Corrida',
      subtitle: 'Criar e configurar corrida',
      icon: 'add-circle' as const,
      color: Colors.success,
      onPress: () => router.push('/(admin)/races/create'),
    },
    {
      title: 'Administradores',
      subtitle: 'Gerenciar permissões',
      icon: 'shield-checkmark' as const,
      color: Colors.secondary,
      onPress: () => router.push('/(admin)/admins'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome */}
        <View style={styles.welcome}>
          <Text style={styles.welcomeText}>Olá, {user?.name?.split(' ')[0]}!</Text>
          <Text style={styles.welcomeSub}>Painel de controle</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard} elevated>
            <Text style={styles.statNumber}>{stats.active}</Text>
            <Text style={styles.statLabel}>Ao vivo</Text>
            <View style={[styles.statDot, { backgroundColor: Colors.success }]} />
          </Card>
          <Card style={styles.statCard} elevated>
            <Text style={styles.statNumber}>{stats.published}</Text>
            <Text style={styles.statLabel}>Abertas</Text>
            <View style={[styles.statDot, { backgroundColor: Colors.secondary }]} />
          </Card>
          <Card style={styles.statCard} elevated>
            <Text style={styles.statNumber}>{stats.draft}</Text>
            <Text style={styles.statLabel}>Rascunhos</Text>
            <View style={[styles.statDot, { backgroundColor: Colors.textMuted }]} />
          </Card>
          <Card style={styles.statCard} elevated>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
            <View style={[styles.statDot, { backgroundColor: Colors.primary }]} />
          </Card>
        </View>

        {/* Menu */}
        <Text style={styles.sectionTitle}>Ações</Text>
        <View style={styles.menu}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={item.onPress}
              style={styles.menuItem}
              activeOpacity={0.8}
            >
              <View
                style={[styles.menuIcon, { backgroundColor: `${item.color}18` }]}
              >
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Active Races */}
        {stats.active > 0 && (
          <>
            <Text style={styles.sectionTitle}>Corridas em andamento</Text>
            {races
              .filter((r) => r.status === 'active')
              .map((race) => (
                <TouchableOpacity
                  key={race.id}
                  style={styles.activeRace}
                  onPress={() => router.push(`/(admin)/races/${race.id}/index`)}
                >
                  <View style={styles.livePill}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>AO VIVO</Text>
                  </View>
                  <Text style={styles.activeRaceName}>{race.name}</Text>
                  <Text style={styles.activeRaceParticipants}>
                    {race.participantCount ?? 0} atletas
                  </Text>
                </TouchableOpacity>
              ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  welcome: { marginBottom: 24 },
  welcomeText: { fontSize: 26, fontWeight: '800', color: Colors.text },
  welcomeSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  statNumber: { fontSize: 28, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  menu: {
    gap: 0,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 28,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  menuSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  activeRace: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: `${Colors.success}44`,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  liveText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  activeRaceName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  activeRaceParticipants: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
