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

  useEffect(() => {
    const newDurations = durationsFromSettings();
    const prev = stateRef.current;
    const nextState: TimerState =
      !prev.isRunning &&
      prev.endTime === undefined &&
      prev.remainingSeconds === prev.durations[prev.mode]
        ? {
            ...prev,
            durations: newDurations,
            remainingSeconds: newDurations[prev.mode],
          }
        : {
            ...prev,
            durations: newDurations,
          };

    stateRef.current = nextState;
    setState(nextState);
  }, [options.settings, durationsFromSettings]);

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
