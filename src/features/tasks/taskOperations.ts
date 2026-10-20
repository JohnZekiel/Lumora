import type {
  Priority,
  TaskItem,
  TaskStep,
} from '../../shared/types/task';

export type CreateTaskDeps = { now: number; generateId: () => string };

export type NewTaskInput = {
  title: string;
  category?: string;
  priority: Priority;
  estimate?: number;
  deadline?: string;
  steps?: { title: string }[];
};

type TaskUpdates = Partial<Omit<TaskItem, 'id' | 'createdAt' | 'completedAt'>>;

export function createTask(input: NewTaskInput, deps: CreateTaskDeps): TaskItem {
  return {
    id: deps.generateId(),
    title: input.title,
    ...(input.category === undefined ? {} : { category: input.category }),
    priority: input.priority,
    ...(input.estimate === undefined ? {} : { estimate: input.estimate }),
    ...(input.deadline === undefined ? {} : { deadline: input.deadline }),
    steps:
      input.steps?.map(({ title }) => ({
        id: deps.generateId(),
        title,
        completed: false,
      })) ?? [],
    createdAt: deps.now,
    completedAt: undefined,
  };
}

export function updateTask(
  tasks: TaskItem[],
  id: string,
  updates: TaskUpdates,
  _now: number,
): TaskItem[] {
  const taskIndex = tasks.findIndex((task) => task.id === id);
  if (taskIndex === -1) {
    return tasks;
  }

  const currentTask = tasks[taskIndex];
  const { steps, ...rest } = updates;

  const updatedFields: TaskUpdates =
    steps === undefined
      ? rest
      : {
          ...rest,
          steps: steps.map((step) => {
            const existingStep = currentTask.steps.find(
              (current) => current.id === step.id,
            );
            return {
              ...step,
              completed:
                existingStep !== undefined && existingStep.title === step.title
                  ? existingStep.completed
                  : false,
            };
          }),
        };

  const updatedTasks = tasks.slice();
  updatedTasks[taskIndex] = { ...currentTask, ...updatedFields };
  return updatedTasks;
}

export function toggleTaskCompletion(
  tasks: TaskItem[],
  id: string,
  now: number,
): TaskItem[] {
  const taskIndex = tasks.findIndex((task) => task.id === id);
  if (taskIndex === -1) {
    return tasks;
  }

  const task = tasks[taskIndex];
  const updatedTasks = tasks.slice();
  updatedTasks[taskIndex] =
    task.completedAt === undefined
      ? { ...task, completedAt: now }
      : { ...task, completedAt: undefined };
  return updatedTasks;
}

export function toggleStepCompletion(
  tasks: TaskItem[],
  taskId: string,
  stepId: string,
): TaskItem[] {
  const taskIndex = tasks.findIndex((task) => task.id === taskId);
  if (taskIndex === -1) {
    return tasks;
  }

  const task = tasks[taskIndex];
  const stepIndex = task.steps.findIndex((step) => step.id === stepId);
  if (stepIndex === -1) {
    return tasks;
  }

  const steps = task.steps.slice();
  steps[stepIndex] = { ...steps[stepIndex], completed: !steps[stepIndex].completed };
  const updatedTasks = tasks.slice();
  updatedTasks[taskIndex] = { ...task, steps };
  return updatedTasks;
}

export function addTaskStep(
  tasks: TaskItem[],
  taskId: string,
  title: string,
  generateId: () => string,
): TaskItem[] {
  const taskIndex = tasks.findIndex((task) => task.id === taskId);
  if (taskIndex === -1) {
    return tasks;
  }

  const task = tasks[taskIndex];
  const newStep: TaskStep = {
    id: generateId(),
    title,
    completed: false,
  };
  const updatedTasks = tasks.slice();
  updatedTasks[taskIndex] = { ...task, steps: [...task.steps, newStep] };
  return updatedTasks;
}

export function removeTaskStep(
  tasks: TaskItem[],
  taskId: string,
  stepId: string,
): TaskItem[] {
  const taskIndex = tasks.findIndex((task) => task.id === taskId);
  if (taskIndex === -1) {
    return tasks;
  }

  const task = tasks[taskIndex];
  const stepIndex = task.steps.findIndex((step) => step.id === stepId);
  if (stepIndex === -1) {
    return tasks;
  }

  const updatedTasks = tasks.slice();
  updatedTasks[taskIndex] = {
    ...task,
    steps: task.steps.filter((step) => step.id !== stepId),
  };
  return updatedTasks;
}

export function deleteTask(tasks: TaskItem[], id: string): TaskItem[] {
  if (!tasks.some((task) => task.id === id)) {
    return tasks;
  }

  return tasks.filter((task) => task.id !== id);
}
