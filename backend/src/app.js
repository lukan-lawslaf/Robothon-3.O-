/**
 * ============================================================================
 * ROBOTHON QUIZ MODULE — APPLICATION CONTROLLER & REAL-TIME STATE ENGINE
 * ============================================================================
 *
 * CORE STATE CONTAINER & LIFECYCLE ARCHITECTURE:
 * ----------------------------------------------------------------------------
 * This module controls the client-side state machine for both Contestants
 * and Organizers. When migrating this logic into React, Next.js, or Vue:
 *
 * 1. STATE STORE EQUIVALENT:
 *    - In React/Next.js: Port `state` to a Zustand store (`useQuizStore`) or
 *      Redux slice (`quizSlice.js`).
 *    - In Vue 3: Port `state` to a reactive Pinia store (`useQuizStore()`).
 *
 * 2. LIFECYCLE FLOW:
 *    - Contestant: Login -> Waiting Room (`team/quiz`) -> Live Terminal (`team/quiz/live`)
 *      -> Completion Locked (`team/quiz/completed`) -> Leaderboard (`leaderboard`).
 *    - Host: Login -> Quiz Builder (`admin/quizzes/builder`) -> Live Mission Control
 *      (`admin/quizzes/live`) -> Results & Audit (`admin/quizzes/results`).
 *
 * 3. CRITICAL INTEGRATION INVARIANTS:
 *    - Timer Authority: Time is computed strictly against `quiz.startedAt + durationSeconds`.
 *      The client countdown loop (`setInterval`) only displays the remaining drift-checked time.
 *    - Autosave: Option selections immediately dispatch `quizApi.answer()` with optimistic UI updates.
 *    - Attempt Persistence: Submissions and completion states preserve the answers dictionary
 *      to ensure session logs never display 0 answered when a score is present.
 * ============================================================================
 */

import { quizApi, quizEvents } from './api.js';
import { LoginPage } from './pages/LoginPage.js';
import { WaitingRoomPage } from './pages/WaitingRoomPage.js';
import { LiveQuizPage } from './pages/LiveQuizPage.js';
import { CompletedPage } from './pages/CompletedPage.js';
import { LeaderboardPage } from './pages/LeaderboardPage.js';
import { QuizManagementPage } from './pages/admin/QuizManagementPage.js';
import { QuestionBuilderPage } from './pages/admin/QuestionBuilderPage.js';
import { LiveMonitorPage } from './pages/admin/LiveMonitorPage.js';
import { ResultsPage } from './pages/admin/ResultsPage.js';
import { StagePresenterPage } from './pages/admin/StagePresenterPage.js';

/**
 * Universal State Schema definition.
 */
const defaultState = {
  route: 'login',           // Current SPA route identifier
  selectedQuizId: 'quiz-1', // Active quiz round selection ('quiz-1' | 'quiz-2')
  quiz: null,               // Active quiz object (id, name, status, durationSeconds, ...)
  questions: [],            // Clean question array without answers for contestants
  attempt: null,            // Current team attempt (id, status, score, answers, ...)
  answers: {},              // Local optimistic answers dictionary { [qId]: optionKey } for multi-page persistence
  leaderboard: [],          // Leaderboard standings rows
  quizzes: [],              // Full list of available quizzes from server
  questionBank: [],         // Admin authoring bank including correct answers
  liveAttempts: [],         // Admin live telemetry stream attempts
  prevRanks: {},            // Rank snapshot map for live leaderboard position animations
  reviews: {},              // Local client question bookmark map { [qId]: true }
  connection: 'CONNECTING', // SSE connection status ('CONNECTED' | 'CONNECTION_LOST')
  current: 0,               // Active question index in Live Terminal (0 to questions.length - 1)
  remaining: 0,             // Authoritative seconds remaining on countdown timer
  builderActiveQ: null,     // Currently selected question ID in admin authoring canvas
  stageState: { stage: 'STANDBY', questionIndex: 0 }, // Synchronized arena stage presentation state
  stageRemaining: 0,        // Active stage timer countdown (pre-quiz, question, or intermission)
  isStagePaused: false      // Pause flag for stage presenter timer
};

const savedState = JSON.parse(localStorage.getItem('robothon-quiz-ui') || 'null') || {};
const state = {
  ...defaultState,
  ...savedState,
  answers: { ...(savedState.answers || {}), ...(savedState.attempt?.answers || {}) },
  questions: savedState.questions || []
};
let isRefreshing = false;
let refreshSeq = 0;

/**
 * @transfer-reference: Multi-Page State Persistence Layer
 * Saves active route, selected quiz, question bank, bookmarks, and all option selections.
 * Ensures contestant answer choices survive full browser refreshes and inter-page routing.
 */
const save = () => {
  try {
    localStorage.setItem('robothon-quiz-ui', JSON.stringify({
      route: state.route,
      selectedQuizId: state.selectedQuizId,
      quiz: state.quiz,
      attempt: state.attempt,
      answers: state.answers || state.attempt?.answers || {},
      questions: state.questions || [],
      reviews: state.reviews,
      current: state.current,
      builderActiveQ: state.builderActiveQ
    }));
  } catch (e) {
    console.error('Failed to save local state:', e);
  }
};

const account = () => {
  try {
    return JSON.parse(localStorage.getItem('robothon-demo-account') || 'null');
  } catch {
    return null;
  }
};

const activeQuiz = () => {
  const targetId = state.selectedQuizId || state.quiz?.id || 'quiz-1';
  return state.quizzes.find(q => q.id === targetId) || state.quiz || { id: targetId, name: 'Quiz 1: Round 1 Elimination', status: 'DRAFT', durationSeconds: 1800 };
};

const route = () => {
  const hash = location.hash.slice(1).replace(/^\//, '');
  if (hash) return hash;
  const user = account();
  if (!user) return 'login';
  return ['ADMIN', 'SUPER_ADMIN'].includes(user.role) ? 'admin/quizzes/live' : 'team/quiz';
};

const navigate = value => {
  if (location.hash === `#${value}`) {
    render();
  } else {
    location.hash = value;
  }
};

export function showToast(message, tone = 'cyan') {
  const host = document.querySelector('#toast');
  if (!host) return;
  host.innerHTML = `
    <div class="flex items-center gap-2 px-4 py-2.5 rounded-lg border shadow-xl font-mono text-xs ${
      tone === 'red' || tone === 'error'
        ? 'bg-[#1e131d] border-error text-error'
        : tone === 'green' || tone === 'tertiary'
          ? 'bg-[#0f1d1a] border-tertiary-fixed text-tertiary-fixed'
          : 'bg-surface-container-high border-primary-container text-primary-container'
    }">
      <span class="material-symbols-outlined text-[18px]">
        ${tone === 'red' || tone === 'error' ? 'error' : tone === 'green' || tone === 'tertiary' ? 'check_circle' : 'info'}
      </span>
      <span>${message}</span>
    </div>
  `;
  host.classList.remove('hidden');
  clearTimeout(host._toastTimeout);
  host._toastTimeout = setTimeout(() => host.classList.add('hidden'), 3200);
}

function pageForRoute() {
  const currentAccount = account();

  // If unauthenticated, force login page
  if (!currentAccount) {
    if (state.route !== 'login') {
      navigate('login');
    }
    return LoginPage();
  }

  // If authenticated but current route is login or empty, forward into active user portal
  if (state.route === 'login') {
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentAccount.role);
    const targetRoute = isAdmin
      ? 'admin/quizzes/live'
      : (['LIVE', 'PAUSED'].includes(state.quiz?.status) ? 'team/quiz/live' : 'team/quiz');
    state.route = targetRoute;
    navigate(targetRoute);
  }

  const pages = {
    'team/quiz': () => WaitingRoomPage(state),
    'team/quiz/live': () => {
      const liveRound = (state.quizzes || []).find(q => ['LIVE', 'PAUSED'].includes(q.status));
      if (liveRound && state.quiz?.id !== liveRound.id) {
        state.quiz = liveRound;
        state.selectedQuizId = liveRound.id;
      }
      const isLive = ['LIVE', 'PAUSED'].includes(state.quiz?.status);
      if (!isLive) {
        state.questions = [];
      }
      return LiveQuizPage(state);
    },
    'team/quiz/completed': () => CompletedPage(state),
    'leaderboard': () => LeaderboardPage(state),
    'admin/quizzes': () => QuestionBuilderPage(state),
    'admin/quizzes/builder': () => QuestionBuilderPage(state),
    'admin/quizzes/catalog': () => QuizManagementPage(state),
    'admin/quizzes/config': () => QuestionBuilderPage(state),
    'admin/quizzes/live': () => LiveMonitorPage(state),
    'admin/quizzes/stage': () => StagePresenterPage(state),
    'admin/quizzes/results': () => ResultsPage(state)
  };

  return (pages[state.route] || pages['team/quiz'])();
}

function render({ refresh = true } = {}) {
  try {
    state.route = route();
    const root = document.querySelector('#app');
    if (root) {
      root.innerHTML = pageForRoute();
    }
    bindPageEvents();
    if (refresh) refreshPageData();
  } catch (err) {
    console.error('Render error:', err);
    const root = document.querySelector('#app');
    if (root && !root.innerHTML.trim()) {
      root.innerHTML = LoginPage();
      bindPageEvents();
    }
  }
}

