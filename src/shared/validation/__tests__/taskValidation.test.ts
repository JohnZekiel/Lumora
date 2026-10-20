import { describe, expect, it } from '@jest/globals';
import type { TaskStep } from '../../types/task';
import {
  validateDeadline,
  validateEstimate,
  validateTaskSteps,
  validateTaskTitle,
} from '../taskValidation';

describe('validateTaskTitle', () => {
  it.each([
    ['', { ok: false, errors: ['Task title cannot be empty.'] }],
    ['   ', { ok: false, errors: ['Task title cannot be empty.'] }],
    ['a'.repeat(160), { ok: true }],
    [
      'a'.repeat(161),
      { ok: false, errors: ['Task title must be 160 characters or fewer.'] },
    ],
  ])('validates title %j', (title, expected) => {
    expect(validateTaskTitle(title)).toEqual(expected);
  });
});

describe('validateEstimate', () => {
  it.each([
    [undefined, { ok: true }],
    [0, { ok: false, errors: ['Estimate must be an integer between 1 and 480 minutes.'] }],
    [1, { ok: true }],
    [480, { ok: true }],
    [481, { ok: false, errors: ['Estimate must be an integer between 1 and 480 minutes.'] }],
    [2.5, { ok: false, errors: ['Estimate must be an integer between 1 and 480 minutes.'] }],
  ])('validates estimate %s', (estimate, expected) => {
    expect(validateEstimate(estimate)).toEqual(expected);
  });
});

describe('validateDeadline', () => {
  it.each([
    [undefined, { ok: true }],
    [
      '2025-02-30',
      { ok: false, errors: ['Deadline must be a valid date in YYYY-MM-DD format.'] },
    ],
    [
      '2025-13-01',
      { ok: false, errors: ['Deadline must be a valid date in YYYY-MM-DD format.'] },
    ],
    ['2025-02-28', { ok: true }],
  ])('validates deadline %s', (deadline, expected) => {
    expect(validateDeadline(deadline)).toEqual(expected);
  });
});

describe('validateTaskSteps', () => {
  const createSteps = (count: number, title = 'Step'): TaskStep[] =>
    Array.from({ length: count }, (_, index) => ({
      id: String(index + 1),
      title,
      completed: false,
    }));

  it.each([
    [[], { ok: true }],
    [createSteps(10), { ok: true }],
    [
      createSteps(11),
      { ok: false, errors: ['A task can have no more than 10 steps.'] },
    ],
    [
      createSteps(1, 'a'.repeat(121)),
      { ok: false, errors: ['Step 1 must be 120 characters or fewer.'] },
    ],
  ])('validates steps %j', (steps, expected) => {
    expect(validateTaskSteps(steps)).toEqual(expected);
  });
});
