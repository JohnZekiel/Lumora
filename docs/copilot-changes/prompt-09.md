# Copilot changes - prompt 09

## Full final contents

### `src/features/focus/timerEngine.ts`

```typescript
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
```

### `src/infrastructure/storage/timerStateRepository.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  TimerDurations,
  TimerMode,
  TimerState,
} from '../../features/focus/timerEngine';

export const TIMER_STATE_STORAGE_KEY = 'lumora_timer';
export const TIMER_STATE_SCHEMA_VERSION = 1;

export type PersistedTimerState = { version: number; state: TimerState };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isTimerMode(value: unknown): value is TimerMode {
  return value === 'focus' || value === 'shortBreak' || value === 'longBreak';
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isFiniteInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value)
  );
}

export function isValidTimerState(value: unknown): value is TimerState {
  if (!isPlainObject(value) || !isPlainObject(value.durations)) {
    return false;
  }

  const durations = value.durations as Partial<TimerDurations>;
  return (
    isTimerMode(value.mode) &&
    isPositiveInteger(durations.focus) &&
    isPositiveInteger(durations.shortBreak) &&
    isPositiveInteger(durations.longBreak) &&
    typeof value.isRunning === 'boolean' &&
    typeof value.remainingSeconds === 'number' &&
    Number.isInteger(value.remainingSeconds) &&
    value.remainingSeconds >= 0 &&
    (value.startedAt === undefined || isFiniteInteger(value.startedAt)) &&
    (value.endTime === undefined || isFiniteInteger(value.endTime)) &&
    (value.taskId === undefined ||
      (typeof value.taskId === 'string' && value.taskId.length > 0)) &&
    typeof value.completedFocusSessions === 'number' &&
    Number.isInteger(value.completedFocusSessions) &&
    value.completedFocusSessions >= 0 &&
    typeof value.autoStart === 'boolean'
  );
}

function warnInvalid(reason: string): null {
  console.warn(reason);
  return null;
}

export async function loadTimerState(): Promise<TimerState | null> {
  const storedValue = await AsyncStorage.getItem(TIMER_STATE_STORAGE_KEY);
  if (storedValue === null) {
    return null;
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(storedValue);
  } catch {
    return warnInvalid('Stored timer state is not valid JSON.');
  }

  if (!isPlainObject(parsedValue)) {
    return warnInvalid('Stored timer state has an invalid shape.');
  }

  if (parsedValue.version !== TIMER_STATE_SCHEMA_VERSION) {
    return warnInvalid(
      `Stored timer state uses schema version ${String(parsedValue.version)}; expected version ${TIMER_STATE_SCHEMA_VERSION}. No migration is available.`,
    );
  }

  if (!isValidTimerState(parsedValue.state)) {
    return warnInvalid('Stored timer state has an invalid shape.');
  }

  return parsedValue.state;
}

export async function saveTimerState(state: TimerState): Promise<void> {
  const persisted: PersistedTimerState = {
    version: TIMER_STATE_SCHEMA_VERSION,
    state,
  };
  await AsyncStorage.setItem(
    TIMER_STATE_STORAGE_KEY,
    JSON.stringify(persisted),
  );
}

