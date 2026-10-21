import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, registrationAccounts, planRegistrationImport, applyRegistrationImport, IMPORT_MARKER } from '../server/registration-import.js';

const header = 'Timestamp,Team Name,Full Name ,Enrollment Number ,College Email,Full Name ,Enrollment Number ,College Email';
const leader = 'today,Alpha,Leader One,001234,LEADER@example.test,Member One,009876,member@example.test';
const parse = rows => registrationAccounts(header + '\r\n' + rows);
const empty = () => ({ users: [], teams: [], profiles: [] });

test('registration CSV preserves quoted delimiters, newlines, escaped quotes, empty cells and leading zeroes', () => {
  assert.deepEqual(parseCsv('\uFEFFa,b,c\r\n"A, B","C""D","line1\nline2"\r\n001234,,x\r\n'), [
    ['a', 'b', 'c'], ['A, B', 'C"D', 'line1\nline2'], ['001234', '', 'x'],
  ]);
  assert.throws(() => parseCsv('a\n"unfinished'), /quoted field/);
  assert.throws(() => parseCsv('a\n"finished"extra'), /Malformed/);
});

test('first participant email, name and enrollment become the leader, with no member account', () => {
  const parsed = parse(leader);
  assert.deepEqual(parsed.issues, []);
  assert.equal(parsed.accounts.length, 1);
  assert.equal(parsed.accounts[0].email, 'leader@example.test');
  assert.equal(parsed.accounts[0].name, 'Leader One');
  assert.equal(parsed.accounts[0].password, '001234');
  assert.equal(parsed.accounts[0].role, 'TEAM_LEADER');
  assert.equal(parsed.accounts[0].teamName, 'Alpha');
  assert.equal(parsed.accounts[0].teamId, parse(leader).accounts[0].teamId);
});

test('duplicates are explicitly reported and conflicting leader or team identities stop the import', () => {
  const identical = parse(leader + '\n' + leader);
  assert.equal(identical.accounts.length, 1);
  assert.deepEqual(identical.duplicates, [{ sourceRow: 3, duplicateOf: 2 }]);
  assert.equal(parse(leader + '\n' + leader.replace('001234', '991234')).issues.length, 1);
  assert.ok(parse(leader + '\n' + leader.replace('LEADER@example.test', 'other@example.test')).issues.some(i => i.includes('team name')));
  assert.ok(parse(leader.replace('001234', '1.2E+5')).issues.length);
  assert.ok(parse(leader.replace('LEADER@example.test', '')).issues.length);
  assert.ok(parse(leader + ',extra').issues.length);
});

test('preflight never overwrites unrelated accounts, roles or existing team ownership', () => {
  const accounts = parse(leader).accounts;
  const state = empty();
  state.users.push({ id: 'existing', email: accounts[0].email, app_metadata: {} });
  assert.equal(planRegistrationImport(accounts, state).conflicts.length, 1);
  state.users[0].app_metadata = { robothon_import: IMPORT_MARKER, robothon_team_id: accounts[0].teamId };
  state.profiles.push({ id: 'existing', role: 'ADMIN', team_id: null, name: 'Leader One' });
  assert.equal(planRegistrationImport(accounts, state).conflicts.length, 1);
  assert.equal(planRegistrationImport(accounts, { ...empty(), teams: [{ id: 'other', team_name: 'Alpha' }] }).conflicts.length, 1);
});

function fakeAdmin({ failProfile = false } = {}) {
  const writes = [], state = empty();
  return { writes, state, auth: { admin: { createUser: async input => {
    writes.push({ target: 'auth', input });
    const user = { id: 'auth-user', email: input.email, app_metadata: input.app_metadata };
    state.users.push(user);
    return { data: { user }, error: null };
  } } }, from: table => ({
    upsert: async input => { writes.push({ target: table, input }); if (!state.teams.length) state.teams.push(input); return { error: null }; },
    insert: async input => { writes.push({ target: table, input }); if (failProfile) return { error: { code: 'TEMPORARY_FAILURE' } }; state.profiles.push(input); return { error: null }; },
  }) };
}

test('enrollment passwords go only to Supabase Auth, never profiles, teams, metadata or the report', async () => {
  const accounts = parse(leader).accounts, admin = fakeAdmin();
  const plan = planRegistrationImport(accounts, empty());
  const report = await applyRegistrationImport(admin, plan.actions);
  const authWrite = admin.writes.find(w => w.target === 'auth');
  assert.equal(authWrite.input.password, '001234');
  assert.equal(authWrite.input.email_confirm, true);
  assert.equal(JSON.stringify(authWrite.input.app_metadata).includes('001234'), false);
  assert.equal(JSON.stringify(admin.writes.filter(w => w.target !== 'auth')).includes('001234'), false);
  assert.equal(JSON.stringify(report).includes('001234'), false);
  const rerun = planRegistrationImport(accounts, admin.state);
  assert.deepEqual(rerun.conflicts, []);
  assert.equal(rerun.actions[0].status, 'existing');
  const before = admin.writes.length;
  await applyRegistrationImport(admin, rerun.actions);
  assert.equal(admin.writes.length, before);
});

test('a partial profile failure resumes only the marked account without recreating or resetting its password', async () => {
  const accounts = parse(leader).accounts, admin = fakeAdmin({ failProfile: true });
  await assert.rejects(applyRegistrationImport(admin, planRegistrationImport(accounts, empty()).actions), /profile creation failed/);
  const resumed = planRegistrationImport(accounts, admin.state);
  assert.deepEqual(resumed.conflicts, []);
  assert.equal(resumed.actions[0].status, 'resume');
  const next = fakeAdmin();
  await applyRegistrationImport(next, resumed.actions);
  assert.equal(next.writes.some(w => w.target === 'auth'), false);
});
