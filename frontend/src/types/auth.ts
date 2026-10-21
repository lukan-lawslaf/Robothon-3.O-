export type UserRole = 'participant' | 'admin' | 'super_admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  teamId?: string;
  email?: string;
}

export interface Team {
  id: string;
  teamName: string;
  college?: string;
  leaderName: string;
  membersCount: number;
  qualifiedRound1: boolean;
  tableNumber?: number;
}

export interface AuthState {
  user: User | null;
  team: Team | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  accessCode: string; // Team Access Code or Admin Passcode
  role: UserRole;
}

export interface LoginResponse {
  user: User;
  team?: Team;
  token: string;
}
