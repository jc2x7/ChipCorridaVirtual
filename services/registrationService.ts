import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  increment,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Registration, RegistrationStatus, User } from '@/types';

function docToRegistration(
  id: string,
  data: Record<string, unknown>
): Registration {
  return {
    id,
    raceId: data.raceId as string,
    userId: data.userId as string,
    userName: data.userName as string,
    userEmail: data.userEmail as string,
    userSex: data.userSex as Registration['userSex'],
    userAge: data.userAge as number,
    status: data.status as RegistrationStatus,
    requestedAt:
      data.requestedAt instanceof Timestamp
        ? (data.requestedAt as Timestamp).toDate()
        : new Date(),
    approvedAt:
      data.approvedAt instanceof Timestamp
        ? (data.approvedAt as Timestamp).toDate()
        : undefined,
  };
}

export const registrationService = {
  async requestToJoin(raceId: string, user: User): Promise<string> {
    // Check if already registered
    const existing = await getDocs(
      query(
        collection(db, 'registrations'),
        where('raceId', '==', raceId),
        where('userId', '==', user.id)
      )
    );
    if (!existing.empty) {
      return existing.docs[0].id;
    }

    const docRef = await addDoc(collection(db, 'registrations'), {
      raceId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userSex: user.sex,
      userAge: user.age,
      status: 'pending',
      requestedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async addParticipantByEmail(raceId: string, user: User): Promise<string> {
    const existing = await getDocs(
      query(
        collection(db, 'registrations'),
        where('raceId', '==', raceId),
        where('userId', '==', user.id)
      )
    );
    if (!existing.empty) {
      const regDoc = existing.docs[0];
      if (regDoc.data().status !== 'approved') {
        await updateDoc(doc(db, 'registrations', regDoc.id), {
          status: 'approved',
          approvedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'races', raceId), {
          participantCount: increment(1),
        });
      }
      return regDoc.id;
    }

    const docRef = await addDoc(collection(db, 'registrations'), {
      raceId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userSex: user.sex,
      userAge: user.age,
      status: 'approved',
      requestedAt: serverTimestamp(),
      approvedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'races', raceId), {
      participantCount: increment(1),
    });

    return docRef.id;
  },

  async updateStatus(
    registrationId: string,
    status: RegistrationStatus,
    raceId: string
  ): Promise<void> {
    const regRef = doc(db, 'registrations', registrationId);
    const regSnap = await getDoc(regRef);
    const prevStatus = regSnap.data()?.status;

    const payload: Record<string, unknown> = { status };
    if (status === 'approved') {
      payload.approvedAt = serverTimestamp();
    }
    await updateDoc(regRef, payload);

    // Update participant count
    if (status === 'approved' && prevStatus !== 'approved') {
      await updateDoc(doc(db, 'races', raceId), {
        participantCount: increment(1),
      });
    } else if (status !== 'approved' && prevStatus === 'approved') {
      await updateDoc(doc(db, 'races', raceId), {
        participantCount: increment(-1),
      });
    }
  },

  async getMyRegistrations(userId: string): Promise<Registration[]> {
    const q = query(
      collection(db, 'registrations'),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      docToRegistration(d.id, d.data() as Record<string, unknown>)
    );
  },

  async getUserRegistrationForRace(
    raceId: string,
    userId: string
  ): Promise<Registration | null> {
    const q = query(
      collection(db, 'registrations'),
      where('raceId', '==', raceId),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return docToRegistration(
      snap.docs[0].id,
      snap.docs[0].data() as Record<string, unknown>
    );
  },

  subscribeToRaceRegistrations(
    raceId: string,
    callback: (registrations: Registration[]) => void
  ) {
    const q = query(
      collection(db, 'registrations'),
      where('raceId', '==', raceId)
    );
    return onSnapshot(q, (snap) => {
      const regs = snap.docs.map((d) =>
        docToRegistration(d.id, d.data() as Record<string, unknown>)
      );
      callback(regs);
    });
  },

  subscribeToMyRegistrations(
    userId: string,
    callback: (registrations: Registration[]) => void
  ) {
    const q = query(
      collection(db, 'registrations'),
      where('userId', '==', userId)
    );
    return onSnapshot(q, (snap) => {
      const regs = snap.docs.map((d) =>
        docToRegistration(d.id, d.data() as Record<string, unknown>)
      );
      callback(regs);
    });
  },
};