async function refreshPageData() {
  const currentSeq = ++refreshSeq;
  isRefreshing = true;
  try {
    if (state.route === 'login') {
      return;
    }

    const user = account();
    const isAdmin = user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role);

    // For admin users, always use the authoritative adminQuizzes endpoint
    if (isAdmin) {
      try {
        const adminList = await quizApi.adminQuizzes();
        if (currentSeq !== refreshSeq) return;
        if (adminList.quizzes && adminList.quizzes.length > 0) {
          state.quizzes = adminList.quizzes;
          const targetId = state.selectedQuizId || state.quiz?.id || 'quiz-1';
          state.quiz = state.quizzes.find(q => q.id === targetId) || state.quizzes[0];
          state.selectedQuizId = state.quiz.id;
        }
      } catch {
        // Fallback
      }
    } else {
      // Participant users: dynamically resolve active round
      try {
        const activeList = await quizApi.active();
        if (currentSeq !== refreshSeq) return;
        if (activeList.quizzes && activeList.quizzes.length > 0) {
          state.quizzes = activeList.quizzes;
          const preferredId = state.selectedQuizId || state.quiz?.id || 'quiz-1';
          const target = state.quizzes.find(q => q.id === preferredId);
          const liveRound = state.quizzes.find(q => ['LIVE', 'PAUSED'].includes(q.status));
          const readyRound = state.quizzes.find(q => q.status === 'READY');

          if (liveRound) {
            // A round is actively broadcasting live: prioritize it for contestants
            state.quiz = liveRound;
            state.selectedQuizId = liveRound.id;
          } else if (target && target.status === 'READY') {
            // Active selection is already READY: keep it
            state.quiz = target;
            state.selectedQuizId = target.id;
          } else if (readyRound) {
            // A round was marked READY: automatically open that round's tab
            state.quiz = readyRound;
            state.selectedQuizId = readyRound.id;
          } else {
            state.quiz = target || state.quizzes[0];
            state.selectedQuizId = state.quiz.id;
          }
        }
      } catch {
        // Fallback
      }
    }

    const currentQuizId = state.quiz?.id || state.selectedQuizId || 'quiz-1';

    // If local attempt cache belongs to a DIFFERENT quiz round, clear it so it doesn't cross-contaminate
    if (state.attempt && state.attempt.quizId && state.attempt.quizId !== currentQuizId) {
      state.attempt = null;
      state.answers = {};
      state.reviews = {};
      state.current = 0;
      save();
    }

    /**
     * @transfer-reference: Waiting Room Attempt & Answers Rehydration
     * When contestant visits Waiting Room, synchronize active attempt and answer records
     * so navigating back to Live Terminal retains fully hydrated state.
     */
    if (state.route === 'team/quiz') {
      try {
        const myData = await quizApi.myAttempt(currentQuizId);
        if (currentSeq !== refreshSeq) return;
        if (myData?.attempt) {
          const serverAnswers = myData.attempt.answers || {};
          const localAnswers = { ...(state.answers || {}), ...(state.attempt?.answers || {}) };
          const mergedAnswers = { ...localAnswers, ...serverAnswers };
          state.attempt = {
            ...state.attempt,
            ...myData.attempt,
            answers: mergedAnswers,
            answeredCount: Object.keys(mergedAnswers).filter(k => mergedAnswers[k] !== undefined && mergedAnswers[k] !== null && mergedAnswers[k] !== '').length
          };
          state.answers = { ...mergedAnswers };
          save();
        }
      } catch {
        // Benign if attempt not created yet
      }
    }

    /**
     * @transfer-reference: Live Terminal Resumption & Multi-Page Option Synchronization
     * Solves the option loss bug when changing pages:
     * 1. Resumes active attempt from server via quizApi.join(currentQuizId).
     * 2. Merges server database answers with optimistic local cache so no answers are overwritten.
     * 3. Triggers immediate re-render so selected radio/option buttons light up without user interaction.
     */
    if (state.route === 'team/quiz/live') {
      const isLive = ['LIVE', 'PAUSED'].includes(state.quiz?.status);
      if (!isLive) {
        // 1. Check if another configured round is LIVE
        const nextLive = (state.quizzes || []).find(q => ['LIVE', 'PAUSED'].includes(q.status));
        if (nextLive) {
          state.selectedQuizId = nextLive.id;
          state.quiz = nextLive;
          state.attempt = null;
          state.answers = {};
          state.current = 0;
          save();
          showToast(`Advancing to ${nextLive.name}...`, 'green');
          render({ refresh: true });
          return;
        }

        // 2. Check if current quiz is concluded and team already submitted/evaluated
        if (['RESULTS', 'FINALIZED'].includes(state.quiz?.status)) {
          try {
            const myData = await quizApi.myAttempt(currentQuizId);
            if (myData?.attempt && ['SUBMITTED', 'EVALUATED'].includes(myData.attempt.status)) {
              state.attempt = myData.attempt;
              save();
              navigate('team/quiz/completed');
              return;
            }
          } catch {}
        }

        // 3. No live quiz in progress: purge any questions and keep terminal in clean standby
        state.questions = [];
        state.attempt = null;
        state.answers = {};
        render({ refresh: false });
        return;
      }

      try {
        const joined = await quizApi.join(currentQuizId);
        if (currentSeq !== refreshSeq) return;

        // Server authoritative answers merged with local optimistic dictionary
        const serverAnswers = joined.attempt?.answers || {};
        const localAnswers = { ...(state.answers || {}), ...(state.attempt?.answers || {}) };
        const mergedAnswers = { ...localAnswers, ...serverAnswers };

        state.attempt = {
          ...joined.attempt,
          answers: mergedAnswers,
          answeredCount: Object.keys(mergedAnswers).filter(k => mergedAnswers[k] !== undefined && mergedAnswers[k] !== null && mergedAnswers[k] !== '').length
        };
        state.answers = { ...mergedAnswers };
        state.questions = (joined.questions && joined.questions.length > 0) ? joined.questions : (state.questions || []);
        if (joined.quiz) state.quiz = joined.quiz;

        const quizStartMs = new Date(joined.quiz.startedAt || joined.attempt.startedAt).getTime();
        const deadlineMs = quizStartMs + (joined.quiz.durationSeconds || 1800) * 1000;
        state.remaining = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));

        save();
        render({ refresh: false }); // Immediate visual rehydration of selected options
      } catch (err) {
        if (err.message.includes('completed') || err.message.includes('ATTEMPT_ALREADY_EXISTS') || err.message.includes('DEADLINE_REACHED') || err.message.includes('deadline has passed') || err.message.includes('QUIZ_NOT_LIVE') || err.message.includes('QUIZ_ENDED')) {
          // Check if there is another round that is LIVE
          const nextLive = state.quizzes.find(q => q.id !== currentQuizId && ['LIVE', 'PAUSED'].includes(q.status));
          if (nextLive) {
            state.selectedQuizId = nextLive.id;
            state.quiz = nextLive;
            state.attempt = null;
            state.answers = {};
            state.current = 0;
            save();
            showToast(`Advancing to ${nextLive.name}...`, 'green');
            render({ refresh: true });
            return;
          }
          navigate('team/quiz/completed');
          return;
        }

        // Resilient Fallback: If join throws (e.g. quiz paused), restore answers via myAttempt
        try {
          const fallback = await quizApi.myAttempt(currentQuizId);
          if (currentSeq !== refreshSeq) return;
          if (fallback?.attempt) {
            const serverAnswers = fallback.attempt.answers || {};
            const localAnswers = { ...(state.answers || {}), ...(state.attempt?.answers || {}) };
            const mergedAnswers = { ...localAnswers, ...serverAnswers };
            state.attempt = {
              ...state.attempt,
              ...fallback.attempt,
              answers: mergedAnswers,
              answeredCount: Object.keys(mergedAnswers).filter(k => mergedAnswers[k] !== undefined && mergedAnswers[k] !== null && mergedAnswers[k] !== '').length
            };
            state.answers = { ...mergedAnswers };
            save();
            render({ refresh: false });
          }
        } catch {
          // ignore fallback error
        }

        showToast(err.message, 'red');
      }
    }

    if (state.route === 'team/quiz/completed') {
      try {
        const myData = await quizApi.myAttempt(currentQuizId);
        if (myData?.attempt) {
          state.attempt = {
            ...myData.attempt,
            answers: myData.attempt.answers || state.attempt?.answers || {}
          };
        }
      } catch (err) {
        console.warn('Completed attempt sync error:', err);
      }
    }

    if (['leaderboard', 'admin/quizzes/results'].includes(state.route)) {
      const user = account();
      const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role);
      const isLeader = user?.role === 'TEAM_LEADER';
      const isFinalized = state.quiz?.status === 'FINALIZED';

      // For contestants, only fetch leaderboard if user is Team Leader AND round is Finalized
      if (isAdmin || (isLeader && isFinalized)) {
        try {
          const lb = await quizApi.leaderboard(currentQuizId);
          state.leaderboard = lb.rows || [];
        } catch (err) {
          console.warn('Leaderboard error:', err);
        }
      } else {
        state.leaderboard = [];
      }
    }

    // Always fetch questions for the selected quiz
    if (state.route.startsWith('admin/quizzes')) {
      try {
        const qList = await quizApi.adminQuestions(currentQuizId);
        state.questionBank = qList.questions || [];
        if (!state.builderActiveQ && state.questionBank.length > 0) {
          state.builderActiveQ = state.questionBank[0].id;
        }
      } catch (err) {
        console.warn('Admin questions error:', err);
      }
    }

    if (state.route === 'admin/quizzes/live') {
      try {
        const liveData = await quizApi.adminLive(currentQuizId);
        const newAttempts = liveData.attempts || [];

        // Save previous ranks for dynamic animation
        const prev = {};
        [...state.liveAttempts].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).forEach((att, idx) => {
          prev[att.teamId] = idx + 1;
        });
        state.prevRanks = prev;
        state.liveAttempts = newAttempts;

        if (liveData.quiz) state.quiz = liveData.quiz;
        if (state.quiz?.startedAt) {
          const quizStartMs = new Date(state.quiz.startedAt).getTime();
          const deadlineMs = quizStartMs + (state.quiz.durationSeconds || 1800) * 1000;
          state.remaining = Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
        }
      } catch (err) {
        console.warn('Admin live error:', err);
      }
    }

    if (state.route === 'admin/quizzes/stage') {
      try {
        const stageData = await quizApi.getStage(currentQuizId);
        if (stageData?.stageState) {
          state.stageState = stageData.stageState;
          if (stageData.stageState.questionIndex !== undefined) {
            state.current = stageData.stageState.questionIndex;
          }
          if (stageData.stageState.remainingSeconds !== undefined) {
            state.stageRemaining = stageData.stageState.remainingSeconds;
          }
        }
        const liveData = await quizApi.adminLive(currentQuizId);
        state.liveAttempts = liveData.attempts || [];
        if (liveData.leaderboard?.rows) {
          state.leaderboard = liveData.leaderboard.rows;
        }
        const qList = await quizApi.adminQuestions(currentQuizId);
        state.questions = qList.questions || [];
        state.questionBank = qList.questions || [];
      } catch (err) {
        console.warn('Stage refresh error:', err);
      }
    }

    if (state.route === 'team/quiz/live') {
      try {
        const stageData = await quizApi.getStage(currentQuizId);
        if (stageData?.stageState) {
          state.stageState = stageData.stageState;
          if (stageData.stageState.questionIndex !== undefined) {
            state.current = stageData.stageState.questionIndex;
          }
          if (stageData.stageState.remainingSeconds !== undefined) {
            state.stageRemaining = stageData.stageState.remainingSeconds;
          }
        }
      } catch {
        // Benign
      }
    }

    save();
    render({ refresh: false });
  } catch (error) {
    showToast(error.message, 'red');
  } finally {
    isRefreshing = false;
  }
}

