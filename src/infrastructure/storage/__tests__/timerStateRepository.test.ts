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
