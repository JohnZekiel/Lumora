# Copilot changes - prompt 06

## Full final contents

### `src/shared/types/settings.ts`

```typescript
export type ThemeColor = 'lavender' | 'sage' | 'peach' | 'sky' | 'rose';
export type ColorScheme = 'light' | 'dark' | 'system';
export type CompletionTone = 'off' | 'calmChime' | 'softBell' | 'gentlePiano';

export type UserSettings = {
  focusDurationSeconds: number;
  shortBreakSeconds: number;
  longBreakSeconds: number;
  autoStart: boolean;
  notificationsEnabled: boolean;
  notificationSound: boolean;
  doNotDisturb: boolean;
  colorScheme: ColorScheme;
  themeColor: ThemeColor;
  voiceEnabled: boolean;
  ambientSoundEnabled: boolean;
  completionTone: CompletionTone;
  customTags: string[];
  reminderIntervalMinutes: number;
};
```

### `src/shared/settings/settingsDefaults.ts`

```typescript
import type { UserSettings } from '../types/settings';

export const DEFAULT_SETTINGS: UserSettings = {
  focusDurationSeconds: 1500,
  shortBreakSeconds: 300,
  longBreakSeconds: 900,
  autoStart: false,
  notificationsEnabled: false,
  notificationSound: true,
  doNotDisturb: false,
  colorScheme: 'system',
  themeColor: 'lavender',
  voiceEnabled: false,
  ambientSoundEnabled: false,
  completionTone: 'off',
  customTags: [],
  reminderIntervalMinutes: 0,
};
```

### `src/shared/settings/settingsValidation.ts`

```typescript
import type {
  ColorScheme,
  CompletionTone,
  ThemeColor,
  UserSettings,
} from '../types/settings';
import { DEFAULT_SETTINGS } from './settingsDefaults';

export function isValidFocusDuration(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 60 && n <= 3600;
}

export function isValidBreakDuration(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 60 && n <= 7200;
}

export function isValidReminderInterval(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 1440;
}

export function isValidTag(t: string): boolean {
  const trimmedTag = t.trim();
  return trimmedTag.length >= 1 && trimmedTag.length <= 30;
}

export function isValidThemeColor(t: unknown): t is ThemeColor {
  return (
    t === 'lavender' ||
    t === 'sage' ||
    t === 'peach' ||
    t === 'sky' ||
    t === 'rose'
  );
}

export function isValidColorScheme(c: unknown): c is ColorScheme {
  return c === 'light' || c === 'dark' || c === 'system';
}

export function isValidCompletionTone(t: unknown): t is CompletionTone {
  return (
    t === 'off' ||
    t === 'calmChime' ||
    t === 'softBell' ||
    t === 'gentlePiano'
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function validateSettings(value: unknown): UserSettings | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const settings: UserSettings = {
    focusDurationSeconds: isValidFocusDuration(value.focusDurationSeconds)
      ? value.focusDurationSeconds
      : DEFAULT_SETTINGS.focusDurationSeconds,
    shortBreakSeconds: isValidBreakDuration(value.shortBreakSeconds)
      ? value.shortBreakSeconds
      : DEFAULT_SETTINGS.shortBreakSeconds,
    longBreakSeconds: isValidBreakDuration(value.longBreakSeconds)
      ? value.longBreakSeconds
      : DEFAULT_SETTINGS.longBreakSeconds,
    autoStart: isBoolean(value.autoStart)
      ? value.autoStart
      : DEFAULT_SETTINGS.autoStart,
    notificationsEnabled: isBoolean(value.notificationsEnabled)
      ? value.notificationsEnabled
      : DEFAULT_SETTINGS.notificationsEnabled,
    notificationSound: isBoolean(value.notificationSound)
      ? value.notificationSound
      : DEFAULT_SETTINGS.notificationSound,
    doNotDisturb: isBoolean(value.doNotDisturb)
      ? value.doNotDisturb
      : DEFAULT_SETTINGS.doNotDisturb,
    colorScheme: isValidColorScheme(value.colorScheme)
      ? value.colorScheme
      : DEFAULT_SETTINGS.colorScheme,
    themeColor: isValidThemeColor(value.themeColor)
      ? value.themeColor
      : DEFAULT_SETTINGS.themeColor,
    voiceEnabled: isBoolean(value.voiceEnabled)
      ? value.voiceEnabled
      : DEFAULT_SETTINGS.voiceEnabled,
    ambientSoundEnabled: isBoolean(value.ambientSoundEnabled)
      ? value.ambientSoundEnabled
      : DEFAULT_SETTINGS.ambientSoundEnabled,
    completionTone: isValidCompletionTone(value.completionTone)
      ? value.completionTone
      : DEFAULT_SETTINGS.completionTone,
    customTags: Array.isArray(value.customTags)
      ? value.customTags.filter(
          (tag): tag is string => typeof tag === 'string' && isValidTag(tag),
        ).map((tag) => tag.trim())
      : [],
    reminderIntervalMinutes: isValidReminderInterval(
      value.reminderIntervalMinutes,
    )
      ? value.reminderIntervalMinutes
      : DEFAULT_SETTINGS.reminderIntervalMinutes,
  };

  return settings;
}
```