export async function clearTimerState(): Promise<void> {
  await AsyncStorage.removeItem(TIMER_STATE_STORAGE_KEY);
}
```

### `src/features/focus/useTimer.ts`

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FocusSession } from '../../shared/types/session';
import type { UserSettings } from '../../shared/types/settings';
import {
  loadTimerState,
  saveTimerState,
} from '../../infrastructure/storage/timerStateRepository';
import {
  buildCompletedSession,
  selectRemainingSeconds,
  timerReducer,
  type TimerAction,
  type TimerDurations,
  type TimerState,
} from './timerEngine';

export type UseTimerOptions = {
  settings: UserSettings;
  onSessionComplete?: (session: FocusSession) => Promise<void>;
};

export type UseTimerResult = {
  state: TimerState;
  remainingSeconds: number;
  loading: boolean;
  error?: string;
  start: (taskId?: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  reset: () => Promise<void>;
  stop: () => Promise<void>;
  skipBreak: () => Promise<void>;
  extendBreak: () => Promise<void>;
};

function createInitial(settings: UserSettings): TimerState {
  return {
    mode: 'focus',
    durations: {
      focus: settings.focusDurationSeconds,
      shortBreak: settings.shortBreakSeconds,
      longBreak: settings.longBreakSeconds,
    },
    isRunning: false,
    remainingSeconds: settings.focusDurationSeconds,
    completedFocusSessions: 0,
    autoStart: false,
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useTimer(options: UseTimerOptions): UseTimerResult {
  const [state, setState] = useState<TimerState>(() =>
    createInitial(options.settings),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [, setClockNow] = useState(() => Date.now());
  const stateRef = useRef(state);
  const settingsRef = useRef(options.settings);
  const onSessionCompleteRef = useRef(options.onSessionComplete);
  const idCounter = useRef(0);

  settingsRef.current = options.settings;
  onSessionCompleteRef.current = options.onSessionComplete;

  const durationsFromSettings = useCallback((): TimerDurations => {
    const settings = settingsRef.current;
    return {
      focus: settings.focusDurationSeconds,
      shortBreak: settings.shortBreakSeconds,
      longBreak: settings.longBreakSeconds,
    };
  }, []);

  const dispatch = useCallback(
    async (action: TimerAction): Promise<void> => {
      const prevState = stateRef.current;
      const withCurrentDurations = {
        ...prevState,
        durations: durationsFromSettings(),
      };
      const nextState = timerReducer(withCurrentDurations, action);
      const durationsUnchanged =
        prevState.durations.focus === withCurrentDurations.durations.focus &&
        prevState.durations.shortBreak === withCurrentDurations.durations.shortBreak &&
        prevState.durations.longBreak === withCurrentDurations.durations.longBreak;
      if (nextState === withCurrentDurations && durationsUnchanged) {
        return;
      }

      stateRef.current = nextState;
      setState(nextState);

      try {
        await saveTimerState(nextState);
      } catch (saveError) {
        setError(getErrorMessage(saveError, 'Unable to save timer state.'));
      }

      if (
        action.type === 'tick' &&
        prevState.mode === 'focus' &&
        nextState.mode !== 'focus'
      ) {
        const session = buildCompletedSession(prevState, () => {
          const id = `${Date.now()}-${idCounter.current}`;
          idCounter.current += 1;
          return id;
        });
        const onSessionComplete = onSessionCompleteRef.current;
        if (session !== null && onSessionComplete !== undefined) {
          try {
            await onSessionComplete(session);
          } catch (sessionError) {
            setError(
              getErrorMessage(sessionError, 'Unable to record session.'),
            );
          }
        }
      }
    },
    [durationsFromSettings],
  );

  useEffect(() => {
    let mounted = true;

    const hydrate = async (): Promise<void> => {
      try {
        const loadedState = await loadTimerState();
        if (!mounted) {
          return;
        }

        if (loadedState !== null) {
          stateRef.current = loadedState;
          setState(loadedState);

          if (
            loadedState.isRunning &&
            loadedState.endTime !== undefined &&
            loadedState.endTime <= Date.now()
          ) {
            await dispatch({ type: 'tick', now: Date.now() });
          }
        }
      } catch (loadError) {
        if (mounted) {
          setError(getErrorMessage(loadError, 'Unable to load timer state.'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void hydrate();
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!state.isRunning || state.endTime === undefined) {
      return undefined;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      setClockNow(now);
      void dispatch({ type: 'tick', now });
    }, 1000);

    return () => clearInterval(interval);
  }, [dispatch, state.endTime, state.isRunning]);

  const start = useCallback(
    async (taskId?: string): Promise<void> => {
      if (stateRef.current.isRunning) {
        return;
      }

      await dispatch({ type: 'start', now: Date.now(), taskId });
    },
    [dispatch],
  );

  const pause = useCallback(
    async (): Promise<void> => {
      await dispatch({ type: 'pause', now: Date.now() });
    },
    [dispatch],
  );

  const resume = useCallback(
    async (): Promise<void> => {
      await dispatch({ type: 'resume', now: Date.now() });
    },
    [dispatch],
  );

  const reset = useCallback(
    async (): Promise<void> => {
      await dispatch({ type: 'reset', now: Date.now() });
    },
    [dispatch],
  );

  const stop = useCallback(
    async (): Promise<void> => {
      await dispatch({ type: 'stop', now: Date.now() });
    },
    [dispatch],
  );

  const skipBreak = useCallback(
    async (): Promise<void> => {
      await dispatch({ type: 'skipBreak', now: Date.now() });
    },
    [dispatch],
  );

  const extendBreak = useCallback(
    async (): Promise<void> => {
      await dispatch({ type: 'extendBreak', now: Date.now() });
    },
    [dispatch],
  );

  return {
    state,
    remainingSeconds: selectRemainingSeconds(state, Date.now()),
    loading,
    ...(error === undefined ? {} : { error }),
    start,
    pause,
    resume,
    reset,
    stop,
    skipBreak,
    extendBreak,
  };
}
```

