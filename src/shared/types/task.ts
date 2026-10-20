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
