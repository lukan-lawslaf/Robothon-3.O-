import { api, post, del } from './api';

export interface RegistrationMember {
  memberIndex: number;
  role: 'LEADER' | 'MEMBER';
  name: string;
  enrollment: string;
  email: string;
  phone?: string;
  residence?: string;
}

export interface RegistrationTeam {
  teamId: string;
  teamName: string;
  sourceRow: number;
  leader: RegistrationMember | null;
  members: RegistrationMember[];
  totalMembers: number;
  allMembers: RegistrationMember[];
}

export interface RegistrationResponse {
  success: boolean;
  roster: RegistrationTeam[];
  source?: string;
  updatedAt?: string;
  count?: number;
}

// Client-side CSV parser
export function parseRegistrationCsv(text: string): RegistrationTeam[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  let closed = false;

  text = text.replace(/^\uFEFF/, '');
  const cell = () => {
    row.push(value.trim());
    value = '';
    closed = false;
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        value += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else {
        value += c;
      }
    } else if (c === ',') {
      cell();
    } else if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      cell();
      rows.push(row);
      row = [];
    } else if (c === '"' && !value && !closed) {
      quoted = true;
    } else {
      if (closed || c === '"') continue;
      value += c;
    }
  }
  if (value || closed || row.length) {
    cell();
    rows.push(row);
  }

  if (!rows.length) return [];
  const [headers, ...dataRows] = rows;
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase());

  let teamNameCol = normalizedHeaders.findIndex(h => h === 'team name');
  if (teamNameCol === -1) teamNameCol = 1;

  const teams: RegistrationTeam[] = [];
  const usedTeamIds = new Set<string>();

  for (let r = 0; r < dataRows.length; r++) {
    const rowData = dataRows[r];
    if (!rowData || rowData.every(c => !c)) continue;

    const teamName = (rowData[teamNameCol] || '').trim();
    if (!teamName) continue;

    const members: RegistrationMember[] = [];
    let c = teamNameCol + 1;
    let memberNum = 1;

    while (c < rowData.length) {
      const name = (rowData[c] || '').trim();
      const enrollment = (rowData[c + 1] || '').trim();
      const email = (rowData[c + 2] || '').trim();
      const phone = (rowData[c + 3] || '').trim();
      const residence = (rowData[c + 4] || '').trim();

      if (name || enrollment || email) {
        members.push({
          memberIndex: memberNum,
          role: memberNum === 1 ? 'LEADER' : 'MEMBER',
          name: name || 'Unnamed Participant',
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
    const baseTeamId = leader?.email
      ? 'grid-' + Math.abs(hashCode(leader.email.toLowerCase())).toString(16).slice(0, 16)
      : 'team-' + Math.abs(hashCode(teamName.toLowerCase())).toString(16).slice(0, 10);

    let teamId = baseTeamId;
    let dupCounter = 1;
    while (usedTeamIds.has(teamId)) {
      dupCounter++;
      teamId = `${baseTeamId}-${dupCounter}`;
    }
    usedTeamIds.add(teamId);

    teams.push({
      teamId,
      teamName,
      sourceRow: r + 2,
      leader: leader ? {
        memberIndex: 1,
        role: 'LEADER',
        name: leader.name,
        enrollment: leader.enrollment,
        email: leader.email,
        phone: leader.phone,
        residence: leader.residence,
      } : null,
      members: additionalMembers,
      totalMembers: members.length,
      allMembers: members,
    });
  }

  return teams;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export async function fetchRegistrationRoster(): Promise<RegistrationResponse> {
  return await api<RegistrationResponse>('/api/admin/registrations');
}

export async function saveRegistrationRoster(
  roster: RegistrationTeam[],
  source = 'Uploaded CSV',
  syncTeams = true
): Promise<RegistrationResponse> {
  return await post<RegistrationResponse>('/api/admin/registrations', {
    roster,
    source,
    syncTeams,
  });
}



export async function clearAllRegistrations(): Promise<RegistrationResponse> {
  return await del<RegistrationResponse>('/api/admin/registrations');
}

export async function deleteTeamFromRoster(teamId: string): Promise<RegistrationResponse> {
  return await del<RegistrationResponse>('/api/admin/registrations/teams/' + encodeURIComponent(teamId));
}