### `src/infrastructure/storage/__tests__/timerStateRepository.test.ts`

```typescript
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearTimerState,
  loadTimerState,
  saveTimerState,
  TIMER_STATE_SCHEMA_VERSION,
  TIMER_STATE_STORAGE_KEY,
} from '../timerStateRepository';
import type { TimerState } from '../../../features/focus/timerEngine';

jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = new Map<string, string>();

  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(storage.get(key) ?? null)),
      setItem: jest.fn((key: string, value: string) => {
        storage.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        storage.delete(key);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        storage.clear();
        return Promise.resolve();
      }),
    },
  };
});

const timerState: TimerState = {
  mode: 'focus',
  durations: { focus: 1500, shortBreak: 300, longBreak: 900 },
  isRunning: false,
  remainingSeconds: 1500,
  completedFocusSessions: 2,
  autoStart: false,
};

const storeValue = async (value: string): Promise<void> => {
  await AsyncStorage.setItem(TIMER_STATE_STORAGE_KEY, value);
  jest.mocked(AsyncStorage.setItem).mockClear();
};

describe('timerStateRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('returns null when there is no stored timer state', async () => {
    await expect(loadTimerState()).resolves.toBeNull();
  });

  it('loads a valid timer state', async () => {
    await storeValue(
      JSON.stringify({ version: TIMER_STATE_SCHEMA_VERSION, state: timerState }),
    );

    await expect(loadTimerState()).resolves.toEqual(timerState);
  });

  it('warns and returns null for malformed JSON', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await storeValue('{not-json');

    await expect(loadTimerState()).resolves.toBeNull();
    expect(warning).toHaveBeenCalledWith(
      'Stored timer state is not valid JSON.',
    );
    warning.mockRestore();
  });

  it('warns and returns null for a mismatched schema version', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await storeValue(JSON.stringify({ version: 99, state: timerState }));

    await expect(loadTimerState()).resolves.toBeNull();
    expect(warning).toHaveBeenCalledWith(
      'Stored timer state uses schema version 99; expected version 1. No migration is available.',
    );
    warning.mockRestore();
  });

  it('warns and returns null for an invalid timer state shape', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await storeValue(
      JSON.stringify({
        version: TIMER_STATE_SCHEMA_VERSION,
        state: { ...timerState, remainingSeconds: -1 },
      }),
    );

    await expect(loadTimerState()).resolves.toBeNull();
    expect(warning).toHaveBeenCalledWith(
      'Stored timer state has an invalid shape.',
    );
    warning.mockRestore();
  });

  it('never calls setItem while loading', async () => {
    await storeValue(
      JSON.stringify({ version: TIMER_STATE_SCHEMA_VERSION, state: timerState }),
    );

    await loadTimerState();

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('saves a timer state with the current schema version', async () => {
    await saveTimerState(timerState);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      TIMER_STATE_STORAGE_KEY,
      JSON.stringify({ version: 1, state: timerState }),
    );
  });

  it('round-trips a saved timer state', async () => {
    await saveTimerState(timerState);

    await expect(loadTimerState()).resolves.toEqual(timerState);
  });

  it('clears the stored timer state', async () => {
    await storeValue(
      JSON.stringify({ version: TIMER_STATE_SCHEMA_VERSION, state: timerState }),
    );

    await clearTimerState();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(TIMER_STATE_STORAGE_KEY);
    await expect(AsyncStorage.getItem(TIMER_STATE_STORAGE_KEY)).resolves.toBeNull();
  });
});
```

