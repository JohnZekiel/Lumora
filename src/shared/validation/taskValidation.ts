import type { TaskStep } from '../types/task';

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

const valid = (): ValidationResult => ({ ok: true });

const invalid = (...errors: string[]): ValidationResult => ({
  ok: false,
  errors,
});

export function validateTaskTitle(title: string): ValidationResult {
  const errors: string[] = [];

  if (title.trim().length === 0) {
    errors.push('Task title cannot be empty.');
  }

  if (title.length > 160) {
    errors.push('Task title must be 160 characters or fewer.');
  }

  return errors.length === 0 ? valid() : { ok: false, errors };
}

export function validateEstimate(estimate: number | undefined): ValidationResult {
  if (estimate === undefined) {
    return valid();
  }

  if (!Number.isInteger(estimate) || estimate < 1 || estimate > 480) {
    return invalid('Estimate must be an integer between 1 and 480 minutes.');
  }

  return valid();
}

export function validateDeadline(deadline: string | undefined): ValidationResult {
  if (deadline === undefined) {
    return valid();
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadline);
  if (!match) {
    return invalid('Deadline must be a valid date in YYYY-MM-DD format.');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
    return invalid('Deadline must be a valid date in YYYY-MM-DD format.');
  }

  return valid();
}

export function validateTaskSteps(steps: TaskStep[]): ValidationResult {
  const errors: string[] = [];

  if (steps.length > 10) {
    errors.push('A task can have no more than 10 steps.');
  }

  steps.forEach((step, index) => {
    if (step.title.length > 120) {
      errors.push(`Step ${index + 1} must be 120 characters or fewer.`);
    }
  });

  return errors.length === 0 ? valid() : { ok: false, errors };
}
