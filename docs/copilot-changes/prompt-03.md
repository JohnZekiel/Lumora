# Copilot changes - prompt 03

## Full final contents

### `src/features/focus/timerEngine.ts`

```typescript
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
```

### `src/features/focus/__tests__/timerEngine.test.ts`

```typescript
import { describe, expect, it } from '@jest/globals';
import {
  selectRemainingSeconds,
  timerReducer,
  type TimerDurations,
  type TimerMode,
  type TimerState,
} from '../timerEngine';

const durations: TimerDurations = {
  focus: 1500,
  shortBreak: 300,
  longBreak: 900,
};

const createState = (overrides: Partial<TimerState> = {}): TimerState => ({
  mode: 'focus',
  durations,
  isRunning: false,
  remainingSeconds: durations.focus,
  completedFocusSessions: 0,
  autoStart: false,
  ...overrides,
});

const createBreakState = (
  mode: Extract<TimerMode, 'shortBreak' | 'longBreak'> = 'shortBreak',
  overrides: Partial<TimerState> = {},
): TimerState =>
  createState({
    mode,
    remainingSeconds: durations[mode],
    ...overrides,
  });

describe('timerReducer', () => {
  it('starts a timer and sets timestamps and the provided task id', () => {
    const state = createState();

    expect(
      timerReducer(state, { type: 'start', now: 10_000, taskId: 'task-1' }),
    ).toEqual({
      ...state,
      isRunning: true,
      startedAt: 10_000,
      endTime: 1_510_000,
      remainingSeconds: durations.focus,
      taskId: 'task-1',
    });
  });

  it('pauses with computed remaining time and clears timestamps', () => {
    const state = createState({
      isRunning: true,
      startedAt: 10_000,
      endTime: 130_000,
    });

    expect(timerReducer(state, { type: 'pause', now: 100_500 })).toEqual({
      ...createState({ remainingSeconds: 30 }),
      remainingSeconds: 30,
    });
  });

  it('resumes using remainingSeconds', () => {
    const state = createState({ remainingSeconds: 42 });

    expect(timerReducer(state, { type: 'resume', now: 1_000 })).toEqual({
      ...state,
      isRunning: true,
      startedAt: 1_000,
      endTime: 43_000,
    });
  });

  it('resets to the current mode duration and preserves the task id', () => {
    const state = createBreakState('shortBreak', {
      isRunning: true,
      startedAt: 10,
      endTime: 20,
      remainingSeconds: 1,
      taskId: 'task-1',
    });

    expect(timerReducer(state, { type: 'reset', now: 15 })).toEqual({
      ...createBreakState('shortBreak', { taskId: 'task-1' }),
      remainingSeconds: durations.shortBreak,
    });
  });

  it('stops in focus mode, paused, with no task id', () => {
    const state = createBreakState('longBreak', {
      isRunning: true,
      startedAt: 1,
      endTime: 2,
      taskId: 'task-1',
    });

    expect(timerReducer(state, { type: 'stop', now: 2 })).toEqual({
      ...createState(),
      taskId: undefined,
    });
  });

  it('completes focus into a paused short break when autoStart is false', () => {
    const state = createState({
      isRunning: true,
      endTime: 1000,
      autoStart: false,
    });

    expect(timerReducer(state, { type: 'tick', now: 1000 })).toEqual({
      ...createState({
        mode: 'shortBreak',
        remainingSeconds: durations.shortBreak,
        completedFocusSessions: 1,
      }),
    });
  });

  it('completes focus into a running short break when autoStart is true', () => {
    const state = createState({
      isRunning: true,
      endTime: 1000,
      autoStart: true,
    });

    expect(timerReducer(state, { type: 'tick', now: 1000 })).toEqual({
      ...createState({
        mode: 'shortBreak',
        isRunning: true,
        startedAt: 1000,
        endTime: 301_000,
        remainingSeconds: durations.shortBreak,
        completedFocusSessions: 1,
        autoStart: true,
      }),
    });
  });

  it('completes the fourth focus session into a long break', () => {
    const state = createState({
      isRunning: true,
      endTime: 1000,
      completedFocusSessions: 3,
    });

    expect(timerReducer(state, { type: 'tick', now: 1000 })).toEqual(
      createBreakState('longBreak', { completedFocusSessions: 4 }),
    );
  });

  it('completes a short break into a paused focus session when autoStart is false', () => {
    const state = createBreakState('shortBreak', {
      isRunning: true,
      endTime: 1000,
      autoStart: false,
    });

    expect(timerReducer(state, { type: 'tick', now: 1000 })).toEqual(
      createState(),
    );
  });

  it('skips a break into a paused focus session', () => {
    const state = createBreakState('longBreak', {
      isRunning: true,
      startedAt: 10,
      endTime: 20,
      taskId: 'task-1',
      completedFocusSessions: 2,
      autoStart: true,
    });

    expect(timerReducer(state, { type: 'skipBreak', now: 15 })).toEqual(
      createState({
        taskId: 'task-1',
        completedFocusSessions: 2,
        autoStart: true,
      }),
    );
  });

  it('extends a break by 300 seconds', () => {
    const state = createBreakState();

    expect(timerReducer(state, { type: 'extendBreak', now: 0 })).toEqual(
      createBreakState('shortBreak', {
        remainingSeconds: durations.shortBreak + 300,
        durations: { ...durations, shortBreak: 600 },
      }),
    );
  });

  it('caps the break duration and remaining time at 7200 seconds', () => {
    const state = createBreakState('shortBreak', {
      remainingSeconds: 7100,
      durations: { ...durations, shortBreak: 7100 },
    });

    expect(timerReducer(state, { type: 'extendBreak', now: 0 })).toEqual(
      createBreakState('shortBreak', {
        remainingSeconds: 7200,
        durations: { ...durations, shortBreak: 7200 },
      }),
    );
  });

  it('extends a paused break without setting endTime', () => {
    const state = createBreakState('shortBreak', { remainingSeconds: 400 });
    const nextState = timerReducer(state, { type: 'extendBreak', now: 0 });

    expect(nextState.remainingSeconds).toBe(700);
    expect(nextState.endTime).toBeUndefined();
  });

  it('extends a running break by shifting endTime', () => {
    const state = createBreakState('shortBreak', {
      isRunning: true,
      startedAt: 1000,
      endTime: 301_000,
    });

    expect(timerReducer(state, { type: 'extendBreak', now: 1000 })).toEqual({
      ...state,
      endTime: 601_000,
      remainingSeconds: 600,
      durations: { ...durations, shortBreak: 600 },
    });
  });

  it('returns running remaining time from endTime', () => {
    const state = createState({
      isRunning: true,
      endTime: 10_000,
      remainingSeconds: 99,
    });

    expect(selectRemainingSeconds(state, 2501)).toBe(8);
  });

  it('returns the stored remaining time while paused', () => {
    expect(selectRemainingSeconds(createState({ remainingSeconds: 17 }), 5000)).toBe(
      17,
    );
  });

  it('clamps remaining time to zero after endTime', () => {
    const state = createState({ isRunning: true, endTime: 1000 });

    expect(selectRemainingSeconds(state, 1001)).toBe(0);
  });

  it('returns the same state reference when a tick is before endTime', () => {
    const state = createState({ isRunning: true, endTime: 1000 });

    expect(timerReducer(state, { type: 'tick', now: 999 })).toBe(state);
  });

  it('transitions when a tick reaches endTime', () => {
    const state = createState({ isRunning: true, endTime: 1000 });

    expect(timerReducer(state, { type: 'tick', now: 1000 })).toEqual(
      createBreakState('shortBreak', { completedFocusSessions: 1 }),
    );
  });
});
```

## Commands and exit status

| Command | Exit status |
|---|---:|
| `npm exec tsc -- --noEmit` | 0 |
| `npm test -- --runInBand` | 0 |
