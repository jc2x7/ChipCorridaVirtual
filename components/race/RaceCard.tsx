import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Race, RaceStatus } from '@/types';
import { Colors } from '@/constants/colors';
import { Badge } from '@/components/ui/Badge';

const statusLabel: Record<RaceStatus, string> = {
  draft: 'Rascunho',
  published: 'Inscrito',
  active: 'Em Andamento',
  finished: 'Encerrada',
};

const statusVariant: Record<
  RaceStatus,
  'default' | 'info' | 'success' | 'warning' | 'error'
> = {
  draft: 'default',
  published: 'info',
  active: 'success',
  finished: 'default',
};

interface RaceCardProps {
  race: Race;
  onPress: () => void;
  showStatus?: boolean;
  userStatus?: string;
}

export function RaceCard({
  race,
  onPress,
  showStatus = false,
  userStatus,
}: RaceCardProps) {
  const formattedDate = format(race.startTime, "dd MMM yyyy 'às' HH:mm", {
    locale: ptBR,
  });

  const checkpointCount = race.checkpoints.length;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.container}
    >
      {race.photoUrl ? (
        <Image
          source={{ uri: race.photoUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="flag" size={40} color={Colors.textMuted} />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {race.name}
          </Text>
          {showStatus && (
            <Badge
              label={statusLabel[race.status]}
              variant={statusVariant[race.status]}
              size="sm"
            />
          )}
        </View>

        {race.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {race.description}
          </Text>
        ) : null}

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.metaText}>{formattedDate}</Text>
          </View>

          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.metaText}>
              {checkpointCount} checkpoint{checkpointCount !== 1 ? 's' : ''}
            </Text>
          </View>

          {race.participantCount !== undefined && (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>{race.participantCount} atletas</Text>
            </View>
          )}
        </View>

        {userStatus && (
          <View style={styles.userStatusRow}>
            <Badge
              label={
                userStatus === 'pending'
                  ? 'Aguardando aprovação'
                  : userStatus === 'approved'
                  ? 'Aprovado'
                  : 'Rejeitado'
              }
              variant={
                userStatus === 'pending'
                  ? 'warning'
                  : userStatus === 'approved'
                  ? 'success'
                  : 'error'
              }
              size="sm"
            />
          </View>
        )}

        {race.status === 'active' && (
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>AO VIVO</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: 160,
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 10,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  userStatusRow: {
    marginTop: 10,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: '#FFF1F2',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.error,
    letterSpacing: 0.5,
  },
});
