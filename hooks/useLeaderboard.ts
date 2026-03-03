import { useState, useEffect } from 'react';
import { LeaderboardEntry, Race } from '@/types';
import { trackingService } from '@/services/trackingService';

export function useLeaderboard(raceId: string, race: Race | null) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!raceId || !race) {
      setLoading(false);
      return;
    }

    const unsubscribe = trackingService.subscribeToLeaderboard(
      raceId,
      race,
      (newEntries) => {
        setEntries(newEntries);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [raceId, race]);

  const maleEntries = entries
    .filter((e) => e.userSex === 'M')
    .map((e, i) => ({ ...e, rankMale: i + 1 }));

  const femaleEntries = entries
    .filter((e) => e.userSex === 'F')
    .map((e, i) => ({ ...e, rankFemale: i + 1 }));

  return { entries, maleEntries, femaleEntries, loading };
}
