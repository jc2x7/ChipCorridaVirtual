import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, Sex } from '@/types';
import { Config } from '@/constants/config';

export const authService = {
  async register(
    email: string,
    password: string,
    name: string,
    age: number,
    sex: Sex
  ): Promise<User> {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = credential.user;

    const isAdmin =
      email.toLowerCase() === Config.DEFAULT_ADMIN_EMAIL.toLowerCase();

    const userData: Omit<User, 'id' | 'createdAt'> & {
      createdAt: ReturnType<typeof serverTimestamp>;
    } = {
      email: email.toLowerCase(),
      name,
      age,
      sex,
      isAdmin,
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), userData);

    return {
      id: firebaseUser.uid,
      email: email.toLowerCase(),
      name,
      age,
      sex,
      isAdmin,
      createdAt: new Date(),
    };
  },

  async login(email: string, password: string): Promise<string> {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user.uid;
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  async getUserProfile(uid: string): Promise<User | null> {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      email: data.email,
      name: data.name,
      age: data.age,
      sex: data.sex,
      isAdmin: data.isAdmin ?? false,
      createdAt: data.createdAt?.toDate() ?? new Date(),
    };
  },

  async updateProfile(
    uid: string,
    updates: Partial<Pick<User, 'name' | 'age' | 'sex'>>
  ): Promise<void> {
    await updateDoc(doc(db, 'users', uid), updates);
  },

  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  async searchUserByEmail(email: string): Promise<User | null> {
    const q = query(
      collection(db, 'users'),
      where('email', '==', email.toLowerCase())
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    return {
      id: snap.docs[0].id,
      email: data.email,
      name: data.name,
      age: data.age,
      sex: data.sex,
      isAdmin: data.isAdmin ?? false,
      createdAt: data.createdAt?.toDate() ?? new Date(),
    };
  },

  async setAdminRole(uid: string, isAdmin: boolean): Promise<void> {
    await updateDoc(doc(db, 'users', uid), { isAdmin });
  },

  async getAdmins(): Promise<User[]> {
    const q = query(collection(db, 'users'), where('isAdmin', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        email: data.email,
        name: data.name,
        age: data.age,
        sex: data.sex,
        isAdmin: true,
        createdAt: data.createdAt?.toDate() ?? new Date(),
      };
    });
  },
};
