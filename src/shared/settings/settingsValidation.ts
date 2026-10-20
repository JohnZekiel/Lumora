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
