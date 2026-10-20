import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS } from '../../../shared/settings/settingsDefaults';
import type { UserSettings } from '../../../shared/types/settings';
import {
  hydrateSettings,
  loadSettings,
  saveSettings,
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
} from '../settingsRepository';

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

const validSettings: UserSettings = {
  ...DEFAULT_SETTINGS,
  focusDurationSeconds: 1800,
  autoStart: true,
  colorScheme: 'dark',
  customTags: ['work'],
};

const storeValue = async (value: string): Promise<void> => {
  await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, value);
  jest.mocked(AsyncStorage.setItem).mockClear();
};

describe('settingsRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('returns default settings when there is no stored value', async () => {
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('returns settings from a valid stored value', async () => {
    await storeValue(
      JSON.stringify({ version: SETTINGS_SCHEMA_VERSION, settings: validSettings }),
    );

    await expect(loadSettings()).resolves.toEqual(validSettings);
  });

  it('warns and returns defaults for malformed JSON', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await storeValue('{not-json');

    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
    expect(warning).toHaveBeenCalledWith('Stored settings are not valid JSON.');
    warning.mockRestore();
  });

  it('warns and returns defaults for a mismatched schema version', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await storeValue(JSON.stringify({ version: 99, settings: validSettings }));

    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
    expect(warning).toHaveBeenCalledWith(
      'Stored settings use schema version 99; expected version 1. No migration is available.',
    );
    warning.mockRestore();
  });

  it('never calls setItem while loading', async () => {
    await storeValue(
      JSON.stringify({ version: SETTINGS_SCHEMA_VERSION, settings: validSettings }),
    );

    await loadSettings();

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('saves settings with the current schema version', async () => {
    await saveSettings(validSettings);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ version: 1, settings: validSettings }),
    );
  });

  it('round-trips saved settings', async () => {
    await saveSettings(validSettings);

    await expect(loadSettings()).resolves.toEqual(validSettings);
  });

  it('hydrates current-version settings without a warning', async () => {
    await storeValue(
      JSON.stringify({ version: SETTINGS_SCHEMA_VERSION, settings: validSettings }),
    );

    await expect(hydrateSettings()).resolves.toEqual({ settings: validSettings });
  });

  it('returns defaults and a warning when the schema version mismatches', async () => {
    await storeValue(JSON.stringify({ version: 0, settings: validSettings }));

    await expect(hydrateSettings()).resolves.toEqual({
      settings: DEFAULT_SETTINGS,
      warning:
        'Stored settings use schema version 0; expected version 1. No migration is available.',
    });
  });
});
