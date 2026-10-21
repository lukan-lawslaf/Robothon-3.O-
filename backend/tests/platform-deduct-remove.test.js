import test from "node:test";
import assert from "node:assert/strict";
import { PlatformService } from "../server/platform-service.js";

const makeStore = () => ({
  state: {
    registrationRoster: [
      {
        teamId: "team-test-1",
        teamName: "Test Titans",
        leader: { name: "Leader Luke", email: "luke@example.com" },
        members: [{ name: "Member Mara", email: "mara@example.com" }],
        allMembers: [
          { name: "Leader Luke", email: "luke@example.com" },
          { name: "Member Mara", email: "mara@example.com" }
        ]
      }
    ],
    attempts: [],
    platform: {
      teams: [{ id: "team-test-1", teamName: "Test Titans" }],
      checkpoints: { "team-test-1": [] },
      tickets: [],
      bonuses: []
    }
  },
  getQuiz: () => null,
  save: () => {}
});

const admin = { authenticated: true, userId: "admin-1", role: "ADMIN" };

test("PlatformService: deductPoints records negative entry and deducts points", () => {
  const store = makeStore();
  const service = new PlatformService(store);

  // Add bonus 20
  service.bonus(admin, { teamId: "team-test-1", gameName: "Hydro Ping Pong", points: 20 });
  let teams = service.teams();
  assert.equal(teams[0].totalPoints, 20);

  // Deduct 5 points with reason
  const res = service.deductPoints(admin, { teamId: "team-test-1", points: 5, reason: "Rule infraction" });
  assert.equal(res.newTotal, 15);
  assert.equal(res.entry.points, -5);
  assert.ok(res.entry.gameName.includes("Rule infraction"));

  teams = service.teams();
  assert.equal(teams[0].totalPoints, 15);
  assert.equal(teams[0].leader.name, "Leader Luke");
  assert.equal(teams[0].members[0].name, "Member Mara");
});

test("PlatformService: removeMark successfully removes bonus or checkpoint", () => {
  const store = makeStore();
  const service = new PlatformService(store);

  service.bonus(admin, { teamId: "team-test-1", gameName: "Mini Game 1", points: 15 });
  const bonusId = service.state.bonuses[0].id;
  assert.equal(service.teams()[0].totalPoints, 15);

  // Remove the bonus mark
  const removeRes = service.removeMark(admin, { teamId: "team-test-1", markId: bonusId });
  assert.equal(removeRes.success, true);
  assert.equal(removeRes.newTotal, 0);
  assert.equal(service.state.bonuses.length, 0);
});