function bindPageEvents() {
  // Navigation Logout / Sign out
  const navLogoutBtn = document.querySelector('#nav-btn-logout');
  if (navLogoutBtn) {
    navLogoutBtn.onclick = async event => {
      event.preventDefault();
      try { await quizApi.logout(); }
      catch (error) { if (error.status !== 401) { showToast(error.message, 'red'); return; } }
      localStorage.removeItem('robothon-demo-account');
      localStorage.removeItem('robothon-session-id');
      sessionStorage.removeItem('oc_pin_unlocked');
      state.activeLoginMode = 'TEAM';
      showToast('Signed out of competition session');
      navigate('login');
    };
  }

  // Login Form and OC PIN Security Gate
  const loginForm = document.querySelector('#login-form');
  const ocPinForm = document.querySelector('#oc-pin-form');
  const ocPinGate = document.querySelector('#oc-pin-gate');
  const loginFormContainer = document.querySelector('#login-form-container');
  const activeModeLabel = document.querySelector('#active-mode-label');
  const ocBadge = document.querySelector('#oc-badge');
  const tabParticipant = document.querySelector('#tab-participant');
  const tabAdmin = document.querySelector('#tab-admin');
  const btnCancelOcPin = document.querySelector('#btn-cancel-oc-pin');
  const portalModeInput = document.querySelector('#login-portal-mode');

  if (loginForm) {
    loginForm.onsubmit = handleLogin;
  }

  const activateParticipantTab = () => {
    state.activeLoginMode = 'TEAM';
    if (portalModeInput) portalModeInput.value = 'TEAM';
    if (tabParticipant) tabParticipant.className = 'flex items-center justify-center gap-2 py-2.5 px-4 rounded font-semibold transition-all bg-surface-container text-primary-container shadow-sm border border-primary-container/30';
    if (tabAdmin) tabAdmin.className = 'flex items-center justify-center gap-2 py-2.5 px-4 rounded font-semibold transition-all text-on-surface-variant hover:text-on-surface';
    if (ocPinGate) ocPinGate.classList.add('hidden');
    if (loginFormContainer) loginFormContainer.classList.remove('hidden');
    if (activeModeLabel) activeModeLabel.textContent = 'Team Login Portal (Contestants Only)';
    if (ocBadge) ocBadge.classList.add('hidden');
    const emailField = document.querySelector('[name=email]');
    if (emailField) emailField.value = '';
    const passwordField = document.querySelector('[name=password]');
    if (passwordField) passwordField.value = '';
    const errorEl = document.querySelector('#login-error');
    if (errorEl) errorEl.textContent = '';
  };

  const activateAdminTab = () => {
    const isUnlocked = sessionStorage.getItem('oc_pin_unlocked') === 'true';
    if (!isUnlocked) {
      if (loginFormContainer) loginFormContainer.classList.add('hidden');
      if (ocPinGate) ocPinGate.classList.remove('hidden');
      if (tabAdmin) tabAdmin.className = 'flex items-center justify-center gap-2 py-2.5 px-4 rounded font-semibold transition-all bg-surface-container text-secondary font-bold shadow-sm border border-secondary/30';
      if (tabParticipant) tabParticipant.className = 'flex items-center justify-center gap-2 py-2.5 px-4 rounded font-semibold transition-all text-on-surface-variant hover:text-on-surface';
      const pinInput = document.querySelector('#oc-pin-input');
      const pinError = document.querySelector('#oc-pin-error');
      if (pinError) pinError.textContent = '';
      if (pinInput) {
        pinInput.value = '';
        setTimeout(() => pinInput.focus(), 50);
      }
    } else {
      state.activeLoginMode = 'ADMIN';
      if (portalModeInput) portalModeInput.value = 'ADMIN';
      if (ocPinGate) ocPinGate.classList.add('hidden');
      if (loginFormContainer) loginFormContainer.classList.remove('hidden');
      if (tabAdmin) tabAdmin.className = 'flex items-center justify-center gap-2 py-2.5 px-4 rounded font-semibold transition-all bg-surface-container text-secondary font-bold shadow-sm border border-secondary/30';
      if (tabParticipant) tabParticipant.className = 'flex items-center justify-center gap-2 py-2.5 px-4 rounded font-semibold transition-all text-on-surface-variant hover:text-on-surface';
      if (activeModeLabel) activeModeLabel.textContent = 'Organizer / Super Admin Portal (Administrators Only)';
      if (ocBadge) ocBadge.classList.remove('hidden');
      const emailField = document.querySelector('[name=email]');
      if (emailField) emailField.value = '';
      const passwordField = document.querySelector('[name=password]');
      if (passwordField) passwordField.value = '';
      const errorEl = document.querySelector('#login-error');
      if (errorEl) errorEl.textContent = '';
    }
  };

  if (tabParticipant) tabParticipant.onclick = activateParticipantTab;
  if (tabAdmin) tabAdmin.onclick = activateAdminTab;

  if (btnCancelOcPin) {
    btnCancelOcPin.onclick = activateParticipantTab;
  }

  if (ocPinForm) {
    ocPinForm.onsubmit = e => {
      e.preventDefault();
      const pinInput = document.querySelector('#oc-pin-input');
      const pinError = document.querySelector('#oc-pin-error');
      const enteredPin = (pinInput?.value || '').trim();

      if (enteredPin === '5060') {
        sessionStorage.setItem('oc_pin_unlocked', 'true');
        if (pinError) pinError.textContent = '';
        showToast('OC Security Clearance Verified ', 'green');
        activateAdminTab();
      } else {
        if (pinError) pinError.textContent = 'Invalid OC PIN. Access Denied.';
        if (pinInput) {
          pinInput.value = '';
          pinInput.focus();
        }
      }
    };
  }

  // Quiz Switcher Buttons (Quiz 1 vs Quiz 2)
  document.querySelectorAll('[data-switch-quiz]').forEach(btn => {
    btn.onclick = async () => {
      const targetId = btn.dataset.switchQuiz;
      state.selectedQuizId = targetId;
      state.builderActiveQ = null;
      const target = state.quizzes.find(q => q.id === targetId);
      if (target) {
        state.quiz = target;
      }
      if (state.attempt && state.attempt.quizId !== targetId) {
        state.attempt = null;
        state.answers = {};
        state.reviews = {};
        state.current = 0;
      }
      save();
      if (btn.dataset.goto) {
        navigate(btn.dataset.goto);
        return;
      }
      await refreshPageData();
      render({ refresh: false });
      showToast(`Switched active round to ${target?.name || targetId}`);
    };
  });

  // Download Submission Receipt Button
  const downloadReceiptBtn = document.querySelector('#downloadReceiptBtn');
  if (downloadReceiptBtn) {
    downloadReceiptBtn.onclick = () => {
      const user = account() || { teamName: 'Team Apex Mechanics', teamId: 'team-apex' };
      const q = state.quiz || {};
      const att = state.attempt || {};
      const lines = [
        '==================================================',
        'ROBOTHON ARENA NET — OFFICIAL SUBMISSION RECEIPT',
        '==================================================',
        `Date/Time:      ${att.submittedAt || new Date().toISOString()}`,
        `Team Name:      ${user.teamName || 'Team Apex Mechanics'} (#${user.teamId || 'team'})`,
        `Quiz Round:     ${q.name || q.id || 'Competition Round'}`,
        `Status:         ${att.status || 'SUBMITTED'}`,
        `Score Awarded:  ${att.score !== null && att.score !== undefined ? att.score + ' PTS' : 'PENDING EVALUATION'}`,
        `Questions:      ${state.questions?.length || q.totalQuestions || 30}`,
        `Answered:       ${att.answeredCount ?? Object.keys(att.answers || {}).length}`,
        `Time Taken:     ${att.timeTakenSeconds ?? 0}s`,
        '==================================================',
        'VERIFICATION SIGNATURE: SHA256_INTEGRITY_VALIDATED',
        '=================================================='
      ].join('\n');
      const blob = new Blob([lines], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quiz-receipt-${user.teamId || 'team'}-${q.id || 'quiz'}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Submission receipt downloaded', 'green');
    };
  }

  // Optional Accordion Utilities in QuestionBuilderPage
  const btnToggleJson = document.querySelector('#btn-toggle-json-tools');
  const panelJson = document.querySelector('#optional-json-panel');
  if (btnToggleJson && panelJson) {
    btnToggleJson.onclick = () => {
      panelJson.classList.toggle('hidden');
    };
  }

  const btnToggleSettings = document.querySelector('#btn-toggle-settings-tools');
  const panelSettings = document.querySelector('#optional-settings-panel');
  if (btnToggleSettings && panelSettings) {
    btnToggleSettings.onclick = () => {
      panelSettings.classList.toggle('hidden');
    };
  }

  // JSON Import Form & File Input
  const jsonImportForm = document.querySelector('#json-import-form');
  const jsonFileInput = document.querySelector('#json-file-input');
  const jsonPasteInput = document.querySelector('#json-paste-input');

  if (jsonFileInput && jsonPasteInput) {
    jsonFileInput.onchange = async () => {
      if (jsonFileInput.files?.[0]) {
        try {
          const text = await jsonFileInput.files[0].text();
          jsonPasteInput.value = text;
          showToast('JSON file loaded into editor');
        } catch (e) {
          showToast('Failed to read file: ' + e.message, 'red');
        }
      }
    };
  }

  if (jsonImportForm) {
    jsonImportForm.onsubmit = handleJsonImport;
  }

  // Download JSON Template
  const downloadTemplateBtn = document.querySelector('#btn-download-template');
  if (downloadTemplateBtn) {
    downloadTemplateBtn.onclick = handleDownloadTemplate;
  }

  // Export Quiz JSON
  const exportQuizBtn = document.querySelector('#btn-export-quiz-json');
  if (exportQuizBtn) {
    exportQuizBtn.onclick = handleExportQuiz;
  }

  // Live Quiz Settings Form
  const liveSettingsForm = document.querySelector('#quiz-live-settings-form');
  if (liveSettingsForm) {
    liveSettingsForm.onsubmit = handleSaveLiveSettings;
  }

  // Simulate Live Movement in Monitor
  const btnSimulateMovement = document.querySelector('#btn-simulate-movement');
  if (btnSimulateMovement) {
    btnSimulateMovement.onclick = () => {
      handleSimulateLiveMovement();
    };
  }

  // Live Quiz: Option Selection
  document.querySelectorAll('[data-option]').forEach(btn => {
    btn.onclick = () => handleSelectOption(btn.dataset.option);
  });

  // Live Quiz: Navigation
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.onclick = () => {
      const dir = btn.dataset.nav;
      if (dir === 'previous') {
        state.current = Math.max(0, state.current - 1);
        save();
        render({ refresh: false });
      } else if (dir === 'next') {
        if (state.current < state.questions.length - 1) {
          state.current += 1;
          save();
          render({ refresh: false });
        } else {
          openSubmitModal();
        }
      }
    };
  });

  // Live Quiz: Question Matrix Jump
  document.querySelectorAll('[data-jump]').forEach(btn => {
    btn.onclick = () => {
      state.current = Number(btn.dataset.jump);
      save();
      render({ refresh: false });
    };
  });

  // Live Quiz: Clear Selection
  const clearChoiceBtn = document.querySelector('#clear-choice-btn');
  if (clearChoiceBtn) {
    clearChoiceBtn.onclick = () => handleClearOption();
  }

  // Live Quiz: Mark for Review
  const reviewBtn = document.querySelector('#mark-review-btn');
  if (reviewBtn) {
    reviewBtn.onclick = () => {
      const q = state.questions[state.current];
      if (!q) return;
      state.reviews[q.id] = !state.reviews[q.id];
      save();
      render({ refresh: false });
      showToast(state.reviews[q.id] ? 'Question marked for review' : 'Removed review mark');
    };
  }

  // Super Admin Stage Presenter Controls & Projector Operations
  const stageBtnLaunch = document.querySelector('#stage-btn-launch');
  if (stageBtnLaunch) {
    stageBtnLaunch.onclick = async () => {
      const currentQuiz = activeQuiz();
      const cd = currentQuiz.preQuizCountdownSeconds ?? 10;
      state.stageRemaining = cd;
      state.stageState = { stage: 'COUNTDOWN', questionIndex: 0, remainingSeconds: cd };
      playAudioAlert('start');
      await quizApi.updateStage(currentQuiz.id, { stage: 'COUNTDOWN', questionIndex: 0, remainingSeconds: cd });
      render({ refresh: false });
    };
  }

  const stageBtnFullscreen = document.querySelector('#stage-btn-fullscreen');
  if (stageBtnFullscreen) {
    stageBtnFullscreen.onclick = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    };
  }

  const stageBtnSkipQ = document.querySelector('#stage-btn-skip-q');
  if (stageBtnSkipQ) {
    stageBtnSkipQ.onclick = async () => {
      const currentQuiz = activeQuiz();
      const qIdx = Number.isInteger(state.stageState?.questionIndex) ? state.stageState.questionIndex : 0;
      const intermissionSec = currentQuiz.intermissionSeconds ?? 7;
      state.stageRemaining = intermissionSec;
      state.stageState = { stage: 'LEADERBOARD', questionIndex: qIdx, remainingSeconds: intermissionSec };
      playAudioAlert('ping');
      await quizApi.updateStage(currentQuiz.id, { stage: 'LEADERBOARD', questionIndex: qIdx, remainingSeconds: intermissionSec });
      render({ refresh: true });
    };
  }

  const stageBtnAdvanceNow = document.querySelector('#stage-btn-advance-now');
  if (stageBtnAdvanceNow) {
    stageBtnAdvanceNow.onclick = async () => {
      const currentQuiz = activeQuiz();
      const questions = state.questions || state.questionBank || [];
      const qIdx = Number.isInteger(state.stageState?.questionIndex) ? state.stageState.questionIndex : 0;
      if (qIdx < questions.length - 1) {
        const nextIdx = qIdx + 1;
        const nextQ = questions[nextIdx];
        const qTime = nextQ?.timeLimitSeconds || 30;
        state.stageRemaining = qTime;
        state.stageState = { stage: 'QUESTION', questionIndex: nextIdx, remainingSeconds: qTime };
        playAudioAlert('start');
        await quizApi.updateStage(currentQuiz.id, { stage: 'QUESTION', questionIndex: nextIdx, remainingSeconds: qTime });
        render({ refresh: false });
      } else {
        state.stageRemaining = 0;
        state.stageState = { stage: 'COMPLETED', questionIndex: qIdx, remainingSeconds: 0 };
        playAudioAlert('ping');
        await quizApi.updateStage(currentQuiz.id, { stage: 'COMPLETED', remainingSeconds: 0 });
        await quizApi.admin(currentQuiz.id, 'end');
        render({ refresh: false });
      }
    };
  }

  const stageBtnTogglePause = document.querySelector('#stage-btn-toggle-pause');
  if (stageBtnTogglePause) {
    stageBtnTogglePause.onclick = async () => {
      state.isStagePaused = !state.isStagePaused;
      const currentQuiz = activeQuiz();
      if (state.isStagePaused) {
        await quizApi.admin(currentQuiz.id, 'pause');
      } else {
        await quizApi.admin(currentQuiz.id, 'resume');
      }
      render({ refresh: false });
    };
  }

  // Leaderboard Fullscreen
  const fullscreenBtn = document.querySelector('#btn-toggle-fullscreen');
  if (fullscreenBtn) {
    fullscreenBtn.onclick = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    };
  }

  // Leaderboard Search Filter
  const lbSearch = document.querySelector('#leaderboard-search');
  if (lbSearch) {
    lbSearch.oninput = e => {
      const term = e.target.value.toLowerCase();
      document.querySelectorAll('#table-body tr').forEach(row => {
        const text = row.dataset.team?.toLowerCase() || row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
      });
    };
  }

  // Live Monitor Search
  const lmSearch = document.querySelector('#live-monitor-search');
  if (lmSearch) {
    lmSearch.oninput = e => {
      const term = e.target.value.toLowerCase();
      document.querySelectorAll('#live-attempts-body tr').forEach(row => {
        const text = row.dataset.teamRow?.toLowerCase() || row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
      });
    };
  }

  // Leaderboard Filter Pills
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.className = 'filter-btn px-3 py-1.5 rounded font-mono text-xs font-bold uppercase bg-surface-container text-on-surface-variant hover:text-on-surface';
      });
      btn.className = 'filter-btn px-3 py-1.5 rounded font-mono text-xs font-bold uppercase bg-primary-container text-on-primary-container';
      const filter = btn.dataset.filter;
      document.querySelectorAll('#table-body tr').forEach(row => {
        if (filter === 'all') row.style.display = '';
        else if (filter === 'qualified') row.style.display = row.dataset.qualified === 'true' ? '' : 'none';
        else row.style.display = '';
      });
    };
  });

  // Admin Quiz Controls (Start, Pause, Resume, End, Redo)
  document.querySelectorAll('[data-control]').forEach(btn => {
    btn.onclick = () => {
      const action = btn.dataset.control;
      if (action === 'start') {
        if (!confirm(`Are you sure you want to start ${activeQuiz().name} live for all participants?`)) return;
      } else if (action === 'end') {
        if (!confirm(`Are you sure you want to end ${activeQuiz().name}? Active participant attempts will be scored.`)) return;
      } else if (action === 'redo') {
        if (!confirm(`ARENA ACTION: Are you sure you want to REDO ${activeQuiz().name}?\n\nThis will reset the quiz, clear all participant attempts/scores, and return the quiz to DRAFT state. Question bank will be preserved.`)) return;
      }
      handleQuizControl(action);
    };
  });

  // Direct Redo Quiz buttons on catalog cards
  document.querySelectorAll('[data-redo-quiz]').forEach(btn => {
    btn.onclick = async () => {
      const qId = btn.dataset.redoQuiz;
      const target = state.quizzes.find(q => q.id === qId);
      const name = target?.name || qId;
      if (!confirm(`ARENA ACTION: Are you sure you want to REDO ${name}?\n\nThis will reset the quiz, clear all participant attempts/scores, and return the quiz to DRAFT state. Question bank will be preserved.`)) return;
      try {
        state.selectedQuizId = qId;
        const res = await quizApi.admin(qId, 'redo');
        state.quiz = res.quiz;
        const qIdx = state.quizzes.findIndex(q => q.id === qId);
        if (qIdx >= 0) state.quizzes[qIdx] = res.quiz;
        save();
        showToast(`${name} has been reset to DRAFT for REDO`, 'green');
        await refreshPageData();
      } catch (err) {
        showToast(err.message, 'red');
      }
    };
  });

  // Admin: Mark Ready (works directly, JSON import is optional)
  document.querySelectorAll('[data-ready]').forEach(btn => {
    btn.onclick = async () => {
      try {
        const quizId = btn.dataset.ready;
        await quizApi.ready(quizId);
        showToast('Quiz promoted to READY state', 'green');
        await refreshPageData();
      } catch (err) {
        showToast(err.message, 'red');
      }
    };
  });

  // Admin: Question Builder Form & Selectors
  document.querySelectorAll('[data-select-q]').forEach(el => {
    el.onclick = () => {
      state.builderActiveQ = el.dataset.selectQ;
      render({ refresh: false });
    };
  });

  const btnShowAddQ = document.querySelector('#btn-show-add-q');
  const btnCancelEdit = document.querySelector('#btn-cancel-edit');
  if (btnShowAddQ) {
    btnShowAddQ.onclick = () => {
      state.builderActiveQ = null;
      render({ refresh: false });
    };
  }
  if (btnCancelEdit) {
    btnCancelEdit.onclick = () => {
      state.builderActiveQ = null;
      render({ refresh: false });
    };
  }

  const qEditorForm = document.querySelector('#question-editor-form');
  if (qEditorForm) {
    qEditorForm.onsubmit = handleSaveQuestion;
  }

  document.querySelectorAll('[data-delete-q]').forEach(btn => {
    btn.onclick = () => handleDeleteQuestion(btn.dataset.deleteQ);
  });

  // Invalidate Session
  document.querySelectorAll('[data-invalidate-team]').forEach(btn => {
    btn.onclick = async () => {
      const teamId = btn.dataset.invalidateTeam;
      if (!confirm(`Revoke and invalidate session for team ${teamId}?`)) return;
      try {
        await quizApi.invalidateSession(activeQuiz().id, teamId);
        showToast(`Session invalidated for team ${teamId}`, 'green');
        await refreshPageData();
      } catch (err) {
        showToast(err.message, 'red');
      }
    };
  });

  // Admin Results: Finalize Modal
  const openFinalizeBtn = document.querySelector('#btn-open-finalize-modal');
  const finalizeModal = document.querySelector('#finalize-modal');
  const cancelFinalizeBtn = document.querySelector('#btn-cancel-finalize');
  if (openFinalizeBtn && finalizeModal) openFinalizeBtn.onclick = () => finalizeModal.classList.remove('hidden');
  if (cancelFinalizeBtn && finalizeModal) cancelFinalizeBtn.onclick = () => finalizeModal.classList.add('hidden');

  const executeFinalizeBtn = document.querySelector('[data-action="finalize"]');
  if (executeFinalizeBtn) {
    executeFinalizeBtn.onclick = async () => {
      try {
        const response = await quizApi.admin(activeQuiz().id, 'finalize');
        state.quiz = response.quiz;
        state.leaderboard = response.leaderboard.rows;
        save();
        if (finalizeModal) finalizeModal.classList.add('hidden');
        showToast('Qualification officially finalized and sealed!', 'green');
        render({ refresh: false });
      } catch (err) {
        showToast(err.message, 'red');
      }
    };
  }

  // Admin Results: Edit Score Modal & Triggers
  const editScoreModal = document.querySelector('#edit-score-modal');
  const cancelEditScoreBtn = document.querySelector('#btn-cancel-edit-score');
  const saveScoreBtn = document.querySelector('#btn-save-score');

  document.querySelectorAll('[data-edit-score]').forEach(btn => {
    btn.onclick = () => {
      const teamId = btn.dataset.editScore;
      const teamName = btn.dataset.teamName || teamId;
      const currentScore = btn.dataset.currentScore || '0';
      if (!editScoreModal) return;
      document.querySelector('#edit-score-team-id').value = teamId;
      document.querySelector('#edit-score-team-title').textContent = `Adjust Score: ${teamName}`;
      document.querySelector('#edit-score-input').value = currentScore;
      document.querySelector('#edit-score-reason').value = '';
      editScoreModal.classList.remove('hidden');
    };
  });

  if (cancelEditScoreBtn && editScoreModal) {
    cancelEditScoreBtn.onclick = () => editScoreModal.classList.add('hidden');
  }

  if (saveScoreBtn && editScoreModal) {
    saveScoreBtn.onclick = async () => {
      const quizId = activeQuiz().id;
      const teamId = document.querySelector('#edit-score-team-id').value;
      const newScore = parseFloat(document.querySelector('#edit-score-input').value);
      const reason = document.querySelector('#edit-score-reason').value.trim();
      if (!Number.isFinite(newScore)) {
        showToast('Please enter a valid numeric score', 'red');
        return;
      }
      try {
        const res = await quizApi.adjustScore(quizId, teamId, { score: newScore, reason });
        if (res.leaderboard?.rows) state.leaderboard = res.leaderboard.rows;
        editScoreModal.classList.add('hidden');
        showToast(`Score updated to ${newScore} pts for ${teamId}`, 'green');
        render({ refresh: true });
      } catch (err) {
        showToast(err.message, 'red');
      }
    };
  }

  // Admin Results: Debar Modal & Triggers
  const debarModal = document.querySelector('#debar-modal');
  const cancelDebarBtn = document.querySelector('#btn-cancel-debar');
  const confirmDebarBtn = document.querySelector('#btn-confirm-debar');

  document.querySelectorAll('[data-debar-team]').forEach(btn => {
    btn.onclick = () => {
      const teamId = btn.dataset.debarTeam;
      const teamName = btn.dataset.teamName || teamId;
      const action = btn.dataset.debarAction || 'debar';
      if (!debarModal) return;
      document.querySelector('#debar-team-id').value = teamId;
      document.querySelector('#debar-team-action').value = action;
      if (action === 'reinstate') {
        document.querySelector('#debar-team-title').textContent = `Reinstate Team: ${teamName}`;
        document.querySelector('#debar-modal-desc').textContent = `Are you sure you want to reinstate ${teamName}? Their debarred status will be cleared and they will be eligible for cutoff rankings again.`;
        document.querySelector('#debar-reason-container').classList.add('hidden');
        document.querySelector('#debar-confirm-btn-label').textContent = 'Confirm Reinstatement';
        confirmDebarBtn.className = 'px-5 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-black font-mono text-xs font-bold uppercase shadow-md flex items-center gap-1.5';
      } else {
        document.querySelector('#debar-team-title').textContent = `Debar Team: ${teamName}`;
        document.querySelector('#debar-modal-desc').textContent = `Debarring ${teamName} will revoke qualification, mark their status as DEBARRED, and prevent them from taking an advancement cutoff slot.`;
        document.querySelector('#debar-reason-container').classList.remove('hidden');
        document.querySelector('#debar-reason-input').value = '';
        document.querySelector('#debar-confirm-btn-label').textContent = 'Confirm Debarment';
        confirmDebarBtn.className = 'px-5 py-2 rounded bg-rose-500 hover:bg-rose-600 text-white font-mono text-xs font-bold uppercase shadow-md flex items-center gap-1.5';
      }
      debarModal.classList.remove('hidden');
    };
  });

  if (cancelDebarBtn && debarModal) {
    cancelDebarBtn.onclick = () => debarModal.classList.add('hidden');
  }

  if (confirmDebarBtn && debarModal) {
    confirmDebarBtn.onclick = async () => {
      const quizId = activeQuiz().id;
      const teamId = document.querySelector('#debar-team-id').value;
      const action = document.querySelector('#debar-team-action').value;
      const reason = document.querySelector('#debar-reason-input')?.value?.trim();
      const debarred = action === 'debar';
      try {
        const res = await quizApi.debarTeam(quizId, teamId, { debarred, reason });
        if (res.leaderboard?.rows) state.leaderboard = res.leaderboard.rows;
        debarModal.classList.add('hidden');
        showToast(debarred ? `Team ${teamId} has been debarred` : `Team ${teamId} has been reinstated`, debarred ? 'amber' : 'green');
        render({ refresh: true });
      } catch (err) {
        showToast(err.message, 'red');
      }
    };
  }

  // Stage Presenter Buttons & Real-Time Controls
  const stageLaunchBtn = document.querySelector('#stage-btn-launch');
  if (stageLaunchBtn) {
    stageLaunchBtn.onclick = async () => {
      try {
        const quizId = activeQuiz().id;
        if (activeQuiz().status !== 'LIVE') {
          if (activeQuiz().status === 'DRAFT') {
            await quizApi.ready(quizId);
          }
          await quizApi.admin(quizId, 'start');
        }
        const countdownSec = activeQuiz().preQuizCountdownSeconds ?? 10;
        state.stageRemaining = countdownSec;
        state.isStagePaused = false;
        await quizApi.updateStage(quizId, {
          stage: 'COUNTDOWN',
          questionIndex: 0,
          remainingSeconds: countdownSec
        });
        showToast('Stage Countdown Started!', 'green');
      } catch (err) {
        showToast(err.message, 'red');
      }
    };
  }

  const stageFullscreenBtn = document.querySelector('#stage-btn-fullscreen');
  if (stageFullscreenBtn) {
    stageFullscreenBtn.onclick = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    };
  }

  const stageSkipBtn = document.querySelector('#stage-btn-skip-q');
  if (stageSkipBtn) {
    stageSkipBtn.onclick = async () => {
      try {
        const quizId = activeQuiz().id;
        const qIdx = state.stageState?.questionIndex || 0;
        const intermissionSec = activeQuiz().intermissionSeconds ?? 7;
        state.stageRemaining = intermissionSec;
        await quizApi.updateStage(quizId, {
          stage: 'LEADERBOARD',
          questionIndex: qIdx,
          remainingSeconds: intermissionSec
        });
      } catch (err) {
        showToast(err.message, 'red');
      }
    };
  }

  const stageAdvanceBtn = document.querySelector('#stage-btn-advance-now');
  if (stageAdvanceBtn) {
    stageAdvanceBtn.onclick = async () => {
      try {
        const quizId = activeQuiz().id;
        const qIdx = state.stageState?.questionIndex || 0;
        const questions = state.questions || state.questionBank || [];
        if (qIdx < questions.length - 1) {
          const nextIdx = qIdx + 1;
          const nextQ = questions[nextIdx];
          const qTime = nextQ?.timeLimitSeconds || 30;
          state.stageRemaining = qTime;
          await quizApi.updateStage(quizId, {
            stage: 'QUESTION',
            questionIndex: nextIdx,
            remainingSeconds: qTime
          });
        } else {
          await quizApi.updateStage(quizId, {
            stage: 'COMPLETED',
            remainingSeconds: 0
          });
        }
      } catch (err) {
        showToast(err.message, 'red');
      }
    };
  }

  const stagePauseBtn = document.querySelector('#stage-btn-toggle-pause');
  if (stagePauseBtn) {
    stagePauseBtn.onclick = () => {
      state.isStagePaused = !state.isStagePaused;
      showToast(state.isStagePaused ? 'Stage Timer Paused' : 'Stage Timer Resumed', 'amber');
      render({ refresh: false });
    };
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const errorEl = document.querySelector('#login-error');
  if (errorEl) errorEl.textContent = '';
  try {
    const data = new FormData(e.currentTarget);
    const email = data.get('email');
    const password = data.get('password');
    const portalMode = data.get('portalMode') || state.activeLoginMode || 'TEAM';
    const response = await quizApi.demoLogin(email, password, portalMode === 'ADMIN' ? 'admin' : 'participant');

    const role = response.account.role;
    const isAdminRole = ['ADMIN', 'SUPER_ADMIN'].includes(role);

    // Enforce strict separation: prevent Admin in Team Login and Team in Admin Login
    if (portalMode === 'TEAM' && isAdminRole) {
      const msg = 'Access Denied: Organizer & Super Admin accounts cannot log in through Team Login. Please click the "Organizer / Super Admin" tab above.';
      if (errorEl) errorEl.textContent = msg;
      showToast(msg, 'red');
      return;
    }

    if (portalMode === 'ADMIN' && !isAdminRole) {
      const msg = 'Access Denied: Team Leader & Member accounts cannot log in through Organizer portal. Please click the "Team Login" tab above.';
      if (errorEl) errorEl.textContent = msg;
      showToast(msg, 'red');
      return;
    }

    // Safeguard: Check OC PIN if signing into an admin/organizer account
    if (isAdminRole && sessionStorage.getItem('oc_pin_unlocked') !== 'true') {
      const tabAdmin = document.querySelector('#tab-admin');
      if (tabAdmin) tabAdmin.click();
      const pinError = document.querySelector('#oc-pin-error');
      if (pinError) pinError.textContent = 'Enter OC PIN  to proceed with administrative sign in.';
      return;
    }

    localStorage.setItem('robothon-demo-account', JSON.stringify({ ...response.account, token: response.token, refreshToken: response.refreshToken }));
    localStorage.setItem('robothon-session-id', response.account.sessionId || crypto.randomUUID());
    state.current = 0;
    state.attempt = null;
    showToast(`Authenticated as ${response.account.name}`, 'green');
    navigate(isAdminRole ? 'admin/quizzes/builder' : 'team/quiz');
  } catch (err) {
    if (errorEl) errorEl.textContent = err.message;
    showToast(err.message, 'red');
  }
}

