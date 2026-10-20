import { describe, expect, it } from '@jest/globals';
import type { TaskItem, TaskStep } from '../../../shared/types/task';
import {
  addTaskStep,
  createTask,
  deleteTask,
  removeTaskStep,
  toggleStepCompletion,
  toggleTaskCompletion,
  updateTask,
} from '../taskOperations';
import type { NewTaskInput } from '../taskOperations';

const createIdFactory = (): (() => string) => {
  let n = 0;
  return () => `id-${++n}`;
};

const createTaskItem = (overrides: Partial<TaskItem> = {}): TaskItem => ({
  id: 'task-1',
  title: 'Original title',
  priority: 'medium',
  steps: [],
  createdAt: 100,
  ...overrides,
});

const createStep = (overrides: Partial<TaskStep> = {}): TaskStep => ({
  id: 'step-1',
  title: 'First step',
  completed: false,
  ...overrides,
});

describe('createTask', () => {
  it('sets the generated id and creation time, with no completion time or default steps', () => {
    const generateId = createIdFactory();
    const input: NewTaskInput = { title: 'New task', priority: 'low' };

    expect(createTask(input, { now: 1234, generateId })).toEqual({
      id: 'id-1',
      title: 'New task',
      priority: 'low',
      steps: [],
      createdAt: 1234,
      completedAt: undefined,
    });
  });

  it('preserves provided category, estimate, deadline, and priority', () => {
    const task = createTask(
      {
        title: 'Plan',
        category: 'Work',
        priority: 'high',
        estimate: 45,
        deadline: '2025-06-01',
      },
      { now: 1234, generateId: createIdFactory() },
    );

    expect(task).toMatchObject({
      category: 'Work',
      estimate: 45,
      deadline: '2025-06-01',
      priority: 'high',
    });
  });

  it('converts input steps to generated incomplete task steps', () => {
    const task = createTask(
      {
        title: 'Plan',
        priority: 'medium',
        steps: [{ title: 'Research' }, { title: 'Draft' }],
      },
      { now: 1234, generateId: createIdFactory() },
    );

    expect(task.steps).toEqual([
      { id: 'id-2', title: 'Research', completed: false },
      { id: 'id-3', title: 'Draft', completed: false },
    ]);
  });
});

describe('updateTask', () => {
  it('updates only the provided title, preserving all other fields and steps', () => {
    const step = createStep({ completed: true });
    const task = createTaskItem({
      category: 'Work',
      priority: 'high',
      estimate: 60,
      deadline: '2025-06-01',
      steps: [step],
      completedAt: 200,
    });

    expect(updateTask([task], task.id, { title: 'Updated title' }, 300)).toEqual([
      { ...task, title: 'Updated title' },
    ]);
  });

  it('preserves existing steps when updates.steps is undefined', () => {
    const task = createTaskItem({ steps: [createStep({ completed: true })] });

    const result = updateTask(
      [task],
      task.id,
      { title: 'New title', steps: undefined },
      300,
    );

    expect(result[0].steps).toEqual([createStep({ completed: true })]);
    expect(result[0].title).toBe('New title');
  });

  it('clears steps when updates.steps is []', () => {
    const task = createTaskItem({ steps: [createStep()] });

    const result = updateTask([task], task.id, { steps: [] }, 300);

    expect(result[0].steps).toEqual([]);
  });

  it('resets completion when an existing step title changes', () => {
    const task = createTaskItem({ steps: [createStep({ completed: true })] });

    expect(
      updateTask(
        [task],
        task.id,
        { steps: [{ id: 'step-1', title: 'Changed title', completed: true }] },
        300,
      )[0].steps,
    ).toEqual([{ id: 'step-1', title: 'Changed title', completed: false }]);
  });

  it('preserves completion when an existing step title is unchanged', () => {
    const task = createTaskItem({ steps: [createStep({ completed: true })] });

    expect(
      updateTask(
        [task],
        task.id,
        { steps: [{ id: 'step-1', title: 'First step', completed: false }] },
        300,
      )[0].steps,
    ).toEqual([{ id: 'step-1', title: 'First step', completed: true }]);
  });

  it('adds a new unmatched step as incomplete', () => {
    const task = createTaskItem();

    expect(
      updateTask(
        [task],
        task.id,
        { steps: [{ id: 'new-step', title: 'New step', completed: true }] },
        300,
      )[0].steps,
    ).toEqual([{ id: 'new-step', title: 'New step', completed: false }]);
  });

  it('removes steps that are absent from the provided steps', () => {
    const task = createTaskItem({
      steps: [createStep(), createStep({ id: 'step-2', title: 'Second step' })],
    });

    expect(
      updateTask(
        [task],
        task.id,
        { steps: [{ id: 'step-2', title: 'Second step', completed: false }] },
        300,
      )[0].steps,
    ).toEqual([{ id: 'step-2', title: 'Second step', completed: false }]);
  });

  it('returns the same array reference for an unknown task id', () => {
    const tasks = [createTaskItem()];

    expect(updateTask(tasks, 'missing', { title: 'Updated' }, 300)).toBe(tasks);
  });
});

