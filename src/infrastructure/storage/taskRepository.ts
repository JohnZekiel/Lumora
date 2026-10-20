import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Priority, TaskItem, TaskStep } from '../../shared/types/task';

export const STORAGE_KEY = 'lumora_tasks';
export const SCHEMA_VERSION = 1;

export type PersistedTasks = {
  version: number;
  tasks: TaskItem[];
};

export type HydrationResult = {
  tasks: TaskItem[];
  migrated: boolean;
  warning?: string;
};

function isPriority(value: unknown): value is Priority {
  return value === 'low' || value === 'medium' || value === 'high';
}

function isTaskStep(value: unknown): value is TaskStep {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const step = value as Record<string, unknown>;
  return (
    typeof step.id === 'string' &&
    typeof step.title === 'string' &&
    typeof step.completed === 'boolean'
  );
}

function isTaskItem(value: unknown): value is TaskItem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const task = value as Record<string, unknown>;
  return (
    typeof task.id === 'string' &&
    typeof task.title === 'string' &&
    isPriority(task.priority) &&
    Array.isArray(task.steps) &&
    task.steps.every(isTaskStep) &&
    typeof task.createdAt === 'number' &&
    (task.category === undefined || typeof task.category === 'string') &&
    (task.estimate === undefined || typeof task.estimate === 'number') &&
    (task.deadline === undefined || typeof task.deadline === 'string') &&
    (task.completedAt === undefined || typeof task.completedAt === 'number')
  );
}

function isTaskArray(value: unknown): value is TaskItem[] {
  return Array.isArray(value) && value.every(isTaskItem);
}

function readPersistedTasks(value: unknown): HydrationResult {
  if (typeof value !== 'object' || value === null) {
    return {
      tasks: [],
      migrated: false,
      warning: 'Stored tasks have an invalid shape.',
    };
  }

  const persisted = value as Record<string, unknown>;
  if (typeof persisted.version !== 'number' || !isTaskArray(persisted.tasks)) {
    return {
      tasks: [],
      migrated: false,
      warning: 'Stored tasks have an invalid shape.',
    };
  }

  if (persisted.version !== SCHEMA_VERSION) {
    return {
      tasks: [],
      migrated: true,
      warning: `Stored tasks use schema version ${persisted.version}; expected version ${SCHEMA_VERSION}. No migration is available.`,
    };
  }

  return { tasks: persisted.tasks, migrated: false };
}

async function readTasks(): Promise<HydrationResult> {
  const storedValue = await AsyncStorage.getItem(STORAGE_KEY);
  if (storedValue === null) {
    return { tasks: [], migrated: false };
  }

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(storedValue);
  } catch {
    return {
      tasks: [],
      migrated: false,
      warning: 'Stored tasks are not valid JSON.',
    };
  }

  return readPersistedTasks(parsedValue);
}

export async function loadTasks(): Promise<TaskItem[]> {
  const result = await readTasks();
  if (result.warning !== undefined) {
    console.warn(result.warning);
  }

  return result.tasks;
}

export async function saveTasks(tasks: TaskItem[]): Promise<void> {
  const persisted: PersistedTasks = { version: SCHEMA_VERSION, tasks };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
}

export async function hydrateTasks(): Promise<HydrationResult> {
  return readTasks();
}