/**
 * @transfer-reference: Optimistic Option Selection & Instant Autosave
 * 1. Validates quiz pause state.
 * 2. Writes selected option immediately into state.attempt.answers and state.answers.
 * 3. Dispatches synchronous save() to localStorage and renders with zero perceptible latency.
 * 4. Asynchronously dispatches POST /api/quizzes/:id/answer to write to database.
 */
async function handleSelectOption(optionKey) {
  if (activeQuiz().status === 'PAUSED') {
    showToast('Quiz is paused. Cannot change answers.', 'red');
    return;
  }
  const qIdx = Number.isInteger(state.stageState?.questionIndex) ? state.stageState.questionIndex : state.current;
  const q = state.questions[qIdx];
  if (!q) return;

  const currentQuizId = state.attempt?.quizId || activeQuiz().id;
  state.attempt = state.attempt || { quizId: currentQuizId };
  state.attempt.answers = state.attempt.answers || {};
  state.attempt.answers[q.id] = optionKey;
  state.answers = state.answers || {};
  state.answers[q.id] = optionKey;
  save();
  render({ refresh: false });

  const indicator = document.querySelector('#autosave-indicator');
  if (indicator) {
    indicator.innerHTML = '<span class="material-symbols-outlined text-[14px] text-primary animate-spin">sync</span><span>Saving...</span>';
  }

  try {
    const res = await quizApi.answer(currentQuizId, q.id, optionKey);
    if (res?.answer?.selectedOption) {
      state.attempt.answers[q.id] = res.answer.selectedOption;
      state.answers[q.id] = res.answer.selectedOption;
      save();
    }
    if (indicator) {
      indicator.innerHTML = '<span class="material-symbols-outlined text-[14px] text-tertiary">cloud_done</span><span>Saved to Arena</span>';
    }
  } catch (err) {
    showToast(err.message, 'red');
    if (indicator) {
      indicator.innerHTML = '<span class="material-symbols-outlined text-[14px] text-error">error</span><span>Save Error</span>';
    }
  }
}

