// User types
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

// Family types
export interface Family {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  inviteCode: string;
  userRole: 'ADMIN' | 'MEMBER';
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatarUrl?: string;
  role: 'ADMIN' | 'MEMBER';
  isVirtual: boolean;
  userId?: string;
  familyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyJoinRequest {
  id: string;
  message?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  family: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateFamilyData {
  name: string;
  description?: string;
}

export interface JoinFamilyData {
  code: string;
  message?: string;
}

// Navigation types
export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type FamilyStackParamList = {
  FamilyOnboarding: undefined;
  CreateFamily: undefined;
  JoinFamily: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  Family: undefined;
  Tasks: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  FamilyOnboarding: undefined;
  Main: undefined;
}; 