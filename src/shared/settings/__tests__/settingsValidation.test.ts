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
