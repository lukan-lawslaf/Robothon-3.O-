import { createClient } from '@supabase/supabase-js';
import { QuizError } from './quiz-service.js';

export function supabaseClients(env = process.env) {
  const url = env.SUPABASE_URL;
  const publicKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  const secret = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publicKey || !secret) throw new Error('Configure SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY in backend/.env. See SUPABASE_SETUP.md.');
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  // Never sign in a user on the service-role client: its database privileges must remain server-only.
  return { admin: createClient(url, secret, options), authClient: () => createClient(url, publicKey, options) };
}

export function databaseError(error) {
  return new QuizError(503, 'DATABASE_UNAVAILABLE', 'The database is unavailable or not configured. Please retry; an organizer should check Supabase setup.');
}

export function tokenSessionId(token) {
  // Call only AFTER Supabase has validated the token or issued it in an authenticated response.
  try {
    const sessionId = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).session_id;
    if (typeof sessionId === 'string' && /^[a-f0-9-]{36}$/i.test(sessionId)) return sessionId;
  } catch { /* invalid token */ }
  throw new QuizError(401, 'INVALID_SESSION', 'Please sign in again.');
}

export class SupabaseAuthService {
  constructor({ admin, authClient }) { this.admin = admin; this.authClient = authClient; }
  authError(error) {
    if (!error?.status || error.status >= 500) return new QuizError(503, 'AUTH_UNAVAILABLE', 'The sign-in service is unavailable. Please try again.');
    return new QuizError(401, 'INVALID_CREDENTIALS', 'Your credentials or session are invalid. Please sign in again.');
  }
  async profile(user, token) {
    const sessionId = tokenSessionId(token);
    const [profileResult, revokedResult] = await Promise.all([
      this.admin.from('profiles').select('id,name,role,team_id,eligible,disabled,teams(team_name)').eq('id', user.id).maybeSingle(),
      this.admin.from('revoked_sessions').select('session_id').eq('session_id', sessionId).maybeSingle(),
    ]);
    if (profileResult.error || revokedResult.error) throw databaseError(profileResult.error || revokedResult.error);
    if (revokedResult.data) throw new QuizError(401, 'SESSION_REVOKED', 'This session has been signed out.');
    const profile = profileResult.data;
    if (!profile || profile.disabled) throw new QuizError(403, 'ACCOUNT_NOT_PROVISIONED', 'Your account is not enabled for Robothon. Contact an organizer.');
    return { authenticated: true, userId: user.id, email: user.email, name: profile.name, role: profile.role, teamId: profile.team_id, teamName: profile.teams?.team_name, eligible: profile.eligible, sessionId };
  }
  async response(data) {
    if (!data.session || !data.user) throw new QuizError(401, 'INVALID_SESSION', 'Please sign in again.');
    const account = await this.profile(data.user, data.session.access_token);
    return { token: data.session.access_token, refreshToken: data.session.refresh_token, expiresAt: data.session.expires_at, account: { ...account, token: data.session.access_token } };
  }
  async login({ email, password, portal }) {
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) throw new QuizError(422, 'CREDENTIALS_REQUIRED', 'Enter your email and password.');
    const { data, error } = await this.authClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw this.authError(error);
    const result = await this.response(data);
    const staff = ['ADMIN', 'SUPER_ADMIN'].includes(result.account.role);
    if (portal && portal !== (staff ? 'admin' : 'participant')) {
      await this.admin.auth.admin.signOut(result.token, 'local');
      throw new QuizError(403, 'WRONG_PORTAL', `Use the ${staff ? 'admin' : 'participant'} login for this account.`);
    }
    return result;
  }
  async refresh({ refreshToken }) {
    if (typeof refreshToken !== 'string' || !refreshToken) throw new QuizError(401, 'INVALID_SESSION', 'Please sign in again.');
    const { data, error } = await this.authClient().auth.refreshSession({ refresh_token: refreshToken });
    if (error) throw this.authError(error);
    return this.response(data);
  }
  async resolve(req) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new QuizError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    const { data, error } = await this.admin.auth.getUser(token);
    if (error) throw this.authError(error);
    if (!data.user) throw new QuizError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    return this.profile(data.user, token);
  }
  async logout(req) {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const context = await this.resolve(req);
    const { error } = await this.admin.from('revoked_sessions').upsert({ session_id: context.sessionId, user_id: context.userId });
    if (error) throw databaseError(error);
    const result = await this.admin.auth.admin.signOut(token, 'local');
    if (result.error && result.error.status !== 401 && result.error.status !== 403) throw this.authError(result.error);
    return { ok: true };
  }
}
