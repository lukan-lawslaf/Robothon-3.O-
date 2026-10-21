import { createHash } from 'node:crypto';

export function parseCsv(text) {
  const rows = [];
  let row = [], value = '', quoted = false, closed = false;
  text = text.replace(/^\uFEFF/, '');
  const cell = () => { row.push(value.trim()); value = ''; closed = false; };
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

export function extractTeamsFromCsv(text) {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const [headers, ...dataRows] = rows;
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase());

  let teamNameCol = normalizedHeaders.findIndex(h => h === 'team name');
  if (teamNameCol === -1) teamNameCol = 1;

  const teams = [];

  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r];
    if (!row || row.every(cell => !cell)) continue;

    const teamName = (row[teamNameCol] || '').trim();
    if (!teamName) continue;

    const members = [];
    let c = teamNameCol + 1;
    let memberNum = 1;

    while (c < row.length) {
      const name = (row[c] || '').trim();
      const enrollment = (row[c + 1] || '').trim();
      const email = (row[c + 2] || '').trim();
      const phone = (row[c + 3] || '').trim();
      const residence = (row[c + 4] || '').trim();

      if (name || enrollment || email) {
        members.push({
          memberIndex: memberNum,
          role: memberNum === 1 ? 'LEADER' : 'MEMBER',
          name: name || 'Unnamed Member',
          enrollment: enrollment || 'N/A',
          email: email || 'N/A',
          phone: phone || '',
          residence: residence || '',
        });
      }

      c += 5;
      memberNum++;
    }

    const leader = members.find(m => m.role === 'LEADER') || null;
    const additionalMembers = members.filter(m => m.role !== 'LEADER');
    const teamId = leader?.email ? 'grid-' + createHash('sha256').update(leader.email.toLowerCase()).digest('hex').slice(0, 16) : 'team-' + createHash('md5').update(teamName.toLowerCase()).digest('hex').slice(0, 10);

    teams.push({
      teamId,
      teamName,
      sourceRow: r + 2,
      leader: leader ? {
        name: leader.name,
        enrollment: leader.enrollment,
        email: leader.email,
        phone: leader.phone,
        residence: leader.residence,
      } : null,
      members: additionalMembers,
      totalMembers: members.length,
      allMembers: members
    });
  }

  return teams;
}
