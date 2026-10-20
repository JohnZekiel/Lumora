# Copilot changes - prompt 02b

## Full final contents

### `src/shared/types/task.ts`

```typescript
export type Priority = 'low' | 'medium' | 'high';

export type TaskStatus = 'pending' | 'completed' | 'overdue';

export interface TaskStep {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  category?: string;
  priority: Priority;
  estimate?: number;
  deadline?: string;
  steps: TaskStep[];
  createdAt: number;
  completedAt?: number;
}
```

### `src/shared/tasks/taskStatus.ts`

```typescript
import type { TaskItem, TaskStatus } from '../types/task';

export function getTaskStatus(task: TaskItem, today: Date = new Date()): TaskStatus {
  if (task.completedAt !== undefined) {
    return 'completed';
  }

  if (task.deadline === undefined) {
    return 'pending';
  }

  const [year, month, day] = task.deadline.split('-').map(Number);
  const deadlineDate = new Date(year, month - 1, day);
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return deadlineDate < todayDate ? 'overdue' : 'pending';
}
```

### `src/shared/tasks/__tests__/taskStatus.test.ts`

```typescript
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
```

## Commands and exit status

| Command | Exit status |
|---|---:|
| `npm exec tsc -- --noEmit` | 0 |
| `npm test -- --runInBand` | 0 |
