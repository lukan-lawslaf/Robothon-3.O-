import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { supabaseClients } from './supabase.js';
import { registrationAccounts, readImportState, planRegistrationImport, applyRegistrationImport } from './registration-import.js';

async function main() {
  const args = process.argv.slice(2), inputPath = args.find(a => !a.startsWith('--'));
  if (!inputPath || args.some(a => a.startsWith('--') && !['--check', '--apply'].includes(a))) throw new Error('Usage: npm run supabase:import-teams -- "registration.csv" [--check | --apply]. With no flag, validates the CSV without connecting.');
  const parsed = registrationAccounts(await fs.readFile(inputPath, 'utf8'));
  console.log(JSON.stringify({ sourceRecords: parsed.sourceRecords, uniqueTeams: parsed.accounts.length, exactDuplicateRows: parsed.duplicates, columns: parsed.columns, enrollmentLengths: [...new Set(parsed.accounts.map(a => a.password.length))], issues: parsed.issues }, null, 2));
  if (parsed.issues.length) throw new Error('Resolve the listed registration issues before importing. No records were written.');
  if (!args.includes('--check') && !args.includes('--apply')) return;
  const { admin } = supabaseClients();
  const plan = planRegistrationImport(parsed.accounts, await readImportState(admin));
  console.log(JSON.stringify({ create: plan.actions.filter(a => a.status === 'create').length, resume: plan.actions.filter(a => a.status === 'resume').length, existing: plan.actions.filter(a => a.status === 'existing').length, conflicts: plan.conflicts }, null, 2));
  if (plan.conflicts.length) throw new Error('Resolve existing-account conflicts before importing. No records were written.');
  if (!args.includes('--apply')) return;
  const reportPath = new URL('../data/registration-import.local.json', import.meta.url);
  await fs.mkdir(path.dirname(fileURLToPath(reportPath)), { recursive: true });
  const completed = await applyRegistrationImport(admin, plan.actions, async records => {
    await fs.writeFile(reportPath, JSON.stringify({ source: path.basename(inputPath), importedAt: new Date().toISOString(), records }, null, 2) + '\n');
    if (records.length % 10 === 0) console.log(`Processed ${records.length}/${plan.actions.length} leaders.`);
  });
  const checked = planRegistrationImport(parsed.accounts, await readImportState(admin));
  if (checked.conflicts.length || checked.actions.some(a => a.status !== 'existing')) throw new Error('Import finished but final verification found incomplete or conflicting profiles. Re-run --check.');
  console.log(`Verified ${completed.length} teams and leader accounts. Login: first College Email; password: first Enrollment Number, exactly as supplied (trimmed). Passwords were sent only to Supabase Auth.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
