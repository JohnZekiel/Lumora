import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserSettings } from '../../shared/types/settings';
import { DEFAULT_SETTINGS } from '../../shared/settings/settingsDefaults';
import { validateSettings } from '../../shared/settings/settingsValidation';

export const SETTINGS_STORAGE_KEY = 'lumora_settings';
export const SETTINGS_SCHEMA_VERSION = 1;

export type PersistedSettings = { version: number; settings: UserSettings };
export type SettingsHydration = { settings: UserSettings; warning?: string };

function fallback(warning: string): SettingsHydration {
  return {
    settings: { ...DEFAULT_SETTINGS, customTags: [] },
    warning,
  };
}

async function readSettings(): Promise<SettingsHydration> {
  const storedValue = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
  if (storedValue === null) {
    return { settings: { ...DEFAULT_SETTINGS, customTags: [] } };
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(storedValue);
  } catch {
    return fallback('Stored settings are not valid JSON.');
  }

  if (typeof parsedValue !== 'object' || parsedValue === null) {
    return fallback('Stored settings have an invalid shape.');
  }

  const persisted = parsedValue as Record<string, unknown>;
  if (typeof persisted.version !== 'number' || persisted.settings === undefined) {
    return fallback('Stored settings have an invalid shape.');
  }

  if (persisted.version !== SETTINGS_SCHEMA_VERSION) {
    return fallback(
      `Stored settings use schema version ${persisted.version}; expected version ${SETTINGS_SCHEMA_VERSION}. No migration is available.`,
    );
  }

  const settings = validateSettings(persisted.settings);
  if (settings === null) {
    return fallback('Stored settings have an invalid shape.');
  }

  return { settings };
}

export async function loadSettings(): Promise<UserSettings> {
  const result = await readSettings();
  if (result.warning !== undefined) {
    console.warn(result.warning);
  }

  return result.settings;
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  const persisted: PersistedSettings = {
    version: SETTINGS_SCHEMA_VERSION,
    settings,
  };
  await AsyncStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify(persisted),
  );
}

export async function hydrateSettings(): Promise<SettingsHydration> {
  return readSettings();
}
