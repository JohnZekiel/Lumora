import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DistractionLogEntry } from '../../shared/types/distraction';
import { isValidDistraction } from '../../shared/distractions/distractionValidation';

export const DISTRACTIONS_STORAGE_KEY = 'lumora_distractions';
export const DISTRACTIONS_SCHEMA_VERSION = 1;

export type PersistedDistractions = {
  version: number;
  distractions: DistractionLogEntry[];
};
export type DistractionsHydration = {
  distractions: DistractionLogEntry[];
  warning?: string;
};

function fallback(warning: string): DistractionsHydration {
  return { distractions: [], warning };
}

async function readDistractions(): Promise<DistractionsHydration> {
  const storedValue = await AsyncStorage.getItem(DISTRACTIONS_STORAGE_KEY);
  if (storedValue === null) {
    return { distractions: [] };
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(storedValue);
  } catch {
    return fallback('Stored distractions are not valid JSON.');
  }

  if (typeof parsedValue !== 'object' || parsedValue === null) {
    return fallback('Stored distractions have an invalid shape.');
  }

  const persisted = parsedValue as Record<string, unknown>;
  if (
    typeof persisted.version !== 'number' ||
    !Array.isArray(persisted.distractions) ||
    !persisted.distractions.every(isValidDistraction)
  ) {
    return fallback('Stored distractions have an invalid shape.');
  }

  if (persisted.version !== DISTRACTIONS_SCHEMA_VERSION) {
    return fallback(
      `Stored distractions use schema version ${persisted.version}; expected version ${DISTRACTIONS_SCHEMA_VERSION}. No migration is available.`,
    );
  }

  return { distractions: persisted.distractions };
}

export async function loadDistractions(): Promise<DistractionLogEntry[]> {
  const result = await readDistractions();
  if (result.warning !== undefined) {
    console.warn(result.warning);
  }

  return result.distractions;
}

export async function saveDistractions(
  distractions: DistractionLogEntry[],
): Promise<void> {
  const persisted: PersistedDistractions = {
    version: DISTRACTIONS_SCHEMA_VERSION,
    distractions,
  };
  await AsyncStorage.setItem(
    DISTRACTIONS_STORAGE_KEY,
    JSON.stringify(persisted),
  );
}

export async function hydrateDistractions(): Promise<DistractionsHydration> {
  return readDistractions();
}
