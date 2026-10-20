import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { createElement } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import type { FocusSession } from '../../../shared/types/session';
import type { UserSettings } from '../../../shared/types/settings';
import {
  clearTimerState,
  loadTimerState,
  saveTimerState,
} from '../../../infrastructure/storage/timerStateRepository';
import { DEFAULT_SETTINGS } from '../../../shared/settings/settingsDefaults';
import type { TimerState } from '../timerEngine';
import { useTimer, type UseTimerResult } from '../useTimer';

jest.mock('../../../infrastructure/storage/timerStateRepository', () => ({
  loadTimerState: jest.fn(),
  saveTimerState: jest.fn(),
  clearTimerState: jest.fn(),
}));

async function renderHook<T>(
  hook: () => T,
): Promise<{ result: { current: T }; renderer: ReactTestRenderer }> {
  const result = { current: undefined as unknown as T };
  function TestComponent() {
    result.current = hook();
    return null;
  }

  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(createElement(TestComponent));
  });
  await act(async () => {
    await Promise.resolve();
  });
  return { result, renderer };
}

const settings: UserSettings = {
  ...DEFAULT_SETTINGS,
  customTags: [],
  focusDurationSeconds: 60,
  shortBreakSeconds: 30,
  longBreakSeconds: 120,
};

function createTimerState(overrides: Partial<TimerState> = {}): TimerState {
  return {
    mode: 'focus',
    durations: {
      focus: settings.focusDurationSeconds,
      shortBreak: settings.shortBreakSeconds,
      longBreak: settings.longBreakSeconds,
    },
    isRunning: false,
    remainingSeconds: settings.focusDurationSeconds,
    completedFocusSessions: 0,
    autoStart: false,
    ...overrides,
  };
}

