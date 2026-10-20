# Copilot changes - prompt 07

## Full final contents

### `src/shared/types/session.ts`

```typescript
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
```

### `src/shared/types/distraction.ts`

```typescript
export type DistractionLogEntry = {
  id: string;
  timestamp: number;
  note: string;
  taskTitle?: string;
};
```

### `src/shared/sessions/sessionValidation.ts`

```typescript
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
```

### `src/shared/distractions/distractionValidation.ts`

```typescript
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
```

### `src/infrastructure/storage/sessionRepository.ts`

```typescript
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
```

### `src/infrastructure/storage/distractionRepository.ts`

```typescript
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
```

### `src/shared/sessions/__tests__/sessionValidation.test.ts`

```typescript
import { describe, expect, it } from '@jest/globals';
import { isValidSession } from '../sessionValidation';
import type { FocusSession } from '../../types/session';

const validSession: FocusSession = {
  id: 'session-1',
  mode: 'focus',
  startedAt: 1000,
  endedAt: 61_000,
  durationSeconds: 60,
};

describe('isValidSession', () => {
  it('accepts a minimal valid focus session', () => {
    expect(isValidSession(validSession)).toBe(true);
  });

  it('accepts a session with task details', () => {
    expect(
      isValidSession({
        ...validSession,
        taskId: 'task-1',
        taskTitle: 'Write tests',
      }),
    ).toBe(true);
  });

  it('rejects a non-object', () => {
    expect(isValidSession('not-an-object')).toBe(false);
  });

  it('rejects an empty id', () => {
    expect(isValidSession({ ...validSession, id: '' })).toBe(false);
  });

  it('rejects an unknown mode', () => {
    expect(isValidSession({ ...validSession, mode: 'break' })).toBe(false);
  });

  it('rejects an end time before the start time', () => {
    expect(
      isValidSession({ ...validSession, startedAt: 2000, endedAt: 1000 }),
    ).toBe(false);
  });

  it.each([0, -1, 1.5])('rejects durationSeconds %s', (durationSeconds) => {
    expect(isValidSession({ ...validSession, durationSeconds })).toBe(false);
  });

  it('rejects an empty defined task title', () => {
    expect(isValidSession({ ...validSession, taskTitle: '' })).toBe(false);
  });
});
```

### `src/shared/distractions/__tests__/distractionValidation.test.ts`

```typescript
import { describe, expect, it } from '@jest/globals';
import { isValidDistraction } from '../distractionValidation';
import type { DistractionLogEntry } from '../../types/distraction';

const validDistraction: DistractionLogEntry = {
  id: 'distraction-1',
  timestamp: 1_750_000_000_000,
  note: 'Check a message',
};

describe('isValidDistraction', () => {
  it('accepts a valid entry without a task title', () => {
    expect(isValidDistraction(validDistraction)).toBe(true);
  });

  it('accepts a valid entry with a task title', () => {
    expect(
      isValidDistraction({ ...validDistraction, taskTitle: 'Write tests' }),
    ).toBe(true);
  });

  it('rejects a non-object', () => {
    expect(isValidDistraction('not-an-object')).toBe(false);
  });

  it('rejects an empty id', () => {
    expect(isValidDistraction({ ...validDistraction, id: '' })).toBe(false);
  });

  it('rejects a non-integer timestamp', () => {
    expect(
      isValidDistraction({ ...validDistraction, timestamp: 1.5 }),
    ).toBe(false);
  });

  it('rejects an empty note', () => {
    expect(isValidDistraction({ ...validDistraction, note: '   ' })).toBe(false);
  });

  it('rejects a note longer than 200 characters', () => {
    expect(
      isValidDistraction({ ...validDistraction, note: 'a'.repeat(201) }),
    ).toBe(false);
  });

  it('rejects an empty defined task title', () => {
    expect(
      isValidDistraction({ ...validDistraction, taskTitle: '' }),
    ).toBe(false);
  });
});
```

