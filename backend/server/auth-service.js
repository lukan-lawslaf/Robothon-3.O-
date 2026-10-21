import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { QuizError } from './quiz-service.js';

export const hashPassword = password => {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
};

function matches(password, account) {
  if (typeof password !== 'string') return false;
  if (account.passwordHash) {
    const [algorithm, salt, hash] = account.passwordHash.split(':');
    if (algorithm !== 'scrypt' || !salt || !hash) return false;
    const expected = Buffer.from(hash, 'hex');
    const actual = scryptSync(password, salt, 64);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
  return typeof account.password === 'string' && password === account.password;
}

export class AuthService {
  constructor(accounts, { clock = Date.now } = {}) {
    this.accounts = accounts;
    this.sessions = new Map();
    this.clock = clock;
  }
  login({ email, password, portal }) {
    const search = String(email).trim().toLowerCase();
    const account = this.accounts.find(a => !a.disabled && (
      (a.email && a.email.toLowerCase() === search) ||
      (a.id && a.id.toLowerCase() === search)
    ));
    if (!account || !matches(password, account)) throw new QuizError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    const admin = ['ADMIN', 'SUPER_ADMIN'].includes(account.role);
    if (portal && portal !== (admin ? 'admin' : 'participant')) throw new QuizError(403, 'WRONG_PORTAL', `Use the ${admin ? 'admin' : 'participant'} login for this account.`);
    const token = randomBytes(32).toString('hex');
    const context = { authenticated: true, userId: account.id, name: account.name, email: account.email, role: account.role, teamId: account.teamId, teamName: account.teamName, eligible: account.eligible !== false, sessionId: randomUUID() };
    this.sessions.set(token, { context, expiresAt: this.clock() + 12 * 60 * 60 * 1000 });
    return { token, account: { ...context, token } };
  }
  resolve(req) {
    if (req.quizAuthContext?.authenticated) return req.quizAuthContext;
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const session = this.sessions.get(token);
    if (!session || session.expiresAt <= this.clock()) {
      if (token) this.sessions.delete(token);
      throw new QuizError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
    }
    return session.context;
  }
  logout(req) {
    this.sessions.delete(req.headers.authorization?.replace(/^Bearer\s+/i, ''));
    return { ok: true };
  }
}