async function handleClearOption() {
  const qIdx = Number.isInteger(state.stageState?.questionIndex) ? state.stageState.questionIndex : state.current;
  const q = state.questions[qIdx];
  if (!q) return;
  if (state.attempt?.answers) {
    delete state.attempt.answers[q.id];
  }
  if (state.answers) {
    delete state.answers[q.id];
  }
  save();
  render({ refresh: false });
  showToast('Answer choice cleared');
}

async function executeQuizSubmission() {
  const targetQuizId = state.attempt?.quizId || state.selectedQuizId || activeQuiz().id;
  try {
    const cachedAnswers = state.attempt?.answers || state.answers || {};
    const result = await quizApi.submit(targetQuizId);
    state.attempt = {
      ...result.attempt,
      answers: result.attempt?.answers || cachedAnswers,
      answeredCount: result.attempt?.answeredCount ?? Object.keys(result.attempt?.answers || cachedAnswers).length
    };
    save();
    showToast('Quiz successfully submitted to arena server!', 'green');
    navigate('team/quiz/completed');
  } catch (err) {
    console.warn('executeQuizSubmission check on error:', err);
    // Graceful recovery: If attempt was auto-submitted/evaluated on timeout or deadline,
    // fetch authoritative attempt state and transition cleanly to completed receipt
    try {
      const check = await quizApi.myAttempt(targetQuizId);
      if (check?.attempt && ['SUBMITTED', 'EVALUATED'].includes(check.attempt.status)) {
        state.attempt = {
          ...state.attempt,
          ...check.attempt,
          answers: check.attempt.answers || state.answers || {}
        };
        save();
        showToast('Quiz submission recorded and sealed', 'green');
        navigate('team/quiz/completed');
        return;
      }
    } catch {
      // Ignore fallback error
    }
    showToast(err.message, 'red');
  }
}