### `src/infrastructure/storage/__tests__/sessionRepository.test.ts`

```typescript
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FocusSession } from '../../../shared/types/session';
import {
  hydrateSessions,
  loadSessions,
  saveSessions,
  SESSIONS_SCHEMA_VERSION,
  SESSIONS_STORAGE_KEY,
} from '../sessionRepository';

jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = new Map<string, string>();

  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(storage.get(key) ?? null)),
      setItem: jest.fn((key: string, value: string) => {
        storage.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        storage.delete(key);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        storage.clear();
        return Promise.resolve();
      }),
    },
  };
});

const sessions: FocusSession[] = [
  {
    id: 'session-1',
    mode: 'focus',
    startedAt: 1000,
    endedAt: 61_000,
    durationSeconds: 60,
  },
  {
    id: 'session-2',
    mode: 'shortBreak',
    startedAt: 61_000,
    endedAt: 91_000,
    durationSeconds: 30,
    taskId: 'task-1',
    taskTitle: 'Write tests',
  },
];

const storeValue = async (value: string): Promise<void> => {
  await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, value);
  jest.mocked(AsyncStorage.setItem).mockClear();
};

describe('sessionRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('returns an empty array when there is no stored value', async () => {
    await expect(loadSessions()).resolves.toEqual([]);
  });

  it('returns valid sessions in their stored order', async () => {
    await storeValue(
      JSON.stringify({ version: SESSIONS_SCHEMA_VERSION, sessions }),
    );

    await expect(loadSessions()).resolves.toEqual(sessions);
  });

  it('warns and returns an empty array for malformed JSON', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await storeValue('{not-json');

    await expect(loadSessions()).resolves.toEqual([]);
    expect(warning).toHaveBeenCalledWith('Stored sessions are not valid JSON.');
    warning.mockRestore();
  });

  it('warns and returns an empty array for a mismatched schema version', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await storeValue(JSON.stringify({ version: 99, sessions }));

    await expect(loadSessions()).resolves.toEqual([]);
    expect(warning).toHaveBeenCalledWith(
      'Stored sessions use schema version 99; expected version 1. No migration is available.',
    );
    warning.mockRestore();
  });

  it('warns and returns an empty array when any session is invalid', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const invalidSessions = [sessions[0], { ...sessions[1], startedAt: undefined }];
    await storeValue(
      JSON.stringify({ version: SESSIONS_SCHEMA_VERSION, sessions: invalidSessions }),
    );

    await expect(loadSessions()).resolves.toEqual([]);
    expect(warning).toHaveBeenCalledWith('Stored sessions have an invalid shape.');
    warning.mockRestore();
  });

  it('never calls setItem while loading', async () => {
    await storeValue(
      JSON.stringify({ version: SESSIONS_SCHEMA_VERSION, sessions }),
    );

    await loadSessions();

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('saves sessions with the current schema version', async () => {
    await saveSessions(sessions);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      SESSIONS_STORAGE_KEY,
      JSON.stringify({ version: 1, sessions }),
    );
  });

  it('round-trips saved sessions', async () => {
    await saveSessions(sessions);

    await expect(loadSessions()).resolves.toEqual(sessions);
  });

  it('hydrates current-version sessions without a warning', async () => {
    await storeValue(
      JSON.stringify({ version: SESSIONS_SCHEMA_VERSION, sessions }),
    );

    await expect(hydrateSessions()).resolves.toEqual({ sessions });
  });

  it('returns an empty array and warning for an unsupported version', async () => {
    await storeValue(JSON.stringify({ version: 0, sessions }));

    await expect(hydrateSessions()).resolves.toEqual({
      sessions: [],
      warning:
        'Stored sessions use schema version 0; expected version 1. No migration is available.',
    });
  });
});
```

### `src/infrastructure/storage/__tests__/distractionRepository.test.ts`

