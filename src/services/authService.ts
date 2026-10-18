import { LoginCredentials, LoginResponse, User, Team } from '../types/auth';
import { MOCK_TEAMS, MOCK_CURRENT_TEAM } from '../mockData/teams.mock';

/**
 * Service: Authentication & Session Management
 * Owner: Ishan
 */

// TODO: [Ishan] Connect to POST /api/auth/login
// Expected Request: { accessCode: string, role: 'participant' | 'admin' }
// Expected Response: { token: string, user: User, team?: Team }
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (credentials.role === 'admin') {
    if (credentials.accessCode === 'admin123' || credentials.accessCode === 'TECHADMIN') {
      const adminUser: User = {
        id: 'admin-01',
        name: 'Technical Admin',
        role: 'admin',
        email: 'admin@robothon.internal',
      };
      return {
        user: adminUser,
        token: 'mock-jwt-admin-token-xyz789',
      };
    }
    throw new Error('Invalid Admin Passcode. Hint: use "admin123" for preview.');
  }

  // Participant Login
  // Match team by access code (or default to AquaPulse for demo)
  const matchedTeam = MOCK_TEAMS.find(
    (t) => t.id.toLowerCase() === credentials.accessCode.toLowerCase()
  ) || MOCK_CURRENT_TEAM;

  const participantUser: User = {
    id: `usr-${matchedTeam.id}`,
    name: matchedTeam.leaderName,
    role: 'participant',
    teamId: matchedTeam.id,
  };

  return {
    user: participantUser,
    team: matchedTeam,
    token: `mock-jwt-team-token-${matchedTeam.id}`,
  };
};

// TODO: [Ishan] Connect to GET /api/auth/me or token refresh
// Header: Authorization: Bearer <token>
export const getCurrentSession = async (token: string): Promise<LoginResponse | null> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  if (!token) return null;

  if (token.includes('admin')) {
    return {
      user: { id: 'admin-01', name: 'Technical Admin', role: 'admin' },
      token,
    };
  }

  return {
    user: { id: 'usr-team-01', name: MOCK_CURRENT_TEAM.leaderName, role: 'participant', teamId: MOCK_CURRENT_TEAM.id },
    team: MOCK_CURRENT_TEAM,
    token,
  };
};

// TODO: [Ishan] Connect to POST /api/auth/logout
export const logout = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  localStorage.removeItem('robothon_auth_token');
  localStorage.removeItem('robothon_user_role');
};
