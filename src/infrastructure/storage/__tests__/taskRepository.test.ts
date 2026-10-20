import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TaskItem } from '../../../shared/types/task';
import {
  hydrateTasks,
  loadTasks,
  saveTasks,
  SCHEMA_VERSION,
  STORAGE_KEY,
  type PersistedTasks,
} from '../taskRepository';

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

const sampleTask: TaskItem = {
  id: 'task-1',
  title: 'Review notes',
  priority: 'medium',
  steps: [],
  createdAt: 1_750_000_000_000,
};

const storeValue = async (value: string): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, value);
  jest.mocked(AsyncStorage.setItem).mockClear();
};

describe('taskRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('returns an empty array when there is no stored value', async () => {
    await expect(loadTasks()).resolves.toEqual([]);
  });

  it('returns tasks from a valid stored value', async () => {
    await storeValue(
      JSON.stringify({ version: SCHEMA_VERSION, tasks: [sampleTask] }),
    );

    await expect(loadTasks()).resolves.toEqual([sampleTask]);
  });

  it('returns an empty array and warns for malformed JSON', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await storeValue('{not-json');

    await expect(loadTasks()).resolves.toEqual([]);
    expect(warning).toHaveBeenCalledWith('Stored tasks are not valid JSON.');

    warning.mockRestore();
  });

  it('returns an empty array and warns for an invalid stored shape', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await storeValue(JSON.stringify({ version: SCHEMA_VERSION, tasks: 'not-array' }));

    await expect(loadTasks()).resolves.toEqual([]);
    expect(warning).toHaveBeenCalledWith('Stored tasks have an invalid shape.');

    warning.mockRestore();
  });

  it('returns an empty array and warns for an unsupported version', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await storeValue(JSON.stringify({ version: 99, tasks: [sampleTask] }));

    await expect(loadTasks()).resolves.toEqual([]);
    expect(warning).toHaveBeenCalledWith(
      'Stored tasks use schema version 99; expected version 1. No migration is available.',
    );

    warning.mockRestore();
  });

  it('never calls setItem while loading', async () => {
    await storeValue(JSON.stringify({ version: SCHEMA_VERSION, tasks: [sampleTask] }));

    await loadTasks();

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('saves tasks with the current persisted schema version', async () => {
    await saveTasks([sampleTask]);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify({ version: SCHEMA_VERSION, tasks: [sampleTask] }),
    );
  });

  it('round-trips saved tasks', async () => {
    await saveTasks([sampleTask]);

    await expect(loadTasks()).resolves.toEqual([sampleTask]);
  });

  it('hydrates current-version tasks without migration', async () => {
    await storeValue(
      JSON.stringify({ version: SCHEMA_VERSION, tasks: [sampleTask] }),
    );

    await expect(hydrateTasks()).resolves.toEqual({
      tasks: [sampleTask],
      migrated: false,
    });
  });

  it('reports a stale version as needing migration without overwriting it', async () => {
    const warning = `Stored tasks use schema version 0; expected version ${SCHEMA_VERSION}. No migration is available.`;
    const persisted: PersistedTasks = { version: 0, tasks: [sampleTask] };
    const storedValue = JSON.stringify(persisted);
    await storeValue(storedValue);

    await expect(hydrateTasks()).resolves.toEqual({
      tasks: [],
      migrated: true,
      warning,
    });
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    await expect(AsyncStorage.getItem(STORAGE_KEY)).resolves.toBe(storedValue);
  });
});