### `src/features/focus/__tests__/useTimer.test.tsx`

```tsx
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { createElement } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import type { FocusSession } from '../../../shared/types/session';
import type { UserSettings } from '../../../shared/types/settings';
import {
  clearTimerState,
  loadTimerState,
  saveTimerState,
} from '../../../infrastructure/storage/timerStateRepository';
import { DEFAULT_SETTINGS } from '../../../shared/settings/settingsDefaults';
import type { TimerState } from '../timerEngine';
import { useTimer, type UseTimerResult } from '../useTimer';

jest.mock('../../../infrastructure/storage/timerStateRepository', () => ({
  loadTimerState: jest.fn(),
  saveTimerState: jest.fn(),
  clearTimerState: jest.fn(),
}));

async function renderHook<T>(
  hook: () => T,
): Promise<{ result: { current: T }; renderer: ReactTestRenderer }> {
  const result = { current: undefined as unknown as T };
  function TestComponent() {
    result.current = hook();
    return null;
  }

  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(createElement(TestComponent));
  });
  await act(async () => {
    await Promise.resolve();
  });
  return { result, renderer };
}

const settings: UserSettings = {
  ...DEFAULT_SETTINGS,
  customTags: [],
  focusDurationSeconds: 60,
  shortBreakSeconds: 30,
  longBreakSeconds: 120,
};

function createTimerState(overrides: Partial<TimerState> = {}): TimerState {
  return {
    mode: 'focus',
    durations: {
      focus: settings.focusDurationSeconds,
      shortBreak: settings.shortBreakSeconds,
      longBreak: settings.longBreakSeconds,
    },
    isRunning: false,
    remainingSeconds: settings.focusDurationSeconds,
    completedFocusSessions: 0,
    autoStart: false,
    ...overrides,
  };
}

describe('useTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(100_000);
    jest.mocked(loadTimerState).mockReset();
    jest.mocked(saveTimerState).mockReset();
    jest.mocked(clearTimerState).mockReset();
    jest.mocked(loadTimerState).mockResolvedValue(null);
    jest.mocked(saveTimerState).mockResolvedValue();
    jest.mocked(clearTimerState).mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initial load with no stored state uses settings durations and does not save', async () => {
    const { result, renderer } = await renderHook(() => useTimer({ settings }));

    expect(result.current.state.durations).toEqual({
      focus: 60,
      shortBreak: 30,
      longBreak: 120,
    });
    expect(result.current.loading).toBe(false);
    expect(saveTimerState).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('initial load with a stored paused state restores it', async () => {
    const pausedState = createTimerState({
      remainingSeconds: 27,
      completedFocusSessions: 2,
    });
    jest.mocked(loadTimerState).mockResolvedValue(pausedState);

    const { result, renderer } = await renderHook(() => useTimer({ settings }));

    expect(result.current.state).toBe(pausedState);
    expect(result.current.loading).toBe(false);
    expect(saveTimerState).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('completes an expired stored focus session once on mount', async () => {
    jest.setSystemTime(100_000);
    const expiredState = createTimerState({
      isRunning: true,
      startedAt: 40_000,
      endTime: 100_000,
      taskId: 'task-1',
    });
    const onSessionComplete = jest.fn<(session: FocusSession) => Promise<void>>()
      .mockResolvedValue();
    jest.mocked(loadTimerState).mockResolvedValue(expiredState);

    const { result, renderer } = await renderHook(() =>
      useTimer({ settings, onSessionComplete }),
    );

    expect(result.current.state.mode).toBe('shortBreak');
    expect(result.current.state.isRunning).toBe(false);
    expect(onSessionComplete).toHaveBeenCalledWith({
      id: '100000-0',
      mode: 'focus',
      startedAt: 40_000,
      endedAt: 100_000,
      durationSeconds: 60,
      taskId: 'task-1',
    });
    expect(saveTimerState).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('starts with endTime and saves state', async () => {
    const { result, renderer } = await renderHook(() => useTimer({ settings }));

    await act(async () => result.current.start('task-1'));

    expect(result.current.state.isRunning).toBe(true);
    expect(result.current.state.endTime).toBe(160_000);
    expect(result.current.state.taskId).toBe('task-1');
    expect(saveTimerState).toHaveBeenCalledWith(result.current.state);
    act(() => renderer.unmount());
  });

  it('does not save when start is called while already running', async () => {
    const runningState = createTimerState({
      isRunning: true,
      startedAt: 90_000,
      endTime: 150_000,
    });
    jest.mocked(loadTimerState).mockResolvedValue(runningState);
    const { result, renderer } = await renderHook(() => useTimer({ settings }));
    jest.mocked(saveTimerState).mockClear();

    await act(async () => result.current.start());

    expect(saveTimerState).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('pauses using endTime and saves state', async () => {
    const runningState = createTimerState({
      isRunning: true,
      startedAt: 90_000,
      endTime: 160_000,
    });
    jest.mocked(loadTimerState).mockResolvedValue(runningState);
    const { result, renderer } = await renderHook(() => useTimer({ settings }));

    await act(async () => result.current.pause());

    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.state.remainingSeconds).toBe(60);
    expect(result.current.state.endTime).toBeUndefined();
    expect(saveTimerState).toHaveBeenCalledWith(result.current.state);
    act(() => renderer.unmount());
  });

  it('resumes using remainingSeconds and saves state', async () => {
    const pausedState = createTimerState({ remainingSeconds: 20 });
    jest.mocked(loadTimerState).mockResolvedValue(pausedState);
    const { result, renderer } = await renderHook(() => useTimer({ settings }));

    await act(async () => result.current.resume());

    expect(result.current.state.endTime).toBe(120_000);
    expect(result.current.state.isRunning).toBe(true);
    expect(saveTimerState).toHaveBeenCalledWith(result.current.state);
    act(() => renderer.unmount());
  });

  it('resets to full duration for the current mode and saves', async () => {
    const breakState = createTimerState({
      mode: 'shortBreak',
      isRunning: true,
      startedAt: 90_000,
      endTime: 160_000,
      remainingSeconds: 10,
    });
    jest.mocked(loadTimerState).mockResolvedValue(breakState);
    const { result, renderer } = await renderHook(() => useTimer({ settings }));

    await act(async () => result.current.reset());

    expect(result.current.state.remainingSeconds).toBe(30);
    expect(result.current.state.isRunning).toBe(false);
    expect(saveTimerState).toHaveBeenCalledWith(result.current.state);
    act(() => renderer.unmount());
  });

  it('stops in focus mode, clears taskId, and saves', async () => {
    const breakState = createTimerState({
      mode: 'shortBreak',
      taskId: 'task-1',
      remainingSeconds: 10,
    });
    jest.mocked(loadTimerState).mockResolvedValue(breakState);
    const { result, renderer } = await renderHook(() => useTimer({ settings }));

    await act(async () => result.current.stop());

    expect(result.current.state.mode).toBe('focus');
    expect(result.current.state.taskId).toBeUndefined();
    expect(result.current.state.remainingSeconds).toBe(60);
    expect(saveTimerState).toHaveBeenCalledWith(result.current.state);
    act(() => renderer.unmount());
  });

  it('does not save on ticks before endTime', async () => {
    const runningState = createTimerState({
      isRunning: true,
      startedAt: 90_000,
      endTime: 160_000,
    });
    jest.mocked(loadTimerState).mockResolvedValue(runningState);
    const { result, renderer } = await renderHook(() => useTimer({ settings }));
    jest.mocked(saveTimerState).mockClear();

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(result.current.state).toBe(runningState);
    expect(saveTimerState).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('records a completed focus session', async () => {
    const onSessionComplete = jest.fn<(session: FocusSession) => Promise<void>>()
      .mockResolvedValue();
    const { result, renderer } = await renderHook(() =>
      useTimer({ settings, onSessionComplete }),
    );

    await act(async () => result.current.start('task-1'));
    await act(async () => {
      jest.advanceTimersByTime(60_000);
      await Promise.resolve();
    });

    expect(onSessionComplete).toHaveBeenCalledWith({
      id: '160000-0',
      mode: 'focus',
      startedAt: 100_000,
      endedAt: 160_000,
      durationSeconds: 60,
      taskId: 'task-1',
    });
    act(() => renderer.unmount());
  });

  it('exposes an error when session recording rejects', async () => {
    const onSessionComplete = jest
      .fn<(session: FocusSession) => Promise<void>>()
      .mockRejectedValue(new Error('record failed'));
    const { result, renderer } = await renderHook(() =>
      useTimer({ settings, onSessionComplete }),
    );

    await act(async () => result.current.start());
    await act(async () => {
      jest.advanceTimersByTime(60_000);
      await Promise.resolve();
    });

    expect(result.current.error).toBe('record failed');
    act(() => renderer.unmount());
  });

  it('skips a break into paused focus and saves', async () => {
    const breakState = createTimerState({
      mode: 'longBreak',
      isRunning: true,
      startedAt: 90_000,
      endTime: 220_000,
      remainingSeconds: 120,
    });
    jest.mocked(loadTimerState).mockResolvedValue(breakState);
    const { result, renderer } = await renderHook(() => useTimer({ settings }));

    await act(async () => result.current.skipBreak());

    expect(result.current.state.mode).toBe('focus');
    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.state.remainingSeconds).toBe(60);
    expect(saveTimerState).toHaveBeenCalledWith(result.current.state);
    act(() => renderer.unmount());
  });
});
```

