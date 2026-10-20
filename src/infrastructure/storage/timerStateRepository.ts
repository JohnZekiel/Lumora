import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  TimerDurations,
  TimerMode,
  TimerState,
} from '../../features/focus/timerEngine';

export const TIMER_STATE_STORAGE_KEY = 'lumora_timer';
export const TIMER_STATE_SCHEMA_VERSION = 1;

export type PersistedTimerState = { version: number; state: TimerState };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isTimerMode(value: unknown): value is TimerMode {
  return value === 'focus' || value === 'shortBreak' || value === 'longBreak';
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isFiniteInteger(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value)
  );
}

export function isValidTimerState(value: unknown): value is TimerState {
  if (!isPlainObject(value) || !isPlainObject(value.durations)) {
    return false;
  }

  const durations = value.durations as Partial<TimerDurations>;
  return (
    isTimerMode(value.mode) &&
    isPositiveInteger(durations.focus) &&
    isPositiveInteger(durations.shortBreak) &&
    isPositiveInteger(durations.longBreak) &&
    typeof value.isRunning === 'boolean' &&
    typeof value.remainingSeconds === 'number' &&
    Number.isInteger(value.remainingSeconds) &&
    value.remainingSeconds >= 0 &&
    (value.startedAt === undefined || isFiniteInteger(value.startedAt)) &&
    (value.endTime === undefined || isFiniteInteger(value.endTime)) &&
    (value.taskId === undefined ||
      (typeof value.taskId === 'string' && value.taskId.length > 0)) &&
    typeof value.completedFocusSessions === 'number' &&
    Number.isInteger(value.completedFocusSessions) &&
    value.completedFocusSessions >= 0 &&
    typeof value.autoStart === 'boolean'
  );
}

function warnInvalid(reason: string): null {
  console.warn(reason);
  return null;
}

export async function loadTimerState(): Promise<TimerState | null> {
  const storedValue = await AsyncStorage.getItem(TIMER_STATE_STORAGE_KEY);
  if (storedValue === null) {
    return null;
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(storedValue);
  } catch {
    return warnInvalid('Stored timer state is not valid JSON.');
  }

  if (!isPlainObject(parsedValue)) {
    return warnInvalid('Stored timer state has an invalid shape.');
  }

  if (parsedValue.version !== TIMER_STATE_SCHEMA_VERSION) {
    return warnInvalid(
      `Stored timer state uses schema version ${String(parsedValue.version)}; expected version ${TIMER_STATE_SCHEMA_VERSION}. No migration is available.`,
    );
  }

  if (!isValidTimerState(parsedValue.state)) {
    return warnInvalid('Stored timer state has an invalid shape.');
  }

  return parsedValue.state;
}

export async function saveTimerState(state: TimerState): Promise<void> {
  const persisted: PersistedTimerState = {
    version: TIMER_STATE_SCHEMA_VERSION,
    state,
  };
  await AsyncStorage.setItem(
    TIMER_STATE_STORAGE_KEY,
    JSON.stringify(persisted),
  );
}

export async function clearTimerState(): Promise<void> {
  await AsyncStorage.removeItem(TIMER_STATE_STORAGE_KEY);
}
