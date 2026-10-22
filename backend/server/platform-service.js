import { randomUUID } from 'node:crypto';
import { QuizError } from './quiz-service.js';

const definitions = [
  ['Motor Mounting & Connection', 'motors', 'Mount the motors securely and verify all connections.', 100],
  ['L298N Motor Driver Setup', 'l298n', 'Connect the motor driver, power supply and motor outputs.', 100],
  ['ESP32 Logic Wiring', 'wires', 'Wire the ESP32, sensors and motor driver.', 100],
  ['Firmware & Code Push', 'esp32', 'Upload firmware and verify basic control functions.', 100],
  ['3S Battery Power Integration', 'battery', 'Check battery connections and power distribution.', 100],
  ['Wi-Fi / BLE Pairing', 'esp32', 'Pair the controller and verify wireless commands.', 100],
  ['Polarity Check & Maiden Run', 'chassis', 'Verify polarity and complete a controlled test run.', 200],
].map(([title, subsystem, description, points], i) => ({ id: `cp-${i + 1}`, code: `CP 0${i + 1}`, stepNumber: i + 1, title, subsystem, description, points }));

export class PlatformService {
  constructor(store, accounts) {
    this.store = store;
    this.syncTeams(accounts);
  }
  get state() { return this.store.state.platform; }
  syncTeams(accounts = []) {
    const teams = [...new Map((accounts || []).filter(a => a.teamId && a.teamId !== 'demo-participant-team' && a.teamName !== 'Demo Team').map(a => [a.teamId, { id: a.teamId, teamName: a.teamName }])).values()];
    this.store.state.platform ??= { teams: [], checkpoints: {}, tickets: [], bonuses: [] };
    if (!Array.isArray(this.store.state.platform.teams)) {
      this.store.state.platform.teams = Object.values(this.store.state.platform.teams || {});
    }
    for (const team of teams) {
      const existing = this.store.state.platform.teams.find(t => t.id === team.id);
      if (existing) existing.teamName = team.teamName;
      else this.store.state.platform.teams.push(team);
      this.state.checkpoints[team.id] ??= definitions.map((cp, i) => ({ ...cp, status: i === 0 ? 'available' : 'locked' }));
    }
  }
  admin(context) {
    if (!context?.authenticated) throw new QuizError(401, 'UNAUTHENTICATED', 'Please sign in.');
    if (!['ADMIN', 'SUPER_ADMIN'].includes(context.role)) throw new QuizError(403, 'ADMIN_REQUIRED', 'Checkpoint administrator access is required.');
  }
  isTeamDisqualified(teamId) {
    const attempts = (this.store.state.attempts || []).filter(a => a.teamId === teamId);
    if (attempts.some(a => a.debarred || a.qualificationStatus === 'DEBARRED')) return true;
    const teamList = Array.isArray(this.state.teams) ? this.state.teams : Object.values(this.state.teams || {});
    const team = teamList.find(t => t.id === teamId || t.teamId === teamId);
    if (!team) return false;
    return Boolean(team.disqualified || team.isDisqualified || team.debarred || team.status === 'DISQUALIFIED' || team.qualificationStatus === 'DEBARRED' || team.qualificationStatus === 'DISQUALIFIED');
  }
  teams() {
    const teamList = (Array.isArray(this.state.teams) ? this.state.teams : Object.values(this.state.teams || {})).filter(team => team.id !== 'demo-participant-team' && team.teamName !== 'Demo Team' && !team.id?.startsWith('demo-'));
    const rosterList = this.store.state.registrationRoster || [];
    return teamList.map(team => {
      const cps = this.state.checkpoints[team.id] || [];
      const attempts = (this.store.state.attempts || []).filter(a => a.teamId === team.id);

      // ONLY finalized quiz attempts contribute to the permanent Global Robothon Leaderboard!
      const visible = attempts.filter(a => {
        const q = this.store.getQuiz(a.quizId);
        return q && !a.debarred && (q.status === 'FINALIZED' || (q.showLiveScores && ['LIVE', 'PAUSED', 'RESULTS'].includes(q.status)));
      });

      const checkpointPoints = cps.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.points, 0);
      const quizPoints = visible.reduce((sum, a) => sum + (a.score ?? 0), 0);
      const miniGamePoints = (this.state.bonuses || []).filter(b => b.teamId === team.id).reduce((sum, b) => sum + b.points, 0);

      const elimination = attempts.filter(a => {
        const q = this.store.getQuiz(a.quizId);
        return (q && (q.type === 'ELIMINATION' || q.id === 'quiz-1') && (q.status === 'FINALIZED' || q.status === 'RESULTS' || a.qualificationStatus === 'ELIMINATED' || a.qualificationStatus === 'QUALIFIED')) || a.qualificationStatus === 'ELIMINATED' || a.qualificationStatus === 'QUALIFIED';
      }).at(-1);

      const quiz1 = this.store.getQuiz('quiz-1') || this.store.getQuiz('elimination-2026');
      const teamLogins = this.store.state.teamLogins || {};
      const hasLoggedIn = Boolean(teamLogins[team.id] || team.hasLoggedIn || team.lastLoginAt);
      const quiz1Attempt = attempts.find(a => (a.quizId === 'quiz-1' || a.quizId === 'elimination-2026') && !a.debarred);
      const hasAttemptedQuiz1 = Boolean(quiz1Attempt && (quiz1Attempt.startedAt || (quiz1Attempt.status && quiz1Attempt.status !== 'NOT_ATTEMPTED')));

      const quiz1Finished = Boolean(quiz1 && ['RESULTS', 'ENDED', 'FINALIZED'].includes(quiz1.status));
      const neverLoggedInOrAttempted = !hasLoggedIn || !hasAttemptedQuiz1;

      let qualificationStatus = elimination ? (elimination.qualificationStatus || 'PENDING') : (team.qualificationStatus || 'PENDING');
      let isEliminated = qualificationStatus === 'ELIMINATED' || Boolean(team.isEliminated) || Boolean(team.eliminated);

      // If Quiz 1 finished/finalized and team never logged in OR never attempted Quiz 1:
      if ((quiz1Finished && neverLoggedInOrAttempted) || team.isEliminated || team.eliminated || team.qualificationStatus === 'ELIMINATED') {
        qualificationStatus = 'ELIMINATED';
        isEliminated = true;
      }

      const isDebarred = attempts.some(a => a.debarred || a.qualificationStatus === 'DEBARRED') || Boolean(team.debarred) || Boolean(team.disqualified) || qualificationStatus === 'DEBARRED';
      const isDisqualified = isDebarred || Boolean(team.disqualified) || Boolean(team.isDisqualified) || qualificationStatus === 'DISQUALIFIED' || qualificationStatus === 'DEBARRED';
      const isQualified = !isEliminated && (qualificationStatus === 'QUALIFIED' || Boolean(team.isQualified));
      const next = cps.find(c => c.status !== 'approved');

      const rosterEntry = rosterList.find(r => r.teamId === team.id);
      const leader = rosterEntry?.leader || team.leader || null;
      const members = rosterEntry?.members || team.members || [];
      const allMembers = rosterEntry?.allMembers || team.allMembers || (leader ? [leader, ...members] : members);

      return {
        ...team,
        checkpointPoints,
        quizPoints,
        miniGamePoints,
        totalPoints: checkpointPoints + quizPoints + miniGamePoints,
        currentCheckpoint: next ? ('Step ' + next.stepNumber + ': ' + next.title) : 'All Milestones Cleared!',
        qualificationStatus: isDisqualified ? 'DEBARRED' : qualificationStatus,
        isQualified: !isDisqualified && isQualified,
        isEliminated,
        isDebarred,
        isDisqualified,
        debarred: isDebarred,
        leader,
        members,
        allMembers
      };
    }).sort((a, b) => (b.totalPoints - a.totalPoints) || a.id.localeCompare(b.id)).map((t, i) => ({ ...t, rank: i + 1 }));
  }
  snapshot(context) {
    return {
      teams: this.teams(),
      checkpoints: context?.teamId ? (this.state.checkpoints[context.teamId] || []) : [],
      tickets: ['ADMIN', 'SUPER_ADMIN'].includes(context?.role) ? this.state.tickets : this.state.tickets.filter(t => t.teamId === context?.teamId),
      bonuses: context?.teamId ? (this.state.bonuses || []).filter(b => b.teamId === context.teamId) : (this.state.bonuses || [])
    };
  }
  request(context, checkpointId) {
    if (!context?.authenticated || !['TEAM_LEADER', 'TEAM_MEMBER'].includes(context.role) || !context.teamId) {
      throw new QuizError(403, 'TEAM_REQUIRED', 'A participant account is required.');
    }
    const cp = this.state.checkpoints[context.teamId]?.find(c => c.id === checkpointId);
    if (!cp) throw new QuizError(404, 'CHECKPOINT_NOT_FOUND', 'Checkpoint was not found.');
    if (cp.status !== 'available') throw new QuizError(409, 'CHECKPOINT_UNAVAILABLE', 'This checkpoint is locked, already submitted, or approved.');
    cp.status = 'pending_review';
    const id = `TKT-${randomUUID()}`;
    const ticket = {
      id,
      ticketId: id,
      teamId: context.teamId,
      teamName: context.teamName,
      checkpointId,
      checkpointTitle: `Step ${cp.stepNumber}: ${cp.title}`,
      requestedAt: new Date().toISOString(),
      assignedAdmin: null,
      assignedAdminId: null,
      status: 'pending',
      points: cp.points
    };
    this.state.tickets.unshift(ticket);
    this.store.save();
    return { ticket, updatedCheckpoint: cp };
  }
  ticket(context, id) {
    this.admin(context);
    const ticket = this.state.tickets.find(t => t.ticketId === id || t.id === id);
    if (!ticket) throw new QuizError(404, 'TICKET_NOT_FOUND', 'Review request was not found.');
    if (['approved', 'rejected'].includes(ticket.status)) throw new QuizError(409, 'TICKET_RESOLVED', 'This review has already been resolved.');
    if (ticket.assignedAdminId && ticket.assignedAdminId !== context.userId) throw new QuizError(409, 'TICKET_ASSIGNED', 'Another administrator is reviewing this checkpoint.');
    return ticket;
  }
  assign(context, id) {
    const ticket = this.ticket(context, id);
    Object.assign(ticket, { assignedAdminId: context.userId, assignedAdmin: context.name || context.userId, status: 'in_review' });
    this.store.save();
    return { ticket };
  }
  verify(context, id, approved) {
    if (typeof approved !== 'boolean') throw new QuizError(422, 'INVALID_DECISION', 'Choose approve or reject.');
    const ticket = this.ticket(context, id);
    Object.assign(ticket, { assignedAdminId: context.userId, assignedAdmin: context.name || context.userId, status: approved ? 'approved' : 'rejected', reviewedAt: new Date().toISOString() });
    if (approved && this.isTeamDisqualified(ticket.teamId)) {
      throw new QuizError(400, 'TEAM_DISQUALIFIED', 'Cannot award checkpoint points to a disqualified team.');
    }
    const cps = this.state.checkpoints[ticket.teamId];
    const index = cps.findIndex(c => c.id === ticket.checkpointId);
    cps[index].status = approved ? 'approved' : 'available';
    if (approved && cps[index + 1]?.status === 'locked') cps[index + 1].status = 'available';
    this.store.save();
    return { ticket, awardedPoints: approved ? ticket.points : 0 };
  }
  bonus(context, { teamId, gameName, points }) {
    this.admin(context);
    if (this.isTeamDisqualified(teamId)) {
      throw new QuizError(400, 'TEAM_DISQUALIFIED', 'Cannot allocate bonus points to a disqualified team.');
    }
    const teamList = Array.isArray(this.state.teams) ? this.state.teams : Object.values(this.state.teams || {});
    if (!teamList.some(t => t.id === teamId)) throw new QuizError(404, 'TEAM_NOT_FOUND', 'Team was not found.');
    if (!gameName?.trim() || !Number.isInteger(points) || points < 1 || points > 50) throw new QuizError(422, 'INVALID_BONUS', 'Enter an activity and 1–50 whole points.');
    this.state.bonuses.push({ id: randomUUID(), teamId, gameName: gameName.trim(), points, adminId: context.userId, awardedAt: new Date().toISOString() });
    this.store.save();
    const team = this.teams().find(t => t.id === teamId);
    return { team, newTotal: team.totalPoints };
  }
  deductPoints(context, { teamId, points, reason }) {
    this.admin(context);
    const teamList = Array.isArray(this.state.teams) ? this.state.teams : Object.values(this.state.teams || {});
    if (!teamList.some(t => t.id === teamId)) throw new QuizError(404, 'TEAM_NOT_FOUND', 'Team was not found.');
    const pts = Math.abs(Number(points));
    if (!Number.isInteger(pts) || pts <= 0) throw new QuizError(422, 'INVALID_POINTS', 'Enter a valid positive number of points to deduct.');
    const deductReason = (reason || '').trim();
    const entry = {
      id: randomUUID(),
      teamId,
      gameName: deductReason ? `Point Adjustment: ${deductReason}` : 'Score Adjustment (Deduction)',
      points: -pts,
      reason: deductReason || 'Score Adjustment',
      adminId: context.userId,
      awardedAt: new Date().toISOString()
    };
    this.state.bonuses = this.state.bonuses || [];
    this.state.bonuses.push(entry);
    this.store.save();
    const team = this.teams().find(t => t.id === teamId);
    return { success: true, team, entry, newTotal: team.totalPoints };
  }
  removeMark(context, { teamId, markId, type }) {
    this.admin(context);
    const teamList = Array.isArray(this.state.teams) ? this.state.teams : Object.values(this.state.teams || {});
    if (!teamList.some(t => t.id === teamId)) throw new QuizError(404, 'TEAM_NOT_FOUND', 'Team was not found.');

    // 1. Check if it's a bonus/adjustment entry
    this.state.bonuses = this.state.bonuses || [];
    const cleanMarkId = String(markId).replace(/^bonus-/, '');
    const bonusIndex = this.state.bonuses.findIndex(b => (b.id === cleanMarkId || b.id === markId) && b.teamId === teamId);
    if (bonusIndex !== -1) {
      const removed = this.state.bonuses.splice(bonusIndex, 1)[0];
      this.store.save();
      const team = this.teams().find(t => t.id === teamId);
      return { success: true, removed, team, newTotal: team.totalPoints };
    }

    // 2. Check if it's a checkpoint mark
    const cleanCpId = String(markId).replace(/^cp-/, '');
    const cps = this.state.checkpoints[teamId] || [];
    let cp = cps.find(c => c.id === cleanCpId || c.id === markId);
    let matchedTicket = null;
    if (Array.isArray(this.state.tickets)) {
      matchedTicket = this.state.tickets.find(t => t.teamId === teamId && (t.id === markId || t.id === cleanCpId || t.checkpointId === cleanCpId || t.checkpointId === markId));
      if (!cp && matchedTicket) {
        cp = cps.find(c => c.id === matchedTicket.checkpointId);
      }
    }
    if (cp && cp.status === 'approved') {
      cp.status = 'available';
      if (matchedTicket) {
        matchedTicket.status = 'rejected';
      }
      this.store.save();
      const team = this.teams().find(t => t.id === teamId);
      return { success: true, removed: cp, team, newTotal: team.totalPoints };
    }

    throw new QuizError(404, 'MARK_NOT_FOUND', 'Mark not found in activity log for this team.');
  }
}