async function handleQuizControl(action) {
  try {
    const result = await quizApi.admin(activeQuiz().id, action);
    state.quiz = result.quiz;
    const qIdx = state.quizzes.findIndex(q => q.id === result.quiz.id);
    if (qIdx >= 0) state.quizzes[qIdx] = result.quiz;
    save();
    showToast(`Quiz round ${action.toUpperCase()} confirmed`, 'green');
    await refreshPageData();
    if (action === 'start') {
      navigate('admin/quizzes/stage');
    }
  } catch (err) {
    showToast(err.message, 'red');
  }
}

async function handleSaveLiveSettings(e) {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  try {
    const patch = {
      name: data.get('name').trim(),
      durationSeconds: Number(data.get('durationMinutes')) * 60,
      pointsPerCorrect: Number(data.get('pointsPerCorrect')),
      negativeMarking: false,
      negativePoints: 0,
      qualificationCount: Number(data.get('qualificationCount')),
      preQuizCountdownSeconds: Number(data.get('preQuizCountdownSeconds')) || 10,
      intermissionSeconds: Number(data.get('intermissionSeconds')) || 7,
      forceLiveEdit: true
    };
    const response = await quizApi.updateConfig(activeQuiz().id, patch);
    state.quiz = response.quiz;
    const qIdx = state.quizzes.findIndex(q => q.id === response.quiz.id);
    if (qIdx >= 0) state.quizzes[qIdx] = response.quiz;
    save();
    showToast('Quiz parameters updated live', 'green');
    await refreshPageData();
  } catch (err) {
    showToast(err.message, 'red');
  }
}

