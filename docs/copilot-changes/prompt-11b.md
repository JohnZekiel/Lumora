# Copilot changes - prompt 11b

## Full final contents

### `src/app/navigation/__tests__/RootNavigator.test.tsx`

```tsx
  import { act, create } from 'react-test-renderer';
  import { createElement } from 'react';
  import { describe, expect, it, jest } from '@jest/globals';
  import { NavigationContainer } from '@react-navigation/native';
  import { SafeAreaProvider } from 'react-native-safe-area-context';
  import { RootNavigator } from '../RootNavigator';

  jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
  );

  jest.mock('@expo/vector-icons', () => ({
    Ionicons: () => null,
  }));

  describe('RootNavigator', () => {
    it('renders the app shell with all five tab labels', () => {
      let renderer: ReturnType<typeof create>;

      expect(() => {
        act(() => {
          renderer = create(
            createElement(
              SafeAreaProvider,
              {
                initialMetrics: {
                  frame: { x: 0, y: 0, width: 390, height: 844 },
                  insets: { top: 0, right: 0, bottom: 0, left: 0 },
                },
              },
              createElement(
                NavigationContainer,
                null,
                createElement(RootNavigator),
              ),
            ),
          );
        });
      }).not.toThrow();

      const renderedTree = JSON.stringify(renderer!.toJSON());
      for (const label of ['Home', 'Timer', 'Add', 'Settings', 'Profile']) {
        expect(renderedTree).toContain(label);
      }

      act(() => renderer!.unmount());
    });
  });
```

### `src/app/components/CircularTimer.tsx`

```tsx
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type CircularTimerProps = {
  progress: number;
  timeText: string;
  modeText: string;
  isRunning: boolean;
};

const SIZE = 280;
const STROKE_WIDTH = 12;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CircularTimer({
  progress,
  timeText,
  modeText,
  isRunning,
}: CircularTimerProps) {
  const boundedProgress = Math.min(1, Math.max(0, progress));

  return (
    <View
      accessibilityLabel={`${modeText}, ${timeText}${isRunning ? ', running' : ', paused'}`}
      style={styles.container}
    >
      <Svg height={SIZE} width={SIZE} style={styles.ring}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#E8E2F2"
          strokeWidth={STROKE_WIDTH}
        />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="#8B7BC7"
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={CIRCUMFERENCE * (1 - boundedProgress)}
          strokeLinecap="round"
          rotation={-90}
          originX={SIZE / 2}
          originY={SIZE / 2}
        />
      </Svg>
      <View style={styles.content}>
        <Text style={styles.mode}>{modeText}</Text>
        <Text style={styles.time}>{timeText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F6FC',
    borderRadius: SIZE / 2,
  },
  ring: {
    position: 'absolute',
  },
  content: {
    alignItems: 'center',
  },
  mode: {
    color: '#777',
    fontSize: 16,
    marginBottom: 8,
  },
  time: {
    color: '#2D2D2D',
    fontSize: 56,
    fontVariant: ['tabular-nums'],
  },
});
```

### `src/app/screens/HomeScreen.tsx`

```tsx
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../features/settings/useSettings';
import { useTimer } from '../../features/focus/useTimer';
import { loadSessions, saveSessions } from '../../infrastructure/storage/sessionRepository';
import type { FocusSession } from '../../shared/types/session';
import { CircularTimer } from '../components/CircularTimer';

function formatSeconds(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function HomeScreen() {
  const { settings, loading: settingsLoading } = useSettings();
  const handleSessionComplete = useCallback(async (session: FocusSession) => {
    const existing = await loadSessions();
    await saveSessions([...existing, session]);
  }, []);
  const timer = useTimer({ settings, onSessionComplete: handleSessionComplete });

  if (settingsLoading || timer.loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color="#8B7BC7" />
      </SafeAreaView>
    );
  }

  const duration = timer.state.durations[timer.state.mode];
  const remainingSeconds = timer.remainingSeconds;
  const isAtFullDuration = remainingSeconds >= duration;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <CircularTimer
          progress={duration > 0 ? remainingSeconds / duration : 0}
          timeText={formatSeconds(remainingSeconds)}
          modeText={timer.state.mode === 'focus' ? 'Focus' : 'Break'}
          isRunning={timer.state.isRunning}
        />
        {timer.error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {timer.error}
          </Text>
        ) : null}
        <View style={styles.controls}>
          {timer.state.isRunning ? (
            <ActionButton label="Pause" onPress={() => void timer.pause()} />
          ) : remainingSeconds > 0 ? (
            <ActionButton
              label={isAtFullDuration ? 'Start' : 'Resume'}
              onPress={() => void timer.start()}
              primary
            />
          ) : null}
          <ActionButton label="Reset" onPress={() => void timer.reset()} />
          <ActionButton label="Stop" onPress={() => void timer.stop()} />
        </View>
      </View>
    </SafeAreaView>
  );
}

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  primary?: boolean;
};

function ActionButton({ label, onPress, primary = false }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primaryButton : styles.secondaryButton,
        pressed && styles.pressed,
      ]}
    >
      <Text style={primary ? styles.primaryLabel : styles.secondaryLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F6FC',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F6FC',
  },
  content: {
    alignItems: 'center',
    gap: 32,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    minWidth: 88,
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: '#8B7BC7',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: '#8B7BC7',
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  primaryLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryLabel: {
    color: '#8B7BC7',
    fontWeight: '600',
  },
  error: {
    color: '#9B2C2C',
    textAlign: 'center',
  },
});
```

### `src/app/screens/__tests__/HomeScreen.test.tsx`

```tsx
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
```

## Commands and exit status

| Command | Exit status |
|---|---:|
| `npm exec tsc -- --noEmit` | 0 |
| `npm test -- --runInBand` | 0 |
