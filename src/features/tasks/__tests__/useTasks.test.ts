import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { TaskItem } from '../../../shared/types/task';
import { loadTasks, saveTasks } from '../../../infrastructure/storage/taskRepository';
import { useTasks, type UseTasksResult } from '../useTasks';

jest.mock('../../../infrastructure/storage/taskRepository', () => ({
  loadTasks: jest.fn(),
  saveTasks: jest.fn(),
}));

async function renderHook<T>(
  hook: () => T,
): Promise<{ result: { current: T }; renderer: ReactTestRenderer }> {
  const result = { current: undefined as unknown as T };
  function TestComponent() {
    result.current = hook();
    return null;
  }

  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(createElement(TestComponent));
  });
  await act(async () => {
    await Promise.resolve();
  });
  return { result, renderer };
}

const existingTask: TaskItem = {
  id: 'task-1',
  title: 'Existing task',
  priority: 'medium',
  steps: [{ id: 'step-1', title: 'First step', completed: false }],
  createdAt: 100,
};

describe('useTasks', () => {
  beforeEach(() => {
    jest.mocked(loadTasks).mockReset();
    jest.mocked(saveTasks).mockReset();
    jest.mocked(loadTasks).mockResolvedValue([]);
    jest.mocked(saveTasks).mockResolvedValue();
  });

  it('loads tasks on mount without saving and clears loading', async () => {
    jest.mocked(loadTasks).mockResolvedValue([existingTask]);

    const { result, renderer } = await renderHook(() => useTasks());

    expect(result.current.tasks).toEqual([existingTask]);
    expect(result.current.loading).toBe(false);
    expect(loadTasks).toHaveBeenCalledTimes(1);
    expect(saveTasks).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('creates a task with deterministic ids and persists it', async () => {
    const dateNow = jest.spyOn(Date, 'now').mockReturnValue(500);
    const { result, renderer } = await renderHook(() => useTasks());

    await act(async () => {
      await result.current.createTask({
        title: 'New task',
        priority: 'high',
        steps: [{ title: 'First step' }],
      });
    });

    expect(result.current.tasks).toEqual([
      {
        id: '500-0',
        title: 'New task',
        priority: 'high',
        steps: [{ id: '500-1', title: 'First step', completed: false }],
        createdAt: 500,
        completedAt: undefined,
      },
    ]);
    expect(saveTasks).toHaveBeenCalledWith(result.current.tasks);
    dateNow.mockRestore();
    act(() => renderer.unmount());
  });

  it('does not save when an operation finds no matching task', async () => {
    const { result, renderer } = await renderHook(() => useTasks());

    await act(async () => {
      await result.current.deleteTask('missing');
    });

    expect(saveTasks).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('keeps optimistic state and exposes an error when saving fails', async () => {
    jest.mocked(saveTasks).mockRejectedValue(new Error('storage unavailable'));
    const { result, renderer } = await renderHook(() => useTasks());

    await act(async () => {
      await result.current.createTask({ title: 'New task', priority: 'low' });
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.error).toBe('storage unavailable');
    act(() => renderer.unmount());
  });

  it('reloads and replaces the current task list', async () => {
    const { result, renderer } = await renderHook(() => useTasks());
    jest.mocked(loadTasks).mockResolvedValue([existingTask]);

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.tasks).toEqual([existingTask]);
    expect(result.current.loading).toBe(false);
    expect(saveTasks).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('surfaces initial load errors', async () => {
    jest.mocked(loadTasks).mockRejectedValue(new Error('read failed'));

    const { result, renderer } = await renderHook<UseTasksResult>(() => useTasks());

    expect(result.current.error).toBe('read failed');
    expect(result.current.loading).toBe(false);
    act(() => renderer.unmount());
  });
});
