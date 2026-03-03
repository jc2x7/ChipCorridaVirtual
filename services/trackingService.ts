import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  TrackingEntry,
  CheckpointPassed,
  LeaderboardEntry,
  Race,
  Sex,
} from '@/types';
import { haversineDistance, formatTime } from '@/lib/haversine';
import { Config } from '@/constants/config';

function docToTracking(
  id: string,
  data: Record<string, unknown>
): TrackingEntry {
  const checkpointsPassed = ((data.checkpointsPassed as unknown[]) ?? []).map(
    (cp: unknown) => {
      const c = cp as Record<string, unknown>;
      return {
        checkpointId: c.checkpointId as string,
        checkpointName: (c.checkpointName as string) ?? '',
        passedAt:
          c.passedAt instanceof Timestamp
            ? (c.passedAt as Timestamp).toDate()
            : new Date(),
      };
    }
  );

  return {
    id,
    raceId: data.raceId as string,
    userId: data.userId as string,
    userName: data.userName as string,
    userSex: data.userSex as Sex,
    userAge: data.userAge as number,
    startedAt:
      data.startedAt instanceof Timestamp
        ? (data.startedAt as Timestamp).toDate()
        : new Date(),
    finishedAt:
      data.finishedAt instanceof Timestamp
        ? (data.finishedAt as Timestamp).toDate()
        : undefined,
    checkpointsPassed,
    isFinished: (data.isFinished as boolean) ?? false,
    totalTime: data.totalTime as number | undefined,
    lastPosition: data.lastPosition as TrackingEntry['lastPosition'],
  };
}

export const trackingService = {
  async startTracking(
    raceId: string,
    userId: string,
    userName: string,
    userSex: Sex,
    userAge: number
  ): Promise<string> {
    // Check existing
    const q = query(
      collection(db, 'race_tracking'),
      where('raceId', '==', raceId),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id;

    const docRef = await addDoc(collection(db, 'race_tracking'), {
      raceId,
      userId,
      userName,
      userSex,
      userAge,
      startedAt: serverTimestamp(),
      checkpointsPassed: [],
      isFinished: false,
      totalTime: null,
      finishedAt: null,
    });
    return docRef.id;
  },

  async recordCheckpoint(
    trackingId: string,
    checkpoint: { id: string; name: string },
    raceStartTime: Date,
    isFinish: boolean
  ): Promise<void> {
    const now = new Date();
    const totalTime = Math.floor(
      (now.getTime() - raceStartTime.getTime()) / 1000
    );

    const update: Record<string, unknown> = {
      checkpointsPassed: arrayUnion({
        checkpointId: checkpoint.id,
        checkpointName: checkpoint.name,
        passedAt: Timestamp.fromDate(now),
      }),
    };

    if (isFinish) {
      update.isFinished = true;
      update.finishedAt = Timestamp.fromDate(now);
      update.totalTime = totalTime;
    }

    await updateDoc(doc(db, 'race_tracking', trackingId), update);
  },

  async updateLastPosition(
    trackingId: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    await updateDoc(doc(db, 'race_tracking', trackingId), {
      lastPosition: {
        latitude,
        longitude,
        updatedAt: Timestamp.fromDate(new Date()),
      },
    });
  },

  async getMyTracking(
    raceId: string,
    userId: string
  ): Promise<TrackingEntry | null> {
    const q = query(
      collection(db, 'race_tracking'),
      where('raceId', '==', raceId),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return docToTracking(
      snap.docs[0].id,
      snap.docs[0].data() as Record<string, unknown>
    );
  },

  subscribeToLeaderboard(
    raceId: string,
    race: Race,
    callback: (entries: LeaderboardEntry[]) => void
  ) {
    const q = query(
      collection(db, 'race_tracking'),
      where('raceId', '==', raceId)
    );

    return onSnapshot(q, (snap) => {
      const totalCheckpoints = race.checkpoints.length;

      const entries: LeaderboardEntry[] = snap.docs.map((d) => {
        const tracking = docToTracking(
          d.id,
          d.data() as Record<string, unknown>
        );
        return {
          userId: tracking.userId,
          userName: tracking.userName,
          userSex: tracking.userSex,
          userAge: tracking.userAge,
          checkpointsPassed: tracking.checkpointsPassed.length,
          totalCheckpoints,
          isFinished: tracking.isFinished,
          totalTime: tracking.totalTime,
          finishedAt: tracking.finishedAt,
          rank: 0,
        };
      });

      // Sort: finished first (by time), then by checkpoints passed
      entries.sort((a, b) => {
        if (a.isFinished && b.isFinished) {
          return (a.totalTime ?? 0) - (b.totalTime ?? 0);
        }
        if (a.isFinished) return -1;
        if (b.isFinished) return 1;
        return b.checkpointsPassed - a.checkpointsPassed;
      });

      // Assign overall ranks
      entries.forEach((e, i) => {
        e.rank = i + 1;
      });

      // Assign male ranks
      let maleRank = 1;
      entries.forEach((e) => {
        if (e.userSex === 'M') {
          e.rankMale = maleRank++;
        }
      });

      // Assign female ranks
      let femaleRank = 1;
      entries.forEach((e) => {
        if (e.userSex === 'F') {
          e.rankFemale = femaleRank++;
        }
      });

      callback(entries);
    });
  },

  subscribeToMyTracking(
    raceId: string,
    userId: string,
    callback: (entry: TrackingEntry | null) => void
  ) {
    const q = query(
      collection(db, 'race_tracking'),
      where('raceId', '==', raceId),
      where('userId', '==', userId)
    );
    return onSnapshot(q, (snap) => {
      if (snap.empty) {
        callback(null);
        return;
      }
      callback(
        docToTracking(
          snap.docs[0].id,
          snap.docs[0].data() as Record<string, unknown>
        )
      );
    });
  },

  checkAndRecordCheckpoints(
    tracking: TrackingEntry,
    race: Race,
    currentLat: number,
    currentLon: number,
    raceStartTime: Date
  ): { checkpointId: string; checkpointName: string } | null {
    const passedIds = new Set(
      tracking.checkpointsPassed.map((cp) => cp.checkpointId)
    );
    const sorted = [...race.checkpoints].sort((a, b) => a.order - b.order);

    // Find the next checkpoint to pass (must be in order)
    for (const checkpoint of sorted) {
      if (passedIds.has(checkpoint.id)) continue;

      const distance = haversineDistance(
        currentLat,
        currentLon,
        checkpoint.latitude,
        checkpoint.longitude
      );

      if (distance <= Config.CHECKPOINT_RADIUS_METERS) {
        return { checkpointId: checkpoint.id, checkpointName: checkpoint.name };
      }
      // Must pass in order — stop at first unmet
      break;
    }
    return null;
  },
};

export { formatTime };