### `src/infrastructure/storage/settingsRepository.ts`

```typescript
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
```

### `src/shared/settings/__tests__/settingsValidation.test.ts`

```typescript
import { describe, expect, it } from '@jest/globals';
import {
  isValidBreakDuration,
  isValidColorScheme,
  isValidCompletionTone,
  isValidFocusDuration,
  isValidReminderInterval,
  isValidTag,
  isValidThemeColor,
  validateSettings,
} from '../settingsValidation';
import { DEFAULT_SETTINGS } from '../settingsDefaults';
import type { UserSettings } from '../../types/settings';

describe('isValidFocusDuration', () => {
  it.each([60, 1500, 3600])('accepts %s', (value) => {
    expect(isValidFocusDuration(value)).toBe(true);
  });

  it.each([59, 3601, 1500.5, '1500', null, undefined])(
    'rejects %s',
    (value) => {
      expect(isValidFocusDuration(value)).toBe(false);
    },
  );
});

describe('isValidBreakDuration', () => {
  it.each([60, 300, 7200])('accepts %s', (value) => {
    expect(isValidBreakDuration(value)).toBe(true);
  });

  it.each([59, 7201, 300.5])('rejects %s', (value) => {
    expect(isValidBreakDuration(value)).toBe(false);
  });
});

describe('isValidReminderInterval', () => {
  it.each([0, 30, 1440])('accepts %s', (value) => {
    expect(isValidReminderInterval(value)).toBe(true);
  });

  it.each([-1, 1441, 12.5])('rejects %s', (value) => {
    expect(isValidReminderInterval(value)).toBe(false);
  });
});

describe('isValidTag', () => {
  it.each(['work', ' work '])('accepts %j', (value) => {
    expect(isValidTag(value)).toBe(true);
  });

  it.each(['   ', 'a'.repeat(31)])('rejects %j', (value) => {
    expect(isValidTag(value)).toBe(false);
  });
});

describe('enum validators', () => {
  it('checks supported theme colors, color schemes, and completion tones', () => {
    expect(isValidThemeColor('lavender')).toBe(true);
    expect(isValidThemeColor('blue')).toBe(false);
    expect(isValidColorScheme('system')).toBe(true);
    expect(isValidColorScheme('auto')).toBe(false);
    expect(isValidCompletionTone('gentlePiano')).toBe(true);
    expect(isValidCompletionTone('loud')).toBe(false);
  });
});

describe('validateSettings', () => {
  it('returns a complete valid settings object unchanged', () => {
    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      focusDurationSeconds: 1800,
      shortBreakSeconds: 600,
      longBreakSeconds: 1200,
      autoStart: true,
      notificationsEnabled: true,
      notificationSound: false,
      doNotDisturb: true,
      colorScheme: 'dark',
      themeColor: 'sage',
      voiceEnabled: true,
      ambientSoundEnabled: true,
      completionTone: 'softBell',
      customTags: ['work', 'home'],
      reminderIntervalMinutes: 30,
    };

    expect(validateSettings(settings)).toEqual(settings);
  });

  it('returns defaults for an empty object', () => {
    expect(validateSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps the invalid focus default while preserving other valid fields', () => {
    expect(
      validateSettings({
        focusDurationSeconds: 99999,
        autoStart: true,
        themeColor: 'peach',
      }),
    ).toEqual({
      ...DEFAULT_SETTINGS,
      autoStart: true,
      themeColor: 'peach',
    });
  });

  it('returns null for a non-object value', () => {
    expect(validateSettings('not-an-object')).toBeNull();
  });

  it('drops unknown extra fields', () => {
    const result = validateSettings({ focusDurationSeconds: 900, extra: 'x' });

    expect(result).toEqual({
      ...DEFAULT_SETTINGS,
      focusDurationSeconds: 900,
    });
    expect(result).not.toHaveProperty('extra');
  });

  it('filters and trims invalid custom tags', () => {
    expect(
      validateSettings({
        customTags: ['ok', '', 'a'.repeat(31), '  bad  '],
      })?.customTags,
    ).toEqual(['ok', 'bad']);
  });
});
```

### `src/infrastructure/storage/__tests__/settingsRepository.test.ts`

```typescript
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
```

## Commands and exit status

| Command | Exit status |
|---|---:|
| `npm exec tsc -- --noEmit` | 0 |
| `npm test -- --runInBand` | 0 |
