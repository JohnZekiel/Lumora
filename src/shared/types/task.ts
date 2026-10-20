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
  priority: Priority;
  status: TaskStatus;
  estimate?: number;
  deadline?: string;
  steps: TaskStep[];
}
