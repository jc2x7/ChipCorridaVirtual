export type Sex = 'M' | 'F';
export type RaceStatus = 'draft' | 'published' | 'active' | 'finished';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  name: string;
  age: number;
  sex: Sex;
  isAdmin: boolean;
  createdAt: Date;
}

export interface Checkpoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  order: number;
  isStart: boolean;
  isFinish: boolean;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface Race {
  id: string;
  name: string;
  description: string;
  photoUrl: string;
  startTime: Date;
  status: RaceStatus;
  createdBy: string;
  route: RoutePoint[];
  checkpoints: Checkpoint[];
  createdAt: Date;
  participantCount?: number;
}

export interface Registration {
  id: string;
  raceId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userSex: Sex;
  userAge: number;
  status: RegistrationStatus;
  requestedAt: Date;
  approvedAt?: Date;
}

export interface CheckpointPassed {
  checkpointId: string;
  checkpointName: string;
  passedAt: Date;
}

export interface TrackingEntry {
  id: string;
  raceId: string;
  userId: string;
  userName: string;
  userSex: Sex;
  userAge: number;
  startedAt: Date;
  finishedAt?: Date;
  checkpointsPassed: CheckpointPassed[];
  isFinished: boolean;
  totalTime?: number; // seconds
  lastPosition?: {
    latitude: number;
    longitude: number;
    updatedAt: Date;
  };
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  userSex: Sex;
  userAge: number;
  checkpointsPassed: number;
  totalCheckpoints: number;
  isFinished: boolean;
  totalTime?: number; // seconds
  finishedAt?: Date;
  rank: number;
  rankMale?: number;
  rankFemale?: number;
}
