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
