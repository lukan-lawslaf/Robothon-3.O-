import fs from 'node:fs/promises';
import { hashPassword } from './auth-service.js';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: npm run provision -- input.local.json data/accounts.local.json');
const accounts = JSON.parse(await fs.readFile(input, 'utf8'));
if (!Array.isArray(accounts) || !accounts.length) throw new Error('Provide an array of accounts.');
const emails = new Set(), ids = new Set();
const result = accounts.map(account => {
  const { password, ...safe } = account;
  if (!account.id || !account.email || !account.name || !['ADMIN', 'SUPER_ADMIN', 'TEAM_LEADER', 'TEAM_MEMBER'].includes(account.role)) throw new Error('Each account needs a unique id, email, name and valid role.');
  if (emails.has(account.email.toLowerCase()) || ids.has(account.id)) throw new Error('Duplicate email or account id.');
  emails.add(account.email.toLowerCase()); ids.add(account.id);
  if (account.role.startsWith('TEAM_') && (!account.teamId || !account.teamName)) throw new Error('Participant accounts need teamId and teamName.');
  if (!account.passwordHash && (typeof password !== 'string' || password.length < 12)) throw new Error('New account passwords must contain at least 12 characters.');
  return { ...safe, passwordHash: password ? hashPassword(password) : account.passwordHash };
});
if (!result.some(a => a.role === 'SUPER_ADMIN')) throw new Error('Provision at least one SUPER_ADMIN.');
await fs.writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(`Provisioned ${result.length} accounts. Keep the input and output files private.`);
