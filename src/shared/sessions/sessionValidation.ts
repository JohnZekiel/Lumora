import type { FocusSession, SessionMode } from '../types/session';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isSessionMode(value: unknown): value is SessionMode {
  return value === 'focus' || value === 'shortBreak' || value === 'longBreak';
}

function isOptionalNonEmptyString(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === 'string' && value.length > 0);
}

export function isValidSession(value: unknown): value is FocusSession {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    isSessionMode(value.mode) &&
    typeof value.startedAt === 'number' &&
    Number.isFinite(value.startedAt) &&
    Number.isInteger(value.startedAt) &&
    typeof value.endedAt === 'number' &&
    Number.isFinite(value.endedAt) &&
    Number.isInteger(value.endedAt) &&
    value.endedAt >= value.startedAt &&
    typeof value.durationSeconds === 'number' &&
    Number.isInteger(value.durationSeconds) &&
    value.durationSeconds > 0 &&
    isOptionalNonEmptyString(value.taskId) &&
    isOptionalNonEmptyString(value.taskTitle)
  );
}
