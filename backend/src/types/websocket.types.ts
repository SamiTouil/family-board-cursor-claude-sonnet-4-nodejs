export interface UserData {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  isVirtual: boolean;
}

export interface FamilyData {
  id: string;
  name: string;
  description?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JoinRequestData {
  id: string;
  familyId: string;
  userId: string;
  message?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
  family: {
    name: string;
  };
  user: {
    firstName: string;
    lastName: string;
    email: string | null;
  };
}

export interface TaskData {
  id: string;
  title: string;
  description?: string | null;
  familyId: string;
  createdBy: string;
  assignedTo?: string | null;
  status: string;
  priority: string;
  dueDate?: Date | null;
  completedAt?: Date | null;
  isDeleted: boolean;
}

export interface FamilyUpdateData {
  family: Partial<FamilyData>;
  updatedBy: string;
}

export interface WebSocketEventData {
  type: string;
  payload: UserData | FamilyData | JoinRequestData | TaskData | FamilyUpdateData | Record<string, unknown>;
}