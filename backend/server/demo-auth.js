import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const accountsPath = fileURLToPath(new URL('../data/demo-accounts.json', import.meta.url));

export async function demoLogin(email, password) {
  const accounts = JSON.parse(await fs.readFile(accountsPath, 'utf8'));
  const account = accounts.find(item => item.email.toLowerCase() === String(email).toLowerCase() && item.password === password);
  if (!account) return null;
  return {
    userId: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    teamId: account.teamId,
    teamName: account.teamName,
    eligible: account.eligible,
    sessionId: `demo-session-${account.id}`
  };
}

export async function demoAccounts() {
  const accounts = JSON.parse(await fs.readFile(accountsPath, 'utf8'));
  return accounts.map(({ password, ...safeAccount }) => ({ ...safeAccount, demoPassword: password }));
}
