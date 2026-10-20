import { describe, expect, it } from '@jest/globals';
import { isValidDistraction } from '../distractionValidation';
import type { DistractionLogEntry } from '../../types/distraction';

const validDistraction: DistractionLogEntry = {
  id: 'distraction-1',
  timestamp: 1_750_000_000_000,
  note: 'Check a message',
};

describe('isValidDistraction', () => {
  it('accepts a valid entry without a task title', () => {
    expect(isValidDistraction(validDistraction)).toBe(true);
  });

  it('accepts a valid entry with a task title', () => {
    expect(
      isValidDistraction({ ...validDistraction, taskTitle: 'Write tests' }),
    ).toBe(true);
  });

  it('rejects a non-object', () => {
    expect(isValidDistraction('not-an-object')).toBe(false);
  });

  it('rejects an empty id', () => {
    expect(isValidDistraction({ ...validDistraction, id: '' })).toBe(false);
  });

  it('rejects a non-integer timestamp', () => {
    expect(
      isValidDistraction({ ...validDistraction, timestamp: 1.5 }),
    ).toBe(false);
  });

  it('rejects an empty note', () => {
    expect(isValidDistraction({ ...validDistraction, note: '   ' })).toBe(false);
  });

  it('rejects a note longer than 200 characters', () => {
    expect(
      isValidDistraction({ ...validDistraction, note: 'a'.repeat(201) }),
    ).toBe(false);
  });

  it('rejects an empty defined task title', () => {
    expect(
      isValidDistraction({ ...validDistraction, taskTitle: '' }),
    ).toBe(false);
  });
});