describe('useTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(100_000);
    jest.mocked(loadTimerState).mockReset();
    jest.mocked(saveTimerState).mockReset();
    jest.mocked(clearTimerState).mockReset();
    jest.mocked(loadTimerState).mockResolvedValue(null);
    jest.mocked(saveTimerState).mockResolvedValue();
    jest.mocked(clearTimerState).mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initial load with no stored state uses settings durations and does not save', async () => {
    const { result, renderer } = await renderHook(() => useTimer({ settings }));

    expect(result.current.state.durations).toEqual({
      focus: 60,
      shortBreak: 30,
      longBreak: 120,
    });
    expect(result.current.loading).toBe(false);
    expect(saveTimerState).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('initial load with a stored paused state restores it', async () => {
    const pausedState = createTimerState({
      remainingSeconds: 27,
      completedFocusSessions: 2,
    });
    jest.mocked(loadTimerState).mockResolvedValue(pausedState);

    const { result, renderer } = await renderHook(() => useTimer({ settings }));

    expect(result.current.state).toBe(pausedState);
    expect(result.current.loading).toBe(false);
    expect(saveTimerState).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('completes an expired stored focus session once on mount', async () => {
    jest.setSystemTime(100_000);
    const expiredState = createTimerState({
      isRunning: true,
      startedAt: 40_000,
      endTime: 100_000,
      taskId: 'task-1',
    });
    const onSessionComplete = jest.fn<(session: FocusSession) => Promise<void>>()
      .mockResolvedValue();
    jest.mocked(loadTimerState).mockResolvedValue(expiredState);

    const { result, renderer } = await renderHook(() =>
      useTimer({ settings, onSessionComplete }),
    );

    expect(result.current.state.mode).toBe('shortBreak');
    expect(result.current.state.isRunning).toBe(false);
    expect(onSessionComplete).toHaveBeenCalledWith({
      id: '100000-0',
      mode: 'focus',
      startedAt: 40_000,
      endedAt: 100_000,
      durationSeconds: 60,
      taskId: 'task-1',
    });
    expect(saveTimerState).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('starts with endTime and saves state', async () => {
    const { result, renderer } = await renderHook(() => useTimer({ settings }));

    await act(async () => result.current.start('task-1'));

    expect(result.current.state.isRunning).toBe(true);
    expect(result.current.state.endTime).toBe(160_000);
    expect(result.current.state.taskId).toBe('task-1');
    expect(saveTimerState).toHaveBeenCalledWith(result.current.state);
    act(() => renderer.unmount());
  });

  it('does not save when start is called while already running', async () => {
    const runningState = createTimerState({
      isRunning: true,
      startedAt: 90_000,
      endTime: 150_000,
    });
    jest.mocked(loadTimerState).mockResolvedValue(runningState);
    const { result, renderer } = await renderHook(() => useTimer({ settings }));
    jest.mocked(saveTimerState).mockClear();

    await act(async () => result.current.start());

    expect(saveTimerState).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('pauses using endTime and saves state', async () => {
    const runningState = createTimerState({
      isRunning: true,
      startedAt: 90_000,
      endTime: 160_000,
    });
    jest.mocked(loadTimerState).mockResolvedValue(runningState);
    const { result, renderer } = await renderHook(() => useTimer({ settings }));

    await act(async () => result.current.pause());

    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.state.remainingSeconds).toBe(60);
    expect(result.current.state.endTime).toBeUndefined();
    expect(saveTimerState).toHaveBeenCalledWith(result.current.state);
    act(() => renderer.unmount());
  });

  it('resumes using remainingSeconds and saves state', async () => {
    const pausedState = createTimerState({ remainingSeconds: 20 });
    jest.mocked(loadTimerState).mockResolvedValue(pausedState);
    const { result, renderer } = await renderHook(() => useTimer({ settings }));

    await act(async () => result.current.resume());

    expect(result.current.state.endTime).toBe(120_000);
    expect(result.current.state.isRunning).toBe(true);
    expect(saveTimerState).toHaveBeenCalledWith(result.current.state);
    act(() => renderer.unmount());
  });

  it('resets to full duration for the current mode and saves', async () => {
    const breakState = createTimerState({
      mode: 'shortBreak',
      isRunning: true,
      startedAt: 90_000,
      endTime: 160_000,
      remainingSeconds: 10,
    });
    jest.mocked(loadTimerState).mockResolvedValue(breakState);
    const { result, renderer } = await renderHook(() => useTimer({ settings }));

    await act(async () => result.current.reset());

    expect(result.current.state.remainingSeconds).toBe(30);
    expect(result.current.state.isRunning).toBe(false);
    expect(saveTimerState).toHaveBeenCalledWith(result.current.state);
    act(() => renderer.unmount());
  });

  it('stops in focus mode, clears taskId, and saves', async () => {
    const breakState = createTimerState({
      mode: 'shortBreak',
      taskId: 'task-1',
      remainingSeconds: 10,
    });
    jest.mocked(loadTimerState).mockResolvedValue(breakState);
    const { result, renderer } = await renderHook(() => useTimer({ settings }));

    await act(async () => result.current.stop());

    expect(result.current.state.mode).toBe('focus');
    expect(result.current.state.taskId).toBeUndefined();
    expect(result.current.state.remainingSeconds).toBe(60);
    expect(saveTimerState).toHaveBeenCalledWith(result.current.state);
    act(() => renderer.unmount());
  });

  it('does not save on ticks before endTime', async () => {
    const runningState = createTimerState({
      isRunning: true,
      startedAt: 90_000,
      endTime: 160_000,
    });
    jest.mocked(loadTimerState).mockResolvedValue(runningState);
    const { result, renderer } = await renderHook(() => useTimer({ settings }));
    jest.mocked(saveTimerState).mockClear();

    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(result.current.state).toBe(runningState);
    expect(saveTimerState).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('records a completed focus session', async () => {
    const onSessionComplete = jest.fn<(session: FocusSession) => Promise<void>>()
      .mockResolvedValue();
    const { result, renderer } = await renderHook(() =>
      useTimer({ settings, onSessionComplete }),
    );

    await act(async () => result.current.start('task-1'));
    await act(async () => {
      jest.advanceTimersByTime(60_000);
      await Promise.resolve();
    });

    expect(onSessionComplete).toHaveBeenCalledWith({
      id: '160000-0',
      mode: 'focus',
      startedAt: 100_000,
      endedAt: 160_000,
      durationSeconds: 60,
      taskId: 'task-1',
    });
    act(() => renderer.unmount());
  });

  it('exposes an error when session recording rejects', async () => {
    const onSessionComplete = jest
      .fn<(session: FocusSession) => Promise<void>>()
      .mockRejectedValue(new Error('record failed'));
    const { result, renderer } = await renderHook(() =>
      useTimer({ settings, onSessionComplete }),
    );

    await act(async () => result.current.start());
    await act(async () => {
      jest.advanceTimersByTime(60_000);
      await Promise.resolve();
    });

    expect(result.current.error).toBe('record failed');
    act(() => renderer.unmount());
  });

  it('skips a break into paused focus and saves', async () => {
    const breakState = createTimerState({
      mode: 'longBreak',
      isRunning: true,
      startedAt: 90_000,
      endTime: 220_000,
      remainingSeconds: 120,
    });
    jest.mocked(loadTimerState).mockResolvedValue(breakState);
    const { result, renderer } = await renderHook(() => useTimer({ settings }));

    await act(async () => result.current.skipBreak());

    expect(result.current.state.mode).toBe('focus');
    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.state.remainingSeconds).toBe(60);
    expect(saveTimerState).toHaveBeenCalledWith(result.current.state);
    act(() => renderer.unmount());
  });
});
