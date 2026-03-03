import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Race, Checkpoint, RoutePoint, RaceStatus } from '@/types';

function docToRace(id: string, data: Record<string, unknown>): Race {
  return {
    id,
    name: data.name as string,
    description: data.description as string,
    photoUrl: (data.photoUrl as string) ?? '',
    startTime:
      data.startTime instanceof Timestamp
        ? (data.startTime as Timestamp).toDate()
        : new Date((data.startTime as string) ?? Date.now()),
    status: (data.status as RaceStatus) ?? 'draft',
    createdBy: data.createdBy as string,
    route: (data.route as RoutePoint[]) ?? [],
    checkpoints: (data.checkpoints as Checkpoint[]) ?? [],
    createdAt:
      data.createdAt instanceof Timestamp
        ? (data.createdAt as Timestamp).toDate()
        : new Date(),
    participantCount: (data.participantCount as number) ?? 0,
  };
}

export const raceService = {
  async createRace(
    createdBy: string,
    data: {
      name: string;
      description: string;
      startTime: Date;
    }
  ): Promise<string> {
    const payload = {
      ...data,
      startTime: Timestamp.fromDate(data.startTime),
      status: 'draft',
      createdBy,
      photoUrl: '',
      route: [],
      checkpoints: [],
      participantCount: 0,
      createdAt: serverTimestamp(),
    };
    console.log('[raceService.createRace] payload:', JSON.stringify({ ...payload, startTime: payload.startTime.toDate().toISOString(), createdAt: 'serverTimestamp' }));
    try {
      const docRef = await addDoc(collection(db, 'races'), payload);
      console.log('[raceService.createRace] success, docId:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('[raceService.createRace] Firestore error:', error);
      throw error;
    }
  },

  async updateRace(
    raceId: string,
    updates: Partial<{
      name: string;
      description: string;
      startTime: Date;
      status: RaceStatus;
      photoUrl: string;
      route: RoutePoint[];
      checkpoints: Checkpoint[];
    }>
  ): Promise<void> {
    const payload: Record<string, unknown> = { ...updates };
    if (updates.startTime) {
      payload.startTime = Timestamp.fromDate(updates.startTime);
    }
    await updateDoc(doc(db, 'races', raceId), payload);
  },

  async deleteRace(raceId: string): Promise<void> {
    await deleteDoc(doc(db, 'races', raceId));
  },

  async getRace(raceId: string): Promise<Race | null> {
    const snap = await getDoc(doc(db, 'races', raceId));
    if (!snap.exists()) return null;
    return docToRace(snap.id, snap.data() as Record<string, unknown>);
  },

  async getPublishedRaces(): Promise<Race[]> {
    const q = query(
      collection(db, 'races'),
      where('status', 'in', ['published', 'active', 'finished']),
      orderBy('startTime', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      docToRace(d.id, d.data() as Record<string, unknown>)
    );
  },

  async getAllRaces(): Promise<Race[]> {
    const q = query(collection(db, 'races'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      docToRace(d.id, d.data() as Record<string, unknown>)
    );
  },

  subscribeToRace(raceId: string, callback: (race: Race | null) => void) {
    return onSnapshot(doc(db, 'races', raceId), (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback(docToRace(snap.id, snap.data() as Record<string, unknown>));
    });
  },

  subscribeToPublishedRaces(
    callback: (races: Race[]) => void,
    onError?: (error: Error) => void
  ) {
    const q = query(
      collection(db, 'races'),
      where('status', 'in', ['published', 'active', 'finished']),
      orderBy('startTime', 'asc')
    );
    return onSnapshot(
      q,
      (snap) => {
        const races = snap.docs.map((d) =>
          docToRace(d.id, d.data() as Record<string, unknown>)
        );
        callback(races);
      },
      (error) => {
        console.error('[raceService.subscribeToPublishedRaces] error:', error);
        onError?.(error);
      }
    );
  },

  subscribeToAllRaces(callback: (races: Race[]) => void, onError?: (error: Error) => void) {
    const q = query(collection(db, 'races'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => {
        const races = snap.docs.map((d) =>
          docToRace(d.id, d.data() as Record<string, unknown>)
        );
        callback(races);
      },
      (error) => {
        console.error('[raceService.subscribeToAllRaces] error:', error);
        onError?.(error);
      }
    );
  },

  async uploadRacePhoto(raceId: string, uri: string): Promise<string> {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `races/${raceId}/cover.jpg`);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  },

  async deleteRacePhoto(raceId: string): Promise<void> {
    try {
      await deleteObject(ref(storage, `races/${raceId}/cover.jpg`));
    } catch {
      // ignore if not found
    }
  },
};