### New test added to `src/features/settings/__tests__/useSettings.test.ts`

The workspace's existing settings test file has the `.test.ts` extension (not `.test.tsx`); the requested test was added to its existing `describe` block.

```typescript
  it('keeps the default when an invalid value is provided', async () => {
    const { result, renderer } = await renderHook(() => useSettings());

    await act(async () => {
      await result.current.updateSettings({ focusDurationSeconds: 99999 });
    });

    expect(result.current.settings.focusDurationSeconds).toBe(
      DEFAULT_SETTINGS.focusDurationSeconds,
    );
    act(() => renderer.unmount());
  });
```

### New `buildCompletedSession` describe block from `src/features/focus/__tests__/timerEngine.test.ts`

```typescript
describe('buildCompletedSession', () => {
    const generateId = () => 'session-1';

    it('returns null for a break mode', () => {
      expect(
        buildCompletedSession(
          createBreakState('shortBreak', { endTime: 100_000 }),
          generateId,
        ),
      ).toBeNull();
    });

    it('returns null when endTime is undefined', () => {
      expect(buildCompletedSession(createState(), generateId)).toBeNull();
    });

    it('builds a session from a completed focus timer', () => {
      const state = createState({
        endTime: 1_510_000,
        taskId: 'task-1',
      });

      expect(buildCompletedSession(state, generateId)).toEqual({
        id: 'session-1',
        mode: 'focus',
        startedAt: 10_000,
        endedAt: 1_510_000,
        durationSeconds: durations.focus,
        taskId: 'task-1',
      });
    });

    it('omits taskTitle for caller resolution', () => {
      const session = buildCompletedSession(
        createState({ endTime: 1_510_000 }),
        generateId,
      );

      expect(session).not.toHaveProperty('taskTitle');
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
| `npm install --save-dev react-test-renderer@19.2.3` | 0 |
| `npm exec tsc -- --noEmit` (initial run; renderer type declarations missing) | 2 |
| `npm install --save-dev @types/react-test-renderer` | 0 |
| `npm exec tsc -- --noEmit` (after installing declarations; initial helper typing issue) | 2 |
| `npm test -- --runInBand` (all tests passed; emitted React `act` cleanup warnings) | 0 |
| `npm exec tsc -- --noEmit` (after fixing test helper) | 0 |
| `npm test -- --runInBand` (after fixing test helper) | 0 |
| `git mv src/features/focus/__tests__/useTimer.test.ts src/features/focus/__tests__/useTimer.test.tsx` | 128 (untracked source; rename was performed with `Move-Item`) |
| `Move-Item -LiteralPath 'src\features\focus\__tests__\useTimer.test.ts' -Destination 'src\features\focus\__tests__\useTimer.test.tsx'` | 0 |
| `npm exec tsc -- --noEmit` (final run) | 0 |
| `npm test -- --runInBand` (final run: 193 tests, 15 suites) | 0 |

## Dependency versions

- `react-test-renderer`: `19.2.3` (direct devDependency; matches React `19.2.3`).
- `@types/react-test-renderer`: `^19.3.0` (devDependency added after strict typecheck reported missing declarations).
