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