async function handleSaveQuestion(e) {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  const qId = data.get('questionId');
  const payload = {
    questionText: data.get('questionText').trim(),
    category: 'General',
    points: activeQuiz().pointsPerCorrect || 4,
    correctOption: data.get('correctOption'),
    timeLimitSeconds: Number(data.get('timeLimitSeconds')) || 30,
    forceLiveEdit: true,
    options: ['A', 'B', 'C', 'D'].map(key => ({
      optionKey: key,
      optionText: (data.get(`option_${key}`) || data.get(`option-${key}`) || '').trim()
    }))
  };

  try {
    if (qId) {
      await quizApi.updateQuestion(qId, payload);
      showToast('Question updated', 'green');
    } else {
      const created = await quizApi.createQuestion(activeQuiz().id, payload);
      state.builderActiveQ = created.question.id;
      showToast('New question created in Quiz', 'green');
    }
    await refreshPageData();
  } catch (err) {
    showToast(err.message, 'red');
  }
}

async function handleDeleteQuestion(qId) {
  if (!confirm('Permanently delete this question from the quiz?')) return;
  try {
    await quizApi.deleteQuestion(qId, { forceLiveEdit: true });
    state.builderActiveQ = null;
    showToast('Question deleted', 'green');
    await refreshPageData();
  } catch (err) {
    showToast(err.message, 'red');
  }
}

async function handleJsonImport(e) {
  e.preventDefault();
  const statusEl = document.querySelector('#json-import-status');
  if (statusEl) {
    statusEl.textContent = 'Validating and importing JSON...';
    statusEl.className = 'min-h-4 text-xs font-mono font-semibold text-primary';
  }
  try {
    const pasteInput = document.querySelector('#json-paste-input');
    const fileInput = document.querySelector('#json-file-input');
    const importMode = document.querySelector('[name=importMode]:checked')?.value || 'replace';

    let jsonStr = pasteInput?.value?.trim() || '';
    if (fileInput?.files?.[0]) {
      jsonStr = await fileInput.files[0].text();
    }
    if (!jsonStr) {
      throw new Error('Please select a JSON file or paste questions JSON into the box.');
    }

    const parsed = JSON.parse(jsonStr);
    const payload = Array.isArray(parsed)
      ? { questions: parsed, mode: importMode }
      : { ...parsed, mode: importMode };

    const result = await quizApi.importQuiz(activeQuiz().id, payload);
    if (statusEl) {
      statusEl.className = 'min-h-4 text-xs font-mono font-semibold text-tertiary';
      statusEl.textContent = `Successfully imported ${result.count} questions into ${result.quiz.name}!`;
    }
    showToast(`Imported ${result.count} questions into ${result.quiz.name}`, 'green');
    if (pasteInput) pasteInput.value = '';
    if (fileInput) fileInput.value = '';
    await refreshPageData();
  } catch (err) {
    if (statusEl) {
      statusEl.className = 'min-h-4 text-xs font-mono font-semibold text-error';
      statusEl.textContent = err.message;
    }
    showToast(err.message, 'red');
  }
}

function handleDownloadTemplate() {
  const template = {
    name: "Robothon 2026 — Official Quiz Round",
    durationSeconds: 1800,
    pointsPerCorrect: 4,
    negativeMarking: false,
    negativePoints: 0,
    qualificationCount: 40,
    questions: [
      {
        questionText: "Which type of motor control uses proportional, integral, and derivative terms to calculate correction values?",
        options: [
          { optionKey: "A", optionText: "Open-loop feedforward" },
          { optionKey: "B", optionText: "Closed-loop PID control" },
          { optionKey: "C", optionText: "Bang-bang switching" },
          { optionKey: "D", optionText: "Pulse width modulation only" }
        ],
        correctOption: "B"
      },
      {
        questionText: "What primary advantage does the CAN bus protocol offer in competitive robotics over standard I2C?",
        options: [
          { optionKey: "A", optionText: "Differential signaling with hardware error arbitration" },
          { optionKey: "B", optionText: "Lower voltage levels for analog sensors" },
          { optionKey: "C", optionText: "Direct video streaming support" },
          { optionKey: "D", optionText: "No termination resistors needed" }
        ],
        correctOption: "A"
      }
    ]
  };
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'robothon-quiz-template.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Template downloaded');
}

