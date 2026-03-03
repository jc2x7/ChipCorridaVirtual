import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LeaderboardEntry } from '@/types';
import { Colors } from '@/constants/colors';
import { formatTime } from '@/lib/haversine';

type FilterType = 'all' | 'male' | 'female';

interface LeaderboardListProps {
  entries: LeaderboardEntry[];
  maleEntries: LeaderboardEntry[];
  femaleEntries: LeaderboardEntry[];
  currentUserId?: string;
}

export function LeaderboardList({
  entries,
  maleEntries,
  femaleEntries,
  currentUserId,
}: LeaderboardListProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const displayed =
    filter === 'all' ? entries : filter === 'male' ? maleEntries : femaleEntries;

  const getRank = (entry: LeaderboardEntry) => {
    if (filter === 'male') return entry.rankMale ?? entry.rank;
    if (filter === 'female') return entry.rankFemale ?? entry.rank;
    return entry.rank;
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: LeaderboardEntry;
    index: number;
  }) => {
    const rank = getRank(item);
    const isMe = item.userId === currentUserId;

    return (
      <View
        style={[
          styles.row,
          isMe && styles.myRow,
          rank <= 3 && styles.topRow,
        ]}
      >
        <View style={styles.rankContainer}>
          {rank === 1 ? (
            <Text style={styles.medal}>🥇</Text>
          ) : rank === 2 ? (
            <Text style={styles.medal}>🥈</Text>
          ) : rank === 3 ? (
            <Text style={styles.medal}>🥉</Text>
          ) : (
            <Text style={styles.rankText}>#{rank}</Text>
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, isMe && { color: Colors.primary }]}
              numberOfLines={1}
            >
              {item.userName}
              {isMe ? ' (você)' : ''}
            </Text>
            <View
              style={[
                styles.sexDot,
                {
                  backgroundColor:
                    item.userSex === 'M' ? Colors.maleColor : Colors.femaleColor,
                },
              ]}
            />
          </View>

          <View style={styles.progress}>
            <Text style={styles.checkpointText}>
              {item.checkpointsPassed}/{item.totalCheckpoints} checkpoints
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(item.checkpointsPassed / Math.max(item.totalCheckpoints, 1)) * 100}%`,
                    backgroundColor: item.isFinished
                      ? Colors.success
                      : Colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        <View style={styles.timeContainer}>
          {item.isFinished ? (
            <>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.timeFinished}>
                {formatTime(item.totalTime ?? 0)}
              </Text>
            </>
          ) : item.checkpointsPassed > 0 ? (
            <Text style={styles.timeRunning}>Em curso</Text>
          ) : (
            <Text style={styles.timePending}>Aguardando</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.tabs}>
        {(['all', 'male', 'female'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.tab, filter === f && styles.tabActive]}
          >
            <Text
              style={[styles.tabText, filter === f && styles.tabTextActive]}
            >
              {f === 'all' ? 'Geral' : f === 'male' ? 'Masculino' : 'Feminino'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {displayed.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="trophy-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>
            Nenhum atleta no ranking ainda
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.userId}
          renderItem={renderItem}
          scrollEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.text,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  myRow: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  topRow: {
    borderColor: '#E5E7EB',
  },
  rankContainer: {
    width: 36,
    alignItems: 'center',
  },
  medal: {
    fontSize: 22,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  sexDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progress: {
    gap: 3,
  },
  checkpointText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeContainer: {
    alignItems: 'flex-end',
    gap: 2,
  },
  timeFinished: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.success,
  },
  timeRunning: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '600',
  },
  timePending: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
