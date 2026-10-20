import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FocusSession } from '../../shared/types/session';
import { isValidSession } from '../../shared/sessions/sessionValidation';

export const SESSIONS_STORAGE_KEY = 'lumora_sessions';
export const SESSIONS_SCHEMA_VERSION = 1;

export type PersistedSessions = { version: number; sessions: FocusSession[] };
export type SessionsHydration = { sessions: FocusSession[]; warning?: string };

function fallback(warning: string): SessionsHydration {
  return { sessions: [], warning };
}

async function readSessions(): Promise<SessionsHydration> {
  const storedValue = await AsyncStorage.getItem(SESSIONS_STORAGE_KEY);
  if (storedValue === null) {
    return { sessions: [] };
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(storedValue);
  } catch {
    return fallback('Stored sessions are not valid JSON.');
  }

  if (typeof parsedValue !== 'object' || parsedValue === null) {
    return fallback('Stored sessions have an invalid shape.');
  }

  const persisted = parsedValue as Record<string, unknown>;
  if (
    typeof persisted.version !== 'number' ||
    !Array.isArray(persisted.sessions) ||
    !persisted.sessions.every(isValidSession)
  ) {
    return fallback('Stored sessions have an invalid shape.');
  }

  if (persisted.version !== SESSIONS_SCHEMA_VERSION) {
    return fallback(
      `Stored sessions use schema version ${persisted.version}; expected version ${SESSIONS_SCHEMA_VERSION}. No migration is available.`,
    );
  }

  return { sessions: persisted.sessions };
}

export async function loadSessions(): Promise<FocusSession[]> {
  const result = await readSessions();
  if (result.warning !== undefined) {
    console.warn(result.warning);
  }

  return result.sessions;
}

export async function saveSessions(sessions: FocusSession[]): Promise<void> {
  const persisted: PersistedSessions = {
    version: SESSIONS_SCHEMA_VERSION,
    sessions,
  };
  await AsyncStorage.setItem(
    SESSIONS_STORAGE_KEY,
    JSON.stringify(persisted),
  );
}

export async function hydrateSessions(): Promise<SessionsHydration> {
  return readSessions();
}
