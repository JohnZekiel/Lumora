import type { DistractionLogEntry } from '../types/distraction';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isOptionalNonEmptyString(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === 'string' && value.length > 0);
}

export function isValidDistraction(
  value: unknown,
): value is DistractionLogEntry {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.timestamp === 'number' &&
    Number.isFinite(value.timestamp) &&
    Number.isInteger(value.timestamp) &&
    typeof value.note === 'string' &&
    value.note.trim().length >= 1 &&
    value.note.trim().length <= 200 &&
    isOptionalNonEmptyString(value.taskTitle)
  );
}
