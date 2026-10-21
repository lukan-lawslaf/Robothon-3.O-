import { createHash } from 'node:crypto';

// Keep identifiers as text, including leading zeroes. Repeated Google Forms
// headers are positional: the first participant block is the team leader.
export function parseCsv(text) {
  const rows = [];
  let row = [], value = '', quoted = false, closed = false;
  text = text.replace(/^\uFEFF/, '');
  const cell = () => { row.push(value); value = ''; closed = false; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else value += c;
    } else if (c === ',') cell();
    else if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      cell(); rows.push(row); row = [];
    } else if (c === '"' && !value && !closed) quoted = true;
    else {
      if (closed || c === '"') throw new Error(`Malformed CSV near record ${rows.length + 1}.`);
      value += c;
    }
  }
  if (quoted) throw new Error('CSV ends inside a quoted field.');
  if (value || closed || row.length) { cell(); rows.push(row); }
  return rows;
}

export function registrationAccounts(text) {
  const [headers, ...rows] = parseCsv(text);
  const normalized = headers?.map(h => h.trim().toLowerCase()) || [];
  const columns = {
    team: normalized.indexOf('team name'), name: normalized.indexOf('full name'),
    enrollment: normalized.indexOf('enrollment number'), email: normalized.indexOf('college email'),
  };
  if (Object.values(columns).some(i => i < 0) || columns.enrollment !== columns.name + 1 || columns.email !== columns.name + 2) {
    throw new Error('Expected Team Name followed by the first Full Name, Enrollment Number and College Email participant block.');
  }
  const accounts = [], duplicates = [], issues = [], emails = new Map(), teams = new Map(), enrollments = new Map();
  rows.forEach((row, i) => {
    const sourceRow = i + 2;
    if (row.every(cell => !cell.trim())) return;
    if (row.length !== headers.length) { issues.push(`Row ${sourceRow}: column count does not match the header.`); return; }
    const name = row[columns.name].trim(), teamName = row[columns.team].trim();
    const email = row[columns.email].trim().toLowerCase();
    const password = row[columns.enrollment].trim();
    if (!name || !teamName || !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email) || password.length < 6 || /\s/.test(password) || /^\d+(?:\.\d+)?e[+-]?\d+$/i.test(password)) {
      issues.push(`Row ${sourceRow}: check the team name, leader name, first email and enrollment number (at least 6 characters, preserved as text).`);
      return;
    }
    const account = { sourceRow, name, teamName, email, password, role: 'TEAM_LEADER', teamId: `grid-${createHash('sha256').update(email).digest('hex').slice(0, 16)}` };
    const existing = emails.get(email);
    if (existing) {
      if (existing.name === name && existing.teamName === teamName && existing.password === password) duplicates.push({ sourceRow, duplicateOf: existing.sourceRow });
      else issues.push(`Rows ${existing.sourceRow} and ${sourceRow}: same leader email with conflicting registration details.`);
      return;
    }
    const teamKey = teamName.toLowerCase();
    if (teams.has(teamKey)) issues.push(`Rows ${teams.get(teamKey)} and ${sourceRow}: repeated team name with different leaders.`);
    if (enrollments.has(password.toLowerCase())) issues.push(`Rows ${enrollments.get(password.toLowerCase())} and ${sourceRow}: repeated leader enrollment with different emails.`);
    emails.set(email, account); teams.set(teamKey, sourceRow); enrollments.set(password.toLowerCase(), sourceRow); accounts.push(account);
  });
  if (!accounts.length) issues.push('No valid leader registrations were found.');
  return { accounts, duplicates, issues, sourceRecords: rows.filter(r => r.some(c => c.trim())).length, columns };
}

export const IMPORT_MARKER = 'robothon-team-grid-v1';

export async function readImportState(admin) {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Unable to read Supabase Auth accounts (${error.code || error.status}).`);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const readTable = async (table, columns) => {
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await admin.from(table).select(columns).order('id').range(offset, offset + 999);
      if (error) throw new Error(`Unable to read ${table} (${error.code}). Apply the platform migration and check the backend keys.`);
      rows.push(...data);
      if (data.length < 1000) return rows;
    }
  };
  const [teams, profiles] = await Promise.all([readTable('teams', 'id,team_name'), readTable('profiles', 'id,name,role,team_id,disabled')]);
  return { users, teams, profiles };
}

export function planRegistrationImport(accounts, { users, teams, profiles }) {
  const actions = [], conflicts = [];
  const byEmail = new Map(users.map(u => [u.email?.toLowerCase(), u]));
  const byId = new Map(profiles.map(p => [p.id, p]));
  for (const account of accounts) {
    const user = byEmail.get(account.email), profile = user && byId.get(user.id);
    const team = teams.find(t => t.id === account.teamId);
    const sameName = teams.find(t => t.team_name.trim().toLowerCase() === account.teamName.toLowerCase() && t.id !== account.teamId);
    const otherLeader = profiles.find(p => p.team_id === account.teamId && p.role === 'TEAM_LEADER' && p.id !== user?.id);
    if ((team && team.team_name !== account.teamName) || sameName || otherLeader) {
      conflicts.push(`Row ${account.sourceRow}: an existing team/leader conflicts with this registration.`);
    } else if (user && (user.app_metadata?.robothon_import !== IMPORT_MARKER || user.app_metadata?.robothon_team_id !== account.teamId)) {
      conflicts.push(`Row ${account.sourceRow}: email already belongs to an account outside this import; it will not be changed.`);
    } else if (profile && (profile.role !== 'TEAM_LEADER' || profile.team_id !== account.teamId || profile.name !== account.name || profile.disabled)) {
      conflicts.push(`Row ${account.sourceRow}: the existing profile differs or is disabled; it will not be changed.`);
    } else actions.push({ account, user, status: profile ? 'existing' : user ? 'resume' : 'create' });
  }
  return { actions, conflicts };
}

export async function applyRegistrationImport(admin, actions, onProgress = async () => {}) {
  const completed = [];
  for (const { account, user: existingUser, status } of actions) {
    let user = existingUser;
    if (status !== 'existing') {
      const team = await admin.from('teams').upsert({ id: account.teamId, team_name: account.teamName }, { onConflict: 'id', ignoreDuplicates: true });
      if (team.error) throw new Error(`Row ${account.sourceRow}: team creation failed (${team.error.code}). Re-run the import to resume.`);
      if (!user) {
        const result = await admin.auth.admin.createUser({ email: account.email, password: account.password, email_confirm: true,
          app_metadata: { robothon_import: IMPORT_MARKER, robothon_team_id: account.teamId } });
        if (result.error) throw new Error(`Row ${account.sourceRow}: Auth creation failed (${result.error.code || result.error.status}): ${result.error.message}. Completed rows are retained; re-run to resume.`);
        user = result.data.user;
      }
      const result = await admin.from('profiles').insert({ id: user.id, name: account.name, role: 'TEAM_LEADER', team_id: account.teamId, eligible: true });
      if (result.error) throw new Error(`Row ${account.sourceRow}: profile creation failed (${result.error.code}). The marked Auth account is retained so re-running can safely resume.`);
    }
    // Never write passwords or enrollment numbers into application tables/reports.
    const record = { sourceRow: account.sourceRow, teamId: account.teamId, teamName: account.teamName, email: account.email, userId: user.id, status: status === 'existing' ? 'existing' : 'imported' };
    completed.push(record);
    await onProgress([...completed]);
  }
  return completed;
}