```typescript
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DistractionLogEntry } from '../../../shared/types/distraction';
import {
  DISTRACTIONS_SCHEMA_VERSION,
  DISTRACTIONS_STORAGE_KEY,
  hydrateDistractions,
  loadDistractions,
  saveDistractions,
} from '../distractionRepository';

jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = new Map<string, string>();

  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(storage.get(key) ?? null)),
      setItem: jest.fn((key: string, value: string) => {
        storage.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        storage.delete(key);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        storage.clear();
        return Promise.resolve();
      }),
    },
  };
});

const distractions: DistractionLogEntry[] = [
  {
    id: 'distraction-1',
    timestamp: 1_750_000_000_000,
    note: 'Check a message',
  },
  {
    id: 'distraction-2',
    timestamp: 1_750_000_060_000,
    note: 'Take a call',
    taskTitle: 'Write tests',
  },
];

const storeValue = async (value: string): Promise<void> => {
  await AsyncStorage.setItem(DISTRACTIONS_STORAGE_KEY, value);
  jest.mocked(AsyncStorage.setItem).mockClear();
};

describe('distractionRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('returns an empty array when there is no stored value', async () => {
    await expect(loadDistractions()).resolves.toEqual([]);
  });

  it('returns valid distractions in their stored order', async () => {
    await storeValue(
      JSON.stringify({
        version: DISTRACTIONS_SCHEMA_VERSION,
        distractions,
      }),
    );

    await expect(loadDistractions()).resolves.toEqual(distractions);
  });

  it('warns and returns an empty array for malformed JSON', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await storeValue('{not-json');

    await expect(loadDistractions()).resolves.toEqual([]);
    expect(warning).toHaveBeenCalledWith(
      'Stored distractions are not valid JSON.',
    );
    warning.mockRestore();
  });

  it('warns and returns an empty array for a mismatched schema version', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await storeValue(JSON.stringify({ version: 99, distractions }));

    await expect(loadDistractions()).resolves.toEqual([]);
    expect(warning).toHaveBeenCalledWith(
      'Stored distractions use schema version 99; expected version 1. No migration is available.',
    );
    warning.mockRestore();
  });

  it('warns and returns an empty array when any entry is invalid', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const invalidDistractions = [
      distractions[0],
      { ...distractions[1], note: '' },
    ];
    await storeValue(
      JSON.stringify({
        version: DISTRACTIONS_SCHEMA_VERSION,
        distractions: invalidDistractions,
      }),
    );

    await expect(loadDistractions()).resolves.toEqual([]);
    expect(warning).toHaveBeenCalledWith(
      'Stored distractions have an invalid shape.',
    );
    warning.mockRestore();
  });

  it('never calls setItem while loading', async () => {
    await storeValue(
      JSON.stringify({
        version: DISTRACTIONS_SCHEMA_VERSION,
        distractions,
      }),
    );

    await loadDistractions();

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('saves distractions with the current schema version', async () => {
    await saveDistractions(distractions);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      DISTRACTIONS_STORAGE_KEY,
      JSON.stringify({ version: 1, distractions }),
    );
  });

  it('round-trips saved distractions', async () => {
    await saveDistractions(distractions);

    await expect(loadDistractions()).resolves.toEqual(distractions);
  });

  it('hydrates current-version distractions without a warning', async () => {
    await storeValue(
      JSON.stringify({
        version: DISTRACTIONS_SCHEMA_VERSION,
        distractions,
      }),
    );

    await expect(hydrateDistractions()).resolves.toEqual({ distractions });
  });

  it('returns an empty array and warning for an unsupported version', async () => {
    await storeValue(JSON.stringify({ version: 0, distractions }));

    await expect(hydrateDistractions()).resolves.toEqual({
      distractions: [],
      warning:
        'Stored distractions use schema version 0; expected version 1. No migration is available.',
    });
  });
});
```

## Commands and exit status

| Command | Exit status |
|---|---:|
| `npm exec tsc -- --noEmit` | 0 |
| `npm test -- --runInBand` | 0 |
