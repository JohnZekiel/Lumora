import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DistractionLogEntry } from '../../../shared/types/distraction';
import {
  DISTRACTIONS_SCHEMA_VERSION,
  DISTRACTIONS_STORAGE_KEY,
  hydrateDistractions,
  loadDistractions,
  saveDistractions,
} from '../distractionRepository';

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

const distractions: DistractionLogEntry[] = [
  {
    id: 'distraction-1',
    timestamp: 1_750_000_000_000,
    note: 'Check a message',
  },
  {
    id: 'distraction-2',
    timestamp: 1_750_000_060_000,
    note: 'Take a call',
    taskTitle: 'Write tests',
  },
];

const storeValue = async (value: string): Promise<void> => {
  await AsyncStorage.setItem(DISTRACTIONS_STORAGE_KEY, value);
  jest.mocked(AsyncStorage.setItem).mockClear();
};

describe('distractionRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('returns an empty array when there is no stored value', async () => {
    await expect(loadDistractions()).resolves.toEqual([]);
  });

  it('returns valid distractions in their stored order', async () => {
    await storeValue(
      JSON.stringify({
        version: DISTRACTIONS_SCHEMA_VERSION,
        distractions,
      }),
    );

    await expect(loadDistractions()).resolves.toEqual(distractions);
  });

  it('warns and returns an empty array for malformed JSON', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await storeValue('{not-json');

    await expect(loadDistractions()).resolves.toEqual([]);
    expect(warning).toHaveBeenCalledWith(
      'Stored distractions are not valid JSON.',
    );
    warning.mockRestore();
  });

  it('warns and returns an empty array for a mismatched schema version', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await storeValue(JSON.stringify({ version: 99, distractions }));

    await expect(loadDistractions()).resolves.toEqual([]);
    expect(warning).toHaveBeenCalledWith(
      'Stored distractions use schema version 99; expected version 1. No migration is available.',
    );
    warning.mockRestore();
  });

  it('warns and returns an empty array when any entry is invalid', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const invalidDistractions = [
      distractions[0],
      { ...distractions[1], note: '' },
    ];
    await storeValue(
      JSON.stringify({
        version: DISTRACTIONS_SCHEMA_VERSION,
        distractions: invalidDistractions,
      }),
    );

    await expect(loadDistractions()).resolves.toEqual([]);
    expect(warning).toHaveBeenCalledWith(
      'Stored distractions have an invalid shape.',
    );
    warning.mockRestore();
  });

  it('never calls setItem while loading', async () => {
    await storeValue(
      JSON.stringify({
        version: DISTRACTIONS_SCHEMA_VERSION,
        distractions,
      }),
    );

    await loadDistractions();

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('saves distractions with the current schema version', async () => {
    await saveDistractions(distractions);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      DISTRACTIONS_STORAGE_KEY,
      JSON.stringify({ version: 1, distractions }),
    );
  });

  it('round-trips saved distractions', async () => {
    await saveDistractions(distractions);

    await expect(loadDistractions()).resolves.toEqual(distractions);
  });

  it('hydrates current-version distractions without a warning', async () => {
    await storeValue(
      JSON.stringify({
        version: DISTRACTIONS_SCHEMA_VERSION,
        distractions,
      }),
    );

    await expect(hydrateDistractions()).resolves.toEqual({ distractions });
  });

  it('returns an empty array and warning for an unsupported version', async () => {
    await storeValue(JSON.stringify({ version: 0, distractions }));

    await expect(hydrateDistractions()).resolves.toEqual({
      distractions: [],
      warning:
        'Stored distractions use schema version 0; expected version 1. No migration is available.',
    });
  });
});
