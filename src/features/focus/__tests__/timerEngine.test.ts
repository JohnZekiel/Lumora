import { describe, expect, it } from '@jest/globals';
import {
  selectRemainingSeconds,
  timerReducer,
  type TimerDurations,
  type TimerMode,
  type TimerState,
} from '../timerEngine';

const durations: TimerDurations = {
  focus: 1500,
  shortBreak: 300,
  longBreak: 900,
};

const createState = (overrides: Partial<TimerState> = {}): TimerState => ({
  mode: 'focus',
  durations,
  isRunning: false,
  remainingSeconds: durations.focus,
  completedFocusSessions: 0,
  autoStart: false,
  ...overrides,
});

const createBreakState = (
  mode: Extract<TimerMode, 'shortBreak' | 'longBreak'> = 'shortBreak',
  overrides: Partial<TimerState> = {},
): TimerState =>
  createState({
    mode,
    remainingSeconds: durations[mode],
    ...overrides,
  });

describe('timerReducer', () => {
  it('starts a timer and sets timestamps and the provided task id', () => {
    const state = createState();

    expect(
      timerReducer(state, { type: 'start', now: 10_000, taskId: 'task-1' }),
    ).toEqual({
      ...state,
      isRunning: true,
      startedAt: 10_000,
      endTime: 1_510_000,
      remainingSeconds: durations.focus,
      taskId: 'task-1',
    });
  });

  it('pauses with computed remaining time and clears timestamps', () => {
    const state = createState({
      isRunning: true,
      startedAt: 10_000,
      endTime: 130_000,
    });

    expect(timerReducer(state, { type: 'pause', now: 100_500 })).toEqual({
      ...createState({ remainingSeconds: 30 }),
      remainingSeconds: 30,
    });
  });

  it('resumes using remainingSeconds', () => {
    const state = createState({ remainingSeconds: 42 });

    expect(timerReducer(state, { type: 'resume', now: 1_000 })).toEqual({
      ...state,
      isRunning: true,
      startedAt: 1_000,
      endTime: 43_000,
    });
  });

  it('resets to the current mode duration and preserves the task id', () => {
    const state = createBreakState('shortBreak', {
      isRunning: true,
      startedAt: 10,
      endTime: 20,
      remainingSeconds: 1,
      taskId: 'task-1',
    });

    expect(timerReducer(state, { type: 'reset', now: 15 })).toEqual({
      ...createBreakState('shortBreak', { taskId: 'task-1' }),
      remainingSeconds: durations.shortBreak,
    });
  });

  it('stops in focus mode, paused, with no task id', () => {
    const state = createBreakState('longBreak', {
      isRunning: true,
      startedAt: 1,
      endTime: 2,
      taskId: 'task-1',
    });

    expect(timerReducer(state, { type: 'stop', now: 2 })).toEqual({
      ...createState(),
      taskId: undefined,
    });
  });

  it('completes focus into a paused short break when autoStart is false', () => {
    const state = createState({
      isRunning: true,
      endTime: 1000,
      autoStart: false,
    });

    expect(timerReducer(state, { type: 'tick', now: 1000 })).toEqual({
      ...createState({
        mode: 'shortBreak',
        remainingSeconds: durations.shortBreak,
        completedFocusSessions: 1,
      }),
    });
  });

  it('completes focus into a running short break when autoStart is true', () => {
    const state = createState({
      isRunning: true,
      endTime: 1000,
      autoStart: true,
    });

    expect(timerReducer(state, { type: 'tick', now: 1000 })).toEqual({
      ...createState({
        mode: 'shortBreak',
        isRunning: true,
        startedAt: 1000,
        endTime: 301_000,
        remainingSeconds: durations.shortBreak,
        completedFocusSessions: 1,
        autoStart: true,
      }),
    });
  });

  it('completes the fourth focus session into a long break', () => {
    const state = createState({
      isRunning: true,
      endTime: 1000,
      completedFocusSessions: 3,
    });

    expect(timerReducer(state, { type: 'tick', now: 1000 })).toEqual(
      createBreakState('longBreak', { completedFocusSessions: 4 }),
    );
  });

  it('completes a short break into a paused focus session when autoStart is false', () => {
    const state = createBreakState('shortBreak', {
      isRunning: true,
      endTime: 1000,
      autoStart: false,
    });

    expect(timerReducer(state, { type: 'tick', now: 1000 })).toEqual(
      createState(),
    );
  });

  it('skips a break into a paused focus session', () => {
    const state = createBreakState('longBreak', {
      isRunning: true,
      startedAt: 10,
      endTime: 20,
      taskId: 'task-1',
      completedFocusSessions: 2,
      autoStart: true,
    });

    expect(timerReducer(state, { type: 'skipBreak', now: 15 })).toEqual(
      createState({
        taskId: 'task-1',
        completedFocusSessions: 2,
        autoStart: true,
      }),
    );
  });

  it('extends a break by 300 seconds', () => {
    const state = createBreakState();

    expect(timerReducer(state, { type: 'extendBreak', now: 0 })).toEqual(
      createBreakState('shortBreak', {
        remainingSeconds: durations.shortBreak + 300,
        durations: { ...durations, shortBreak: 600 },
      }),
    );
  });

  it('caps the break duration and remaining time at 7200 seconds', () => {
    const state = createBreakState('shortBreak', {
      remainingSeconds: 7100,
      durations: { ...durations, shortBreak: 7100 },
    });

    expect(timerReducer(state, { type: 'extendBreak', now: 0 })).toEqual(
      createBreakState('shortBreak', {
        remainingSeconds: 7200,
        durations: { ...durations, shortBreak: 7200 },
      }),
    );
  });

  it('extends a paused break without setting endTime', () => {
    const state = createBreakState('shortBreak', { remainingSeconds: 400 });
    const nextState = timerReducer(state, { type: 'extendBreak', now: 0 });

    expect(nextState.remainingSeconds).toBe(700);
    expect(nextState.endTime).toBeUndefined();
  });

  it('extends a running break by shifting endTime', () => {
    const state = createBreakState('shortBreak', {
      isRunning: true,
      startedAt: 1000,
      endTime: 301_000,
    });

    expect(timerReducer(state, { type: 'extendBreak', now: 1000 })).toEqual({
      ...state,
      endTime: 601_000,
      remainingSeconds: 600,
      durations: { ...durations, shortBreak: 600 },
    });
  });

  it('returns running remaining time from endTime', () => {
    const state = createState({
      isRunning: true,
      endTime: 10_000,
      remainingSeconds: 99,
    });

    expect(selectRemainingSeconds(state, 2501)).toBe(8);
  });

  it('returns the stored remaining time while paused', () => {
    expect(selectRemainingSeconds(createState({ remainingSeconds: 17 }), 5000)).toBe(
      17,
    );
  });

  it('clamps remaining time to zero after endTime', () => {
    const state = createState({ isRunning: true, endTime: 1000 });

    expect(selectRemainingSeconds(state, 1001)).toBe(0);
  });

  it('returns the same state reference when a tick is before endTime', () => {
    const state = createState({ isRunning: true, endTime: 1000 });

    expect(timerReducer(state, { type: 'tick', now: 999 })).toBe(state);
  });

  it('transitions when a tick reaches endTime', () => {
    const state = createState({ isRunning: true, endTime: 1000 });

    expect(timerReducer(state, { type: 'tick', now: 1000 })).toEqual(
      createBreakState('shortBreak', { completedFocusSessions: 1 }),
    );
  });
});
