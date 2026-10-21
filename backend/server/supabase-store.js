import { QuizStore, createInitialState } from './quiz-store.js';
import { QuizError } from './quiz-service.js';
import { databaseError } from './supabase.js';

// The existing quiz engine operates on a competition snapshot. PostgreSQL atomically
// commits it with a revision check, so two API instances cannot overwrite each other.
export class SupabaseQuizStore extends QuizStore {
  constructor(client) { super(); this.client = client; this.revision = null; this.baseline = ''; this.accounts = []; }
  async load() {
    const { error } = await this.client.rpc('initialize_competition', { initial_state: createInitialState() });
    if (error) throw databaseError(error);
    await this.loadLatest();
    return this;
  }
  async loadLatest() {
    const [result, teams] = await Promise.all([
      this.client.from('competition_state').select('state,revision').eq('id', 'main').single(),
      this.client.from('teams').select('id,team_name'),
    ]);
    if (result.error || teams.error) throw databaseError(result.error || teams.error);
    this.state = result.data.state;
    this.revision = result.data.revision;
    this.baseline = JSON.stringify(this.state);
    this.accounts = teams.data.map(t => ({ teamId: t.id, teamName: t.team_name }));
  }
  // Service calls stage changes; the HTTP boundary awaits one durable commit before responding.
  save() { return Promise.resolve(); }
  async fork() {
    const requestStore = new SupabaseQuizStore(this.client);
    await requestStore.loadLatest();
    return requestStore;
  }
  async commit() {
    const snapshot = JSON.stringify(this.state);
    if (snapshot === this.baseline) return;
    const { data, error } = await this.client.rpc('commit_competition', { expected_revision: this.revision, next_state: this.state });
    if (error) {
      if (error.code === '40001') throw new QuizError(409, 'CONCURRENT_UPDATE', 'Another event update completed first. Please retry your action.');
      throw databaseError(error);
    }
    this.revision = data;
    this.baseline = snapshot;
  }
}
