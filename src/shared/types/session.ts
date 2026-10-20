export type SessionMode = 'focus' | 'shortBreak' | 'longBreak';

export type FocusSession = {
  id: string;
  mode: SessionMode;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  taskId?: string;
  taskTitle?: string;
};
