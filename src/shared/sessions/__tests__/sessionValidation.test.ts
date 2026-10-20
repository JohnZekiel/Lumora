import { describe, expect, it } from '@jest/globals';
import { isValidSession } from '../sessionValidation';
import type { FocusSession } from '../../types/session';

const validSession: FocusSession = {
  id: 'session-1',
  mode: 'focus',
  startedAt: 1000,
  endedAt: 61_000,
  durationSeconds: 60,
};

describe('isValidSession', () => {
  it('accepts a minimal valid focus session', () => {
    expect(isValidSession(validSession)).toBe(true);
  });

  it('accepts a session with task details', () => {
    expect(
      isValidSession({
        ...validSession,
        taskId: 'task-1',
        taskTitle: 'Write tests',
      }),
    ).toBe(true);
  });

  it('rejects a non-object', () => {
    expect(isValidSession('not-an-object')).toBe(false);
  });

  it('rejects an empty id', () => {
    expect(isValidSession({ ...validSession, id: '' })).toBe(false);
  });

  it('rejects an unknown mode', () => {
    expect(isValidSession({ ...validSession, mode: 'break' })).toBe(false);
  });

  it('rejects an end time before the start time', () => {
    expect(
      isValidSession({ ...validSession, startedAt: 2000, endedAt: 1000 }),
    ).toBe(false);
  });

  it.each([0, -1, 1.5])('rejects durationSeconds %s', (durationSeconds) => {
    expect(isValidSession({ ...validSession, durationSeconds })).toBe(false);
  });

  it('rejects an empty defined task title', () => {
    expect(isValidSession({ ...validSession, taskTitle: '' })).toBe(false);
  });
});
