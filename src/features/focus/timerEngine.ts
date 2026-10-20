import type { FocusSession } from '../../shared/types/session';

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

export type TimerDurations = {
  focus: number;
  shortBreak: number;
  longBreak: number;
};

export type TimerState = {
  mode: TimerMode;
  durations: TimerDurations;
  isRunning: boolean;
  startedAt?: number;
  endTime?: number;
  remainingSeconds: number;
  taskId?: string;
  completedFocusSessions: number;
  autoStart: boolean;
};

export type TimerAction =
  | { type: 'start'; now: number; taskId?: string }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'reset'; now: number }
  | { type: 'stop'; now: number }
  | { type: 'tick'; now: number }
  | { type: 'skipBreak'; now: number }
  | { type: 'extendBreak'; now: number };

const BREAK_DURATION_LIMIT = 7200;
const BREAK_EXTENSION_SECONDS = 300;

function clearTimestamps(state: TimerState): TimerState {
  const { startedAt: _startedAt, endTime: _endTime, ...remainingState } = state;
  return remainingState;
}

function transitionToMode(
  state: TimerState,
  mode: TimerMode,
  now: number,
  isRunning: boolean,
  completedFocusSessions = state.completedFocusSessions,
): TimerState {
  const remainingSeconds = state.durations[mode];
  const nextState: TimerState = {
    ...clearTimestamps(state),
    mode,
    isRunning,
    remainingSeconds,
    completedFocusSessions,
  };

  return isRunning
    ? {
        ...nextState,
        startedAt: now,
        endTime: now + remainingSeconds * 1000,
      }
    : nextState;
}

function completeCurrentMode(state: TimerState, now: number): TimerState {
  if (state.mode === 'focus') {
    const completedFocusSessions = state.completedFocusSessions + 1;
    const nextMode: TimerMode =
      completedFocusSessions % 4 === 0 ? 'longBreak' : 'shortBreak';

    return transitionToMode(
      state,
      nextMode,
      now,
      state.autoStart,
      completedFocusSessions,
    );
  }

  return transitionToMode(state, 'focus', now, state.autoStart);
}

export function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'start': {
      const nextState: TimerState = {
        ...state,
        isRunning: true,
        startedAt: action.now,
        endTime: action.now + state.durations[state.mode] * 1000,
        remainingSeconds: state.durations[state.mode],
      };

      return action.taskId === undefined
        ? nextState
        : { ...nextState, taskId: action.taskId };
    }
    case 'pause':
      if (!state.isRunning || state.endTime === undefined) {
        return state;
      }

      return {
        ...clearTimestamps(state),
        isRunning: false,
        remainingSeconds: Math.max(
          0,
          Math.ceil((state.endTime - action.now) / 1000),
        ),
      };
    case 'resume':
      if (state.isRunning || state.remainingSeconds <= 0) {
        return state;
      }

      return {
        ...state,
        isRunning: true,
        startedAt: action.now,
        endTime: action.now + state.remainingSeconds * 1000,
      };
    case 'reset':
      return {
        ...clearTimestamps(state),
        isRunning: false,
        remainingSeconds: state.durations[state.mode],
      };
    case 'stop':
      return {
        ...clearTimestamps(state),
        mode: 'focus',
        isRunning: false,
        remainingSeconds: state.durations.focus,
        taskId: undefined,
      };
    case 'tick':
      if (
        !state.isRunning ||
        state.endTime === undefined ||
        action.now < state.endTime
      ) {
        return state;
      }

      return completeCurrentMode(state, action.now);
    case 'skipBreak':
      if (state.mode === 'focus') {
        return state;
      }

      return transitionToMode(state, 'focus', action.now, false);
    case 'extendBreak': {
      if (state.mode === 'focus') {
        return state;
      }

      const currentRemaining = state.isRunning
        ? Math.max(0, Math.ceil(((state.endTime ?? action.now) - action.now) / 1000))
        : state.remainingSeconds;
      const addedSeconds = Math.min(
        BREAK_EXTENSION_SECONDS,
        Math.max(0, BREAK_DURATION_LIMIT - currentRemaining),
      );

      if (addedSeconds === 0) {
        return state;
      }

      const durations = {
        ...state.durations,
        [state.mode]: Math.min(
          BREAK_DURATION_LIMIT,
          state.durations[state.mode] + addedSeconds,
        ),
      };

      return {
        ...state,
        durations,
        remainingSeconds: currentRemaining + addedSeconds,
        ...(state.isRunning && state.endTime !== undefined
          ? { endTime: state.endTime + addedSeconds * 1000 }
          : {}),
      };
    }
  }
}

export function selectRemainingSeconds(state: TimerState, now: number): number {
  if (!state.isRunning) {
    return state.remainingSeconds;
  }

  return Math.max(0, Math.ceil(((state.endTime ?? now) - now) / 1000));
}

export function buildCompletedSession(
  state: TimerState,
  generateId: () => string,
): FocusSession | null {
  if (state.mode !== 'focus' || state.endTime === undefined) {
    return null;
  }

  return {
    id: generateId(),
    mode: 'focus',
    // This is the scheduled start; pauses and resumes do not change it.
    startedAt: state.endTime - state.durations.focus * 1000,
    endedAt: state.endTime,
    durationSeconds: state.durations.focus,
    taskId: state.taskId,
  };
}
