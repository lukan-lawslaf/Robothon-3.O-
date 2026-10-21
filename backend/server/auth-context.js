import { QuizError } from './quiz-service.js';
// Only server-verified identity is accepted. Client role headers never grant access.
export function resolveAuthContext(req) {
  if (req.quizAuthContext?.authenticated) return req.quizAuthContext;
  throw new QuizError(401, 'AUTH_CONTEXT_REQUIRED', 'An authenticated session or trusted host context is required.');
}
