import { useCallback, useEffect, useRef, useState } from 'react';
import type { TaskItem } from '../../shared/types/task';
import {
  addTaskStep as addTaskStepOperation,
  createTask as createTaskOperation,
  deleteTask as deleteTaskOperation,
  removeTaskStep as removeTaskStepOperation,
  toggleStepCompletion as toggleStepCompletionOperation,
  toggleTaskCompletion as toggleTaskCompletionOperation,
  updateTask as updateTaskOperation,
  type NewTaskInput,
  type TaskUpdates,
} from './taskOperations';
import { loadTasks, saveTasks } from '../../infrastructure/storage/taskRepository';

export type UseTasksResult = {
  tasks: TaskItem[];
  loading: boolean;
  error?: string;
  createTask: (input: NewTaskInput) => Promise<void>;
  updateTask: (id: string, updates: TaskUpdates) => Promise<void>;
  toggleTaskCompletion: (id: string) => Promise<void>;
  toggleStepCompletion: (taskId: string, stepId: string) => Promise<void>;
  addTaskStep: (taskId: string, title: string) => Promise<void>;
  removeTaskStep: (taskId: string, stepId: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  reload: () => Promise<void>;
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useTasks(): UseTasksResult {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const tasksRef = useRef(tasks);
  const idCounter = useRef(0);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const loadedTasks = await loadTasks();
      tasksRef.current = loadedTasks;
      setTasks(loadedTasks);
      setError(undefined);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load tasks.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const persistChanges = useCallback(async (nextTasks: TaskItem[]): Promise<void> => {
    tasksRef.current = nextTasks;
    setTasks(nextTasks);
    setError(undefined);
    try {
      await saveTasks(nextTasks);
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to save tasks.'));
    }
  }, []);

  const applyOperation = useCallback(
    async (operation: (currentTasks: TaskItem[]) => TaskItem[]): Promise<void> => {
      const nextTasks = operation(tasksRef.current);
      if (nextTasks === tasksRef.current) {
        return;
      }

      await persistChanges(nextTasks);
    },
    [persistChanges],
  );

  const createTask = useCallback(
    async (input: NewTaskInput): Promise<void> => {
      const task = createTaskOperation(input, {
        now: Date.now(),
        generateId: () => `${Date.now()}-${idCounter.current++}`,
      });
      await applyOperation((currentTasks) => [...currentTasks, task]);
    },
    [applyOperation],
  );

  const updateTask = useCallback(
    async (id: string, updates: TaskUpdates): Promise<void> => {
      await applyOperation((currentTasks) =>
        updateTaskOperation(currentTasks, id, updates, Date.now()),
      );
    },
    [applyOperation],
  );

  const toggleTaskCompletion = useCallback(
    async (id: string): Promise<void> => {
      await applyOperation((currentTasks) =>
        toggleTaskCompletionOperation(currentTasks, id, Date.now()),
      );
    },
    [applyOperation],
  );

  const toggleStepCompletion = useCallback(
    async (taskId: string, stepId: string): Promise<void> => {
      await applyOperation((currentTasks) =>
        toggleStepCompletionOperation(currentTasks, taskId, stepId),
      );
    },
    [applyOperation],
  );

  const addTaskStep = useCallback(
    async (taskId: string, title: string): Promise<void> => {
      await applyOperation((currentTasks) =>
        addTaskStepOperation(
          currentTasks,
          taskId,
          title,
          () => `${Date.now()}-${idCounter.current++}`,
        ),
      );
    },
    [applyOperation],
  );

  const removeTaskStep = useCallback(
    async (taskId: string, stepId: string): Promise<void> => {
      await applyOperation((currentTasks) =>
        removeTaskStepOperation(currentTasks, taskId, stepId),
      );
    },
    [applyOperation],
  );

  const deleteTask = useCallback(
    async (id: string): Promise<void> => {
      await applyOperation((currentTasks) => deleteTaskOperation(currentTasks, id));
    },
    [applyOperation],
  );

  return {
    tasks,
    loading,
    ...(error === undefined ? {} : { error }),
    createTask,
    updateTask,
    toggleTaskCompletion,
    toggleStepCompletion,
    addTaskStep,
    removeTaskStep,
    deleteTask,
    reload,
  };
}
