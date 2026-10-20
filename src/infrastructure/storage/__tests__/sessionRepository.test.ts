import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FocusSession } from '../../../shared/types/session';
import {
  hydrateSessions,
  loadSessions,
  saveSessions,
  SESSIONS_SCHEMA_VERSION,
  SESSIONS_STORAGE_KEY,
} from '../sessionRepository';

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

const sessions: FocusSession[] = [
  {
    id: 'session-1',
    mode: 'focus',
    startedAt: 1000,
    endedAt: 61_000,
    durationSeconds: 60,
  },
  {
    id: 'session-2',
    mode: 'shortBreak',
    startedAt: 61_000,
    endedAt: 91_000,
    durationSeconds: 30,
    taskId: 'task-1',
    taskTitle: 'Write tests',
  },
];

const storeValue = async (value: string): Promise<void> => {
  await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, value);
  jest.mocked(AsyncStorage.setItem).mockClear();
};

describe('sessionRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('returns an empty array when there is no stored value', async () => {
    await expect(loadSessions()).resolves.toEqual([]);
  });

  it('returns valid sessions in their stored order', async () => {
    await storeValue(
      JSON.stringify({ version: SESSIONS_SCHEMA_VERSION, sessions }),
    );

    await expect(loadSessions()).resolves.toEqual(sessions);
  });

  it('warns and returns an empty array for malformed JSON', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await storeValue('{not-json');

    await expect(loadSessions()).resolves.toEqual([]);
    expect(warning).toHaveBeenCalledWith('Stored sessions are not valid JSON.');
    warning.mockRestore();
  });

  it('warns and returns an empty array for a mismatched schema version', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await storeValue(JSON.stringify({ version: 99, sessions }));

    await expect(loadSessions()).resolves.toEqual([]);
    expect(warning).toHaveBeenCalledWith(
      'Stored sessions use schema version 99; expected version 1. No migration is available.',
    );
    warning.mockRestore();
  });

  it('warns and returns an empty array when any session is invalid', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const invalidSessions = [sessions[0], { ...sessions[1], startedAt: undefined }];
    await storeValue(
      JSON.stringify({ version: SESSIONS_SCHEMA_VERSION, sessions: invalidSessions }),
    );

    await expect(loadSessions()).resolves.toEqual([]);
    expect(warning).toHaveBeenCalledWith('Stored sessions have an invalid shape.');
    warning.mockRestore();
  });

  it('never calls setItem while loading', async () => {
    await storeValue(
      JSON.stringify({ version: SESSIONS_SCHEMA_VERSION, sessions }),
    );

    await loadSessions();

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('saves sessions with the current schema version', async () => {
    await saveSessions(sessions);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      SESSIONS_STORAGE_KEY,
      JSON.stringify({ version: 1, sessions }),
    );
  });

  it('round-trips saved sessions', async () => {
    await saveSessions(sessions);

    await expect(loadSessions()).resolves.toEqual(sessions);
  });

  it('hydrates current-version sessions without a warning', async () => {
    await storeValue(
      JSON.stringify({ version: SESSIONS_SCHEMA_VERSION, sessions }),
    );

    await expect(hydrateSessions()).resolves.toEqual({ sessions });
  });

  it('returns an empty array and warning for an unsupported version', async () => {
    await storeValue(JSON.stringify({ version: 0, sessions }));

    await expect(hydrateSessions()).resolves.toEqual({
      sessions: [],
      warning:
        'Stored sessions use schema version 0; expected version 1. No migration is available.',
    });
  });
});
