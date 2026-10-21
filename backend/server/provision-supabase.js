import fs from 'node:fs/promises';
import { supabaseClients } from './supabase.js';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: npm run supabase:provision -- accounts.local.json');
const accounts = JSON.parse(await fs.readFile(inputPath, 'utf8'));
if (!Array.isArray(accounts) || !accounts.length) throw new Error('Provide an array of accounts.');
const emails = new Set(), leaders = new Set(), teamNames = new Map();
for (const a of accounts) {
  if (a.password === 'REPLACE_WITH_UNIQUE_PASSWORD') throw new Error('Replace every example password with a unique password before provisioning.');
  if (!a.name || !a.email || typeof a.password !== 'string' || a.password.length < 12 || !['SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER', 'TEAM_MEMBER'].includes(a.role)) throw new Error('Each account needs name, email, a password of at least 12 characters and a valid role.');
  if (emails.has(a.email.toLowerCase())) throw new Error('Duplicate email in input.');
  emails.add(a.email.toLowerCase());
  if (a.role.startsWith('TEAM_')) {
    if (!a.teamId || !a.teamName) throw new Error('Participant accounts need teamId and teamName.');
    if (teamNames.has(a.teamId) && teamNames.get(a.teamId) !== a.teamName) throw new Error('Accounts in one team must use the same team name.');
    teamNames.set(a.teamId, a.teamName);
    if (a.role === 'TEAM_LEADER') {
      if (leaders.has(a.teamId)) throw new Error('A team can have only one leader.');
      leaders.add(a.teamId);
    }
  } else if (a.teamId) throw new Error('Admin accounts must not belong to a participant team.');
}
const { admin } = supabaseClients();
for (const [id, team_name] of teamNames) {
  const { error } = await admin.from('teams').upsert({ id, team_name });
  if (error) throw new Error('Unable to provision teams. Apply the migration and check server keys.');
}
for (const a of accounts) {
  const { data, error } = await admin.auth.admin.createUser({ email: a.email, password: a.password, email_confirm: true });
  if (error) throw new Error(`Could not create ${a.email}: ${error.message}. Earlier successful accounts are retained; remove them from the input before retrying.`);
  const result = await admin.from('profiles').insert({ id: data.user.id, name: a.name, role: a.role, team_id: a.teamId || null, eligible: a.eligible !== false });
  if (result.error) {
    const cleanup = await admin.auth.admin.deleteUser(data.user.id);
    throw new Error(`Profile creation failed for ${a.email}.${cleanup.error ? ' Remove its incomplete Auth user manually before retrying.' : ' The incomplete Auth user was removed.'} Check team/role constraints.`);
  }
  console.log(`Created ${a.role}: ${a.email}`);
}
console.log('Accounts are ready. Share each password privately with its account owner.');
