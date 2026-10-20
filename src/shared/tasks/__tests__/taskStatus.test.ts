import { describe, expect, it } from '@jest/globals';
import type { TaskItem } from '../../types/task';
import { getTaskStatus } from '../taskStatus';

const createTask = (overrides: Partial<TaskItem> = {}): TaskItem => ({
  id: 'task-1',
  title: 'Task',
  priority: 'medium',
  steps: [],
  createdAt: 0,
  ...overrides,
});

describe('getTaskStatus', () => {
  const today = new Date(2025, 1, 28, 12);

  it('returns completed for a completed task with a past deadline', () => {
    expect(
      getTaskStatus(
        createTask({ deadline: '2025-02-27', completedAt: 1 }),
        today,
      ),
    ).toBe('completed');
  });

  it('returns pending when there is no deadline', () => {
    expect(getTaskStatus(createTask(), today)).toBe('pending');
  });

  it('returns pending when the deadline is today', () => {
    expect(getTaskStatus(createTask({ deadline: '2025-02-28' }), today)).toBe(
      'pending',
    );
  });

  it('returns overdue when the deadline is yesterday', () => {
    expect(getTaskStatus(createTask({ deadline: '2025-02-27' }), today)).toBe(
      'overdue',
    );
  });

  it('returns pending when the deadline is tomorrow', () => {
    expect(getTaskStatus(createTask({ deadline: '2025-03-01' }), today)).toBe(
      'pending',
    );
  });
});
