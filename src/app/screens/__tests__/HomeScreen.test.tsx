import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ActivityIndicator, Text } from 'react-native';
import { HomeScreen } from '../HomeScreen';
import { useSettings } from '../../../features/settings/useSettings';
import { useTimer } from '../../../features/focus/useTimer';
import { loadSessions, saveSessions } from '../../../infrastructure/storage/sessionRepository';
import { DEFAULT_SETTINGS } from '../../../shared/settings/settingsDefaults';
import type { UseTimerResult } from '../../../features/focus/useTimer';
import type { UseSettingsResult } from '../../../features/settings/useSettings';

jest.mock('../../../features/settings/useSettings', () => ({
  useSettings: jest.fn(),
}));

jest.mock('../../../features/focus/useTimer', () => ({
  useTimer: jest.fn(),
}));

jest.mock('../../../infrastructure/storage/sessionRepository', () => ({
  loadSessions: jest.fn(),
  saveSessions: jest.fn(),
}));

jest.mock('../../components/CircularTimer', () => ({
  CircularTimer: ({
    timeText,
    modeText,
  }: {
    timeText: string;
    modeText: string;
  }) => {
    const React = jest.requireActual<typeof import('react')>('react');
    const ReactNative =
      jest.requireActual<typeof import('react-native')>('react-native');
    return React.createElement(
      ReactNative.Text,
      null,
      `${modeText} ${timeText}`,
    );
  },
}));

function renderScreen(): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(createElement(HomeScreen));
  });
  return renderer;
}

const timerResult = (overrides: Partial<UseTimerResult> = {}): UseTimerResult =>
  ({
    state: {
      mode: 'focus',
      durations: { focus: 1500, shortBreak: 300, longBreak: 900 },
      isRunning: false,
      remainingSeconds: 1500,
      completedFocusSessions: 0,
      autoStart: false,
    },
    remainingSeconds: 1500,
    loading: false,
    start: jest.fn<UseTimerResult['start']>().mockResolvedValue(),
    pause: jest.fn<UseTimerResult['pause']>().mockResolvedValue(),
    reset: jest.fn<UseTimerResult['reset']>().mockResolvedValue(),
    stop: jest.fn<UseTimerResult['stop']>().mockResolvedValue(),
    resume: jest.fn<UseTimerResult['resume']>().mockResolvedValue(),
    skipBreak: jest.fn<UseTimerResult['skipBreak']>().mockResolvedValue(),
    extendBreak: jest.fn<UseTimerResult['extendBreak']>().mockResolvedValue(),
    ...overrides,
  }) as UseTimerResult;

const settingsResult = (loading: boolean): UseSettingsResult => ({
  settings: { ...DEFAULT_SETTINGS, customTags: [] },
  loading,
  updateSettings: jest
    .fn<UseSettingsResult['updateSettings']>()
    .mockResolvedValue(),
  reload: jest.fn<UseSettingsResult['reload']>().mockResolvedValue(),
});

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.mocked(useSettings).mockReset();
    jest.mocked(useTimer).mockReset();
    jest.mocked(loadSessions).mockReset();
    jest.mocked(saveSessions).mockReset();
    jest.mocked(useSettings).mockReturnValue(settingsResult(true));
    jest.mocked(useTimer).mockReturnValue(timerResult({ loading: true }));
    jest.mocked(loadSessions).mockResolvedValue([]);
    jest.mocked(saveSessions).mockResolvedValue();
  });

  it('renders loading state initially', () => {
    const renderer = renderScreen();

    expect(renderer.root.findByType(ActivityIndicator)).toBeDefined();
    act(() => renderer.unmount());
  });

  it('renders time and mode when loaded', () => {
    jest.mocked(useSettings).mockReturnValue(settingsResult(false));
    jest.mocked(useTimer).mockReturnValue(timerResult());

    const renderer = renderScreen();
    const text = renderer.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat()
      .join(' ');

    expect(text).toContain('Focus 25:00');
    expect(text).toContain('Start');
    act(() => renderer.unmount());
  });

  it('calls timer.start when Start is pressed', async () => {
    jest.mocked(useSettings).mockReturnValue(settingsResult(false));
    const timer = timerResult();
    jest.mocked(useTimer).mockReturnValue(timer);

    const renderer = renderScreen();
    const startButton = renderer.root
      .findAllByProps({ accessibilityRole: 'button' })
      .find((button) => button.findByType(Text).props.children === 'Start');
    expect(startButton).toBeDefined();

    await act(async () => {
      startButton!.props.onPress();
    });

    expect(timer.start).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });
});
