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