describe('toggleTaskCompletion', () => {
  it('marks an incomplete task completed with the supplied time', () => {
    const tasks = [createTaskItem()];

    expect(toggleTaskCompletion(tasks, 'task-1', 500)[0].completedAt).toBe(500);
  });

  it('clears completion time from a completed task', () => {
    const tasks = [createTaskItem({ completedAt: 400 })];

    expect(toggleTaskCompletion(tasks, 'task-1', 500)[0].completedAt).toBeUndefined();
  });

  it('returns the same array reference for an unknown task id', () => {
    const tasks = [createTaskItem()];

    expect(toggleTaskCompletion(tasks, 'missing', 500)).toBe(tasks);
  });
});

describe('toggleStepCompletion', () => {
  it('flips only the target step completion', () => {
    const target = createStep();
    const other = createStep({ id: 'step-2', title: 'Second step', completed: true });
    const tasks = [createTaskItem({ steps: [target, other] })];

    expect(toggleStepCompletion(tasks, 'task-1', 'step-1')[0].steps).toEqual([
      { ...target, completed: true },
      other,
    ]);
  });

  it('returns the same array reference for an unknown task id', () => {
    const tasks = [createTaskItem({ steps: [createStep()] })];

    expect(toggleStepCompletion(tasks, 'missing', 'step-1')).toBe(tasks);
  });

  it('returns the same array reference for an unknown step id', () => {
    const tasks = [createTaskItem({ steps: [createStep()] })];

    expect(toggleStepCompletion(tasks, 'task-1', 'missing')).toBe(tasks);
  });
});

describe('addTaskStep', () => {
  it('appends a generated incomplete step', () => {
    const tasks = [createTaskItem({ steps: [createStep()] })];
    const generateId = createIdFactory();

    expect(addTaskStep(tasks, 'task-1', 'Second step', generateId)[0].steps).toEqual([
      createStep(),
      { id: 'id-1', title: 'Second step', completed: false },
    ]);
  });

  it('returns the same array reference for an unknown task id', () => {
    const tasks = [createTaskItem()];

    expect(addTaskStep(tasks, 'missing', 'New step', createIdFactory())).toBe(
      tasks,
    );
  });
});

describe('removeTaskStep', () => {
  it('removes the matching step', () => {
    const tasks = [
      createTaskItem({
        steps: [
          createStep(),
          createStep({ id: 'step-2', title: 'Second step' }),
        ],
      }),
    ];

    expect(removeTaskStep(tasks, 'task-1', 'step-1')[0].steps).toEqual([
      createStep({ id: 'step-2', title: 'Second step' }),
    ]);
  });

  it('returns the same array reference for an unknown task id', () => {
    const tasks = [createTaskItem({ steps: [createStep()] })];

    expect(removeTaskStep(tasks, 'missing', 'step-1')).toBe(tasks);
  });

  it('returns the same array reference for an unknown step id', () => {
    const tasks = [createTaskItem({ steps: [createStep()] })];

    expect(removeTaskStep(tasks, 'task-1', 'missing')).toBe(tasks);
  });
});

describe('deleteTask', () => {
  it('removes the matching task', () => {
    const tasks = [createTaskItem(), createTaskItem({ id: 'task-2' })];

    expect(deleteTask(tasks, 'task-1')).toEqual([createTaskItem({ id: 'task-2' })]);
  });

  it('returns the same array reference for an unknown task id', () => {
    const tasks = [createTaskItem()];

    expect(deleteTask(tasks, 'missing')).toBe(tasks);
  });
});