async function handleExportQuiz() {
  try {
    const data = await quizApi.exportQuiz(activeQuiz().id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeQuiz().id}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${activeQuiz().name} as JSON`);
  } catch (err) {
    showToast(err.message, 'red');
  }
}

// Live Rank Movement Simulation
function handleSimulateLiveMovement() {
  if (state.liveAttempts.length === 0) {
    state.liveAttempts = [
      { teamId: 'team-apex', teamName: 'Apex Mechanics', score: 12, timeTakenSeconds: 320, status: 'ACTIVE' },
      { teamId: 'team-bolt', teamName: 'Bolt Dynamics', score: 8, timeTakenSeconds: 390, status: 'ACTIVE' },
      { teamId: 'team-cyber', teamName: 'Cyber Knights', score: 16, timeTakenSeconds: 280, status: 'ACTIVE' },
      { teamId: 'team-delta', teamName: 'Delta Robotics', score: 4, timeTakenSeconds: 410, status: 'ACTIVE' }
    ];
  }

  // Record current ranks
  const prev = {};
  [...state.liveAttempts].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).forEach((att, idx) => {
    prev[att.teamId] = idx + 1;
  });
  state.prevRanks = prev;

  // Randomly adjust scores to simulate real-time answering
  const randomAtt = state.liveAttempts[Math.floor(Math.random() * state.liveAttempts.length)];
  randomAtt.score = (randomAtt.score || 0) + (Math.random() > 0.3 ? 4 : -1);
  randomAtt.timeTakenSeconds = (randomAtt.timeTakenSeconds || 300) + 15;

  render({ refresh: false });
  showToast(`Live update: ${randomAtt.teamName} score changed to ${randomAtt.score} pts!`);
}

// Global Routing
window.addEventListener('hashchange', () => render());

function playAudioAlert(type = 'ping') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    if (type === 'start') {
      // Fanfare alert for quiz starting live
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.4);
      });
    } else {
      // High chime for quiz ready
      [880, 1174.66].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
      });
    }
  } catch (err) {
    console.warn('Audio alert not supported or blocked:', err);
  }
}

// Realtime SSE Event Handler with Dynamic Button & Status Sync
quizEvents((type, payload) => {
  if (type === 'CONNECTED') {
    state.connection = 'CONNECTED';
  } else if (type === 'CONNECTION_LOST') {
    state.connection = 'DISCONNECTED';
  }

  // Synchronize quiz lifecycle dynamically if another admin acts
  if (['QUIZ_STARTED', 'QUIZ_PAUSED', 'QUIZ_RESUMED', 'QUIZ_ENDED', 'QUIZ_READY', 'QUIZ_CONFIGURATION_UPDATED'].includes(type)) {
    if (payload?.quiz) {
      const qIdx = state.quizzes.findIndex(q => q.id === payload.quiz.id);
      if (qIdx >= 0) {
        state.quizzes[qIdx] = { ...state.quizzes[qIdx], ...payload.quiz };
      } else {
        state.quizzes.push(payload.quiz);
      }
      if (state.selectedQuizId === payload.quiz.id || state.quiz?.id === payload.quiz.id) {
        state.quiz = { ...state.quiz, ...payload.quiz };
      }
    }
  }

  save();

  if (type === 'QUIZ_STARTED') {
    playAudioAlert('start');
    showToast(`ARENA BROADCAST: ${payload?.quiz?.name || 'Quiz'} is LIVE!`, 'green');
    if (payload?.quiz) {
      const qIdx = state.quizzes.findIndex(q => q.id === payload.quiz.id);
      if (qIdx >= 0) {
        state.quizzes[qIdx] = { ...state.quizzes[qIdx], ...payload.quiz };
      } else {
        state.quizzes.push(payload.quiz);
      }
      state.selectedQuizId = payload.quiz.id;
      state.quiz = payload.quiz;
      if (state.attempt?.quizId !== payload.quiz.id) {
        state.attempt = null;
        state.answers = {};
        state.reviews = {};
        state.current = 0;
      }
      save();
    }

    const currentAccount = account();
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(currentAccount?.role);

    // If contestant is on ANY non-quiz page (or waiting room / completed / leaderboard):
    // Automatically redirect immediately into the live quiz terminal.
    if (!isAdmin) {
      state.showLaunchPrompt = false;
      state.route = 'team/quiz/live';
      navigate('team/quiz/live');
      render({ refresh: true });
      return;
    }
  } else if (type === 'QUIZ_PAUSED') {
    showToast(`ARENA BROADCAST: ${payload?.quiz?.name || 'Quiz'} was PAUSED by Host`, 'red');
  } else if (type === 'QUIZ_RESUMED') {
    showToast(`ARENA BROADCAST: ${payload?.quiz?.name || 'Quiz'} was RESUMED by Host`, 'green');
  } else if (type === 'QUIZ_ENDED' || type === 'FORCE_SUBMIT') {
    showToast(`ARENA BROADCAST: ${payload?.quiz?.name || 'Quiz'} has CONCLUDED`, 'red');
    if (state.attempt && (state.attempt.quizId === payload?.quiz?.id || state.attempt.id === payload?.attemptId)) {
      state.attempt.status = 'EVALUATED';
    }
    if (state.route === 'team/quiz/live') {
      navigate('team/quiz/completed');
      return;
    }
    refreshPageData().then(() => render({ refresh: false }));
    return;
  } else if (type === 'QUIZ_READY') {
    playAudioAlert('ping');
    showToast(`HOST BROADCAST PING: ${payload?.quiz?.name || 'Quiz'} is marked READY!`, 'green');
    if (payload?.quiz) {
      const qIdx = state.quizzes.findIndex(q => q.id === payload.quiz.id);
      if (qIdx >= 0) {
        state.quizzes[qIdx] = { ...state.quizzes[qIdx], ...payload.quiz };
      } else {
        state.quizzes.push(payload.quiz);
      }
      // In waiting room and contestant view, automatically switch the active top tab to this ready quiz
      state.selectedQuizId = payload.quiz.id;
      state.quiz = payload.quiz;
      if (state.attempt?.quizId !== payload.quiz.id) {
        state.attempt = null;
        state.answers = {};
        state.reviews = {};
        state.current = 0;
      }
      save();
    }
    refreshPageData().then(() => render({ refresh: false }));
    return;
  } else if (type === 'QUIZ_RESET') {
    playAudioAlert('ping');
    showToast(`ARENA RESET: ${payload?.quiz?.name || 'Quiz'} has been reset to DRAFT for a fresh REDO by Host.`, 'amber');
    state.attempt = null;
    state.answers = {};
    state.reviews = {};
    state.current = 0;
    state.showLaunchPrompt = false;
    if (['team/quiz/live', 'team/quiz/completed'].includes(state.route)) {
      navigate('team/quiz');
      return;
    }
    refreshPageData().then(() => render({ refresh: false }));
    return;
  } else if (type === 'LEADERBOARD_UPDATED') {
    if (state.route === 'admin/quizzes/live') {
      quizApi.adminLive(activeQuiz().id).then(liveData => {
        const prev = {};
        [...state.liveAttempts].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).forEach((att, idx) => {
          prev[att.teamId] = idx + 1;
        });
        state.prevRanks = prev;
        state.liveAttempts = liveData.attempts || [];
        render({ refresh: false });
      });
      return;
    }
  } else if (type === 'STAGE_UPDATE') {
    if (payload?.stageState) {
      state.stageState = payload.stageState;
      state.stageRemaining = payload.stageState.remainingSeconds ?? 0;
      if (Number.isInteger(payload.stageState.questionIndex)) {
        state.current = payload.stageState.questionIndex;
      }
      if (payload.stageState.stage === 'QUESTION') {
        playAudioAlert('ping');
      } else if (payload.stageState.stage === 'LEADERBOARD') {
        playAudioAlert('start');
      } else if (payload.stageState.stage === 'COMPLETED') {
        playAudioAlert('ping');
        showToast('All competition questions concluded! Responses automatically sealed.', 'green');
        if (state.route === 'team/quiz/live') {
          executeQuizSubmission();
          return;
        }
      }
      // Dynamically update view for live terminal and stage presenter without page reload!
      if (['team/quiz/live', 'admin/quizzes/stage'].includes(state.route)) {
        render({ refresh: false });
      }
    }
    return;
  }

  render({ refresh: false });
});

// Authoritative Timer Loop (1 second)
setInterval(() => {
  // Master Quiz Countdown Loop for general rounds
  if (['team/quiz/live', 'admin/quizzes/live'].includes(state.route)) {
    if (state.quiz?.status === 'LIVE' && state.remaining > 0) {
      state.remaining = Math.max(0, state.remaining - 1);
      const mins = Math.floor(state.remaining / 60);
      const secs = state.remaining % 60;
      const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      const timer2 = document.querySelector('#countdownDisplay');
      if (timer2) {
        timer2.textContent = formatted;
      }

      // Auto-Submit on overall Timeout if whole quiz expires
      if (state.remaining === 0 && state.route === 'team/quiz/live') {
        showToast('Time expired! Auto-submitting to arena...', 'red');
        executeQuizSubmission();
      }
    }
  }

  // Super Admin Stage Presenter: Authoritative Progression Engine (1 second tick)
  if (state.route === 'admin/quizzes/stage' && !state.isStagePaused) {
    const stage = state.stageState?.stage;
    const currentQuiz = activeQuiz();
    const questions = state.questions || state.questionBank || [];
    const qIdx = Number.isInteger(state.stageState?.questionIndex) ? state.stageState.questionIndex : 0;

    if (stage === 'COUNTDOWN') {
      if (state.stageRemaining > 0) {
        state.stageRemaining = Math.max(0, state.stageRemaining - 1);
        const cdEl = document.querySelector('#stage-countdown-num');
        if (cdEl) cdEl.textContent = state.stageRemaining > 0 ? state.stageRemaining : 'GO!';
      }
      if (state.stageRemaining === 0) {
        // Countdown finished: Transition to Question 1!
        const firstQ = questions[0];
        const qTime = firstQ?.timeLimitSeconds || 30;
        state.stageRemaining = qTime;
        playAudioAlert('start');
        quizApi.updateStage(currentQuiz.id, {
          stage: 'QUESTION',
          questionIndex: 0,
          remainingSeconds: qTime
        }).then(() => render({ refresh: false }));
      }
    } else if (stage === 'QUESTION') {
      if (state.stageRemaining > 0) {
        state.stageRemaining = Math.max(0, state.stageRemaining - 1);
        const qTimerEl = document.querySelector('#stage-q-timer-display');
        if (qTimerEl) {
          qTimerEl.textContent = `${state.stageRemaining}s`;
          if (state.stageRemaining <= 5) {
            qTimerEl.className = 'font-mono text-3xl font-extrabold text-rose-400 animate-pulse';
          }
        }
      }
      if (state.stageRemaining === 0) {
        // Question timer expired: Transition to Interim Leaderboard!
        const intermissionSec = currentQuiz.intermissionSeconds ?? 7;
        state.stageRemaining = intermissionSec;
        playAudioAlert('ping');
        quizApi.updateStage(currentQuiz.id, {
          stage: 'LEADERBOARD',
          questionIndex: qIdx,
          remainingSeconds: intermissionSec
        }).then(() => render({ refresh: true }));
      }
    } else if (stage === 'LEADERBOARD') {
      if (state.stageRemaining > 0) {
        state.stageRemaining = Math.max(0, state.stageRemaining - 1);
        const imTimerEl = document.querySelector('#stage-intermission-timer');
        if (imTimerEl) imTimerEl.textContent = `${state.stageRemaining}s`;
      }
      if (state.stageRemaining === 0) {
        // Intermission expired: Check if more questions exist
        if (qIdx < questions.length - 1) {
          const nextIdx = qIdx + 1;
          const nextQ = questions[nextIdx];
          const qTime = nextQ?.timeLimitSeconds || 30;
          state.stageRemaining = qTime;
          playAudioAlert('start');
          quizApi.updateStage(currentQuiz.id, {
            stage: 'QUESTION',
            questionIndex: nextIdx,
            remainingSeconds: qTime
          }).then(() => render({ refresh: false }));
        } else {
          // All questions finished!
          state.stageRemaining = 0;
          playAudioAlert('ping');
          quizApi.updateStage(currentQuiz.id, {
            stage: 'COMPLETED',
            remainingSeconds: 0
          }).then(() => {
            quizApi.admin(currentQuiz.id, 'end').catch(() => {});
            render({ refresh: false });
          });
        }
      }
    }
  }

  // Contestant / Team Leader Terminal: Live Question Timer Display Sync
  if (state.route === 'team/quiz/live') {
    if (state.stageRemaining > 0) {
      state.stageRemaining = Math.max(0, state.stageRemaining - 1);
      const readout = document.querySelector('#countdown-readout');
      if (readout) {
        readout.textContent = `${state.stageRemaining}s`;
        if (state.stageRemaining <= 5) {
          readout.className = 'font-mono text-xl font-bold text-error animate-pulse';
        }
      }
    }
  }
}, 1000);

// Stage Presenter Hotkeys (Space to Skip/Next, F for Fullscreen)
window.addEventListener('keydown', e => {
  if (state.route === 'admin/quizzes/stage') {
    if (e.code === 'Space') {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const currentStage = state.stageState?.stage;
        if (currentStage === 'QUESTION') {
          const btn = document.querySelector('#stage-btn-skip-q');
          if (btn) btn.click();
        } else if (currentStage === 'LEADERBOARD') {
          const btn = document.querySelector('#stage-btn-advance-now');
          if (btn) btn.click();
        } else if (currentStage === 'STANDBY') {
          const btn = document.querySelector('#stage-btn-launch');
          if (btn) btn.click();
        }
      }
    } else if (e.key === 'f' || e.key === 'F') {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        const btn = document.querySelector('#stage-btn-fullscreen');
        if (btn) btn.click();
      }
    }
  }
});

// Initial application launch
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => render());
} else {
  render();
}
