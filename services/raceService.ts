import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
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
    name: (data.name as string) ?? '',
    description: (data.description as string) ?? '',
    photoUrl: (data.photoUrl as string) ?? '',
    startTime:
      data.startTime instanceof Timestamp
        ? data.startTime.toDate()
        : new Date((data.startTime as string) ?? Date.now()),
    status: (data.status as RaceStatus) ?? 'draft',
    createdBy: (data.createdBy as string) ?? '',
    route: (data.route as RoutePoint[]) ?? [],
    checkpoints: (data.checkpoints as Checkpoint[]) ?? [],
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(),
    participantCount: (data.participantCount as number) ?? 0,
  };
}

export const raceService = {
  /* ─────────────────────────────────────────────────────── */
  /*  Write                                                  */
  /* ─────────────────────────────────────────────────────── */

  async createRace(
    createdBy: string,
    data: { name: string; description: string; startTime: Date }
  ): Promise<string> {
    // Use Timestamp.fromDate(new Date()) instead of serverTimestamp() so
    // createdAt is never null locally — serverTimestamp() stays null until
    // the server round-trip completes, which excludes the doc from
    // orderBy('createdAt') queries and makes it "disappear" from the list.
    const payload = {
      name: data.name,
      description: data.description,
      startTime: Timestamp.fromDate(data.startTime),
      status: 'draft',
      createdBy,
      photoUrl: '',
      route: [],
      checkpoints: [],
      participantCount: 0,
      createdAt: Timestamp.fromDate(new Date()),
    };
    const docRef = await addDoc(collection(db, 'races'), payload);
    return docRef.id;
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
    if (updates.startTime instanceof Date) {
      payload.startTime = Timestamp.fromDate(updates.startTime);
    }
    await updateDoc(doc(db, 'races', raceId), payload);
  },

  async deleteRace(raceId: string): Promise<void> {
    await deleteDoc(doc(db, 'races', raceId));
  },

  /* ─────────────────────────────────────────────────────── */
  /*  Read (one-shot)                                        */
  /* ─────────────────────────────────────────────────────── */

  async getPublishedRaces(): Promise<Race[]> {
    const q = query(
      collection(db, 'races'),
      where('status', 'in', ['published', 'active', 'finished']),
      orderBy('startTime', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => docToRace(d.id, d.data() as Record<string, unknown>));
  },

  async getAllRaces(): Promise<Race[]> {
    const snap = await getDocs(collection(db, 'races'));
    return snap.docs
      .map((d) => docToRace(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  /* ─────────────────────────────────────────────────────── */
  /*  Real-time subscriptions                               */
  /* ─────────────────────────────────────────────────────── */

  subscribeToRace(
    raceId: string,
    callback: (race: Race | null) => void,
    onError?: (error: Error) => void
  ) {
    return onSnapshot(
      doc(db, 'races', raceId),
      (snap) => {
        callback(snap.exists() ? docToRace(snap.id, snap.data() as Record<string, unknown>) : null);
      },
      (error) => {
        console.error('[raceService.subscribeToRace] error:', error);
        onError?.(error);
      }
    );
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
        callback(snap.docs.map((d) => docToRace(d.id, d.data() as Record<string, unknown>)));
      },
      (error) => {
        console.error('[raceService.subscribeToPublishedRaces] error:', error);
        onError?.(error);
      }
    );
  },

  subscribeToAllRaces(
    callback: (races: Race[]) => void,
    onError?: (error: Error) => void
  ) {
    // No orderBy here — orderBy('createdAt') would exclude any doc where
    // createdAt is null/missing. We sort client-side instead so every race
    // always shows up regardless of field presence.
    return onSnapshot(
      collection(db, 'races'),
      (snap) => {
        const races = snap.docs
          .map((d) => docToRace(d.id, d.data() as Record<string, unknown>))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        callback(races);
      },
      (error) => {
        console.error('[raceService.subscribeToAllRaces] error:', error);
        onError?.(error);
      }
    );
  },

  /* ─────────────────────────────────────────────────────── */
  /*  Storage                                               */
  /* ─────────────────────────────────────────────────────── */

  async uploadRacePhoto(raceId: string, uri: string): Promise<string> {
    // fetch().blob() doesn't work with local file URIs in React Native.
    // XMLHttpRequest is the only reliable way to produce a valid Blob.
    const blob = await new Promise<Blob>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response as Blob);
      xhr.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem'));
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
    const storageRef = ref(storage, `races/${raceId}/cover.jpg`);
    await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(storageRef);
    (blob as unknown as { close?: () => void }).close?.();
    return url;
  },

  async deleteRacePhoto(raceId: string): Promise<void> {
    try {
      await deleteObject(ref(storage, `races/${raceId}/cover.jpg`));
    } catch {
      // ignore — file may not exist
    }
  },
};
