# Copilot changes - prompt 13

## Full final contents

### `src/app/components/TaskCard.tsx`

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TaskItem } from '../../shared/types/task';

type TaskCardProps = {
  task: TaskItem;
  isSelected: boolean;
  onToggleComplete: (id: string) => void;
  onSelect: (id: string) => void;
};

const priorityColors = {
  high: '#D9534F',
  medium: '#E59B45',
  low: '#999',
} as const;

export function TaskCard({
  task,
  isSelected,
  onToggleComplete,
  onSelect,
}: TaskCardProps) {
  const completed = task.completedAt !== undefined;

  return (
    <View style={[styles.card, isSelected && styles.selectedCard]}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${completed ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`}
          onPress={() => onToggleComplete(task.id)}
          style={({ pressed }) => [styles.checkButton, pressed && styles.pressed]}
        >
          <Ionicons
            name={completed ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={completed ? '#8B7BC7' : '#ccc'}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Select task: ${task.title}`}
          onPress={() => onSelect(task.id)}
          style={({ pressed }) => [
            styles.details,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.title, completed && styles.completedTitle]}>
            {task.title}
          </Text>
          {task.deadline ? <Text style={styles.deadline}>Due: {task.deadline}</Text> : null}
        </Pressable>
        <View
          accessibilityLabel={`${task.priority} priority`}
          style={[
            styles.priorityDot,
            { backgroundColor: priorityColors[task.priority] },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedCard: {
    borderColor: '#8B7BC7',
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.75,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkButton: {
    marginRight: 12,
    padding: 2,
  },
  details: {
    flex: 1,
  },
  title: {
    color: '#2D2D2D',
    fontSize: 16,
  },
  completedTitle: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  deadline: {
    marginTop: 4,
    color: '#777',
    fontSize: 12,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 12,
  },
});
```

### `src/app/screens/HomeScreen.tsx`

```tsx
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../features/settings/useSettings';
import { useTimer } from '../../features/focus/useTimer';
import { useTasks } from '../../features/tasks/useTasks';
import { loadSessions, saveSessions } from '../../infrastructure/storage/sessionRepository';
import type { FocusSession } from '../../shared/types/session';
import { CircularTimer } from '../components/CircularTimer';
import { TaskCard } from '../components/TaskCard';

function formatSeconds(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function HomeScreen() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();
  const { settings, loading: settingsLoading } = useSettings();
  const tasksHook = useTasks();
  useFocusEffect(
    useCallback(() => {
      void tasksHook.reload();
    }, [tasksHook.reload]),
  );
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
  const selectedTask = tasksHook.tasks.find((task) => task.id === selectedTaskId);
  const selectionDisabled =
    timer.state.isRunning || remainingSeconds < duration;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {selectedTask ? (
            <Text style={styles.focusLabel}>
              Focusing on: {selectedTask.title}
            </Text>
          ) : null}
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
                onPress={() => void timer.start(selectedTaskId)}
                primary
              />
            ) : null}
            <ActionButton label="Reset" onPress={() => void timer.reset()} />
            <ActionButton label="Stop" onPress={() => void timer.stop()} />
          </View>
        </View>
        <View style={styles.taskSection}>
          <Text style={styles.sectionTitle}>Tasks</Text>
          {tasksHook.loading ? (
            <ActivityIndicator color="#8B7BC7" />
          ) : tasksHook.tasks.length === 0 ? (
            <Text style={styles.emptyText}>
              No tasks yet. Tap Add to create one.
            </Text>
          ) : (
            tasksHook.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isSelected={task.id === selectedTaskId}
                onToggleComplete={(id) => {
                  void tasksHook.toggleTaskCompletion(id);
                }}
                onSelect={(id) => {
                  if (!selectionDisabled) {
                    setSelectedTaskId(id);
                  }
                }}
              />
            ))
          )}
          {tasksHook.error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {tasksHook.error}
            </Text>
          ) : null}
        </View>
      </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  content: {
    alignItems: 'center',
    gap: 24,
  },
  focusLabel: {
    color: '#6C5AA8',
    fontSize: 16,
    fontWeight: '600',
  },
  taskSection: {
    width: '100%',
    marginTop: 36,
  },
  sectionTitle: {
    marginBottom: 14,
    color: '#2D2D2D',
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    color: '#777',
    fontSize: 14,
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

### `src/app/screens/SettingsScreen.tsx`

```tsx
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../features/settings/useSettings';
import { DEFAULT_SETTINGS } from '../../shared/settings/settingsDefaults';

type DurationField = 'focus' | 'shortBreak' | 'longBreak';
type DurationValues = Record<DurationField, string>;

function toMinutes(seconds: number): string {
  return String(seconds / 60);
}

export function SettingsScreen() {
  const { settings, updateSettings, loading } = useSettings();
  const [durationValues, setDurationValues] = useState<DurationValues>({
    focus: toMinutes(DEFAULT_SETTINGS.focusDurationSeconds),
    shortBreak: toMinutes(DEFAULT_SETTINGS.shortBreakSeconds),
    longBreak: toMinutes(DEFAULT_SETTINGS.longBreakSeconds),
  });
  const [autoStart, setAutoStart] = useState(DEFAULT_SETTINGS.autoStart);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!loading) {
      setDurationValues({
        focus: toMinutes(settings.focusDurationSeconds),
        shortBreak: toMinutes(settings.shortBreakSeconds),
        longBreak: toMinutes(settings.longBreakSeconds),
      });
      setAutoStart(settings.autoStart);
    }
  }, [
    loading,
    settings.autoStart,
    settings.focusDurationSeconds,
    settings.longBreakSeconds,
    settings.shortBreakSeconds,
  ]);

  const save = async (): Promise<void> => {
    const focusMinutes = Number(durationValues.focus);
    const shortBreakMinutes = Number(durationValues.shortBreak);
    const longBreakMinutes = Number(durationValues.longBreak);

    if (
      !Number.isInteger(focusMinutes) ||
      focusMinutes < 1 ||
      focusMinutes > 60 ||
      !Number.isInteger(shortBreakMinutes) ||
      shortBreakMinutes < 1 ||
      shortBreakMinutes > 30 ||
      !Number.isInteger(longBreakMinutes) ||
      longBreakMinutes < 1 ||
      longBreakMinutes > 60
    ) {
      setError('Enter valid whole-minute durations within the shown ranges.');
      return;
    }

    setError(undefined);
    try {
      await updateSettings({
        focusDurationSeconds: focusMinutes * 60,
        shortBreakSeconds: shortBreakMinutes * 60,
        longBreakSeconds: longBreakMinutes * 60,
        autoStart,
      });
      Alert.alert('Settings saved');
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save settings.',
      );
    }
  };

  const setDuration = (field: DurationField, value: string): void => {
    setDurationValues((current) => ({ ...current, [field]: value }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Settings</Text>
        {loading ? (
          <Text style={styles.loading}>Loading settings…</Text>
        ) : (
          <>
            <DurationRow
              label="Focus Duration (minutes)"
              value={durationValues.focus}
              onChangeText={(value) => setDuration('focus', value)}
            />
            <DurationRow
              label="Short Break (minutes)"
              value={durationValues.shortBreak}
              onChangeText={(value) => setDuration('shortBreak', value)}
            />
            <DurationRow
              label="Long Break (minutes)"
              value={durationValues.longBreak}
              onChangeText={(value) => setDuration('longBreak', value)}
            />
            <View style={styles.switchRow}>
              <Text style={styles.rowLabel}>Auto-start next session</Text>
              <Switch value={autoStart} onValueChange={setAutoStart} />
            </View>
            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => void save()}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.saveLabel}>Save</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type DurationRowProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
};

function DurationRow({ label, value, onChangeText }: DurationRowProps) {
  return (
    <View style={styles.durationRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType="numeric"
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F6FC',
  },
  content: {
    flexGrow: 1,
    padding: 24,
  },
  heading: {
    marginBottom: 24,
    color: '#2D2D2D',
    fontSize: 28,
    fontWeight: '700',
  },
  loading: {
    color: '#777',
  },
  durationRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  rowLabel: {
    flex: 1,
    color: '#333',
    fontSize: 15,
  },
  input: {
    minWidth: 70,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F5F3F8',
    color: '#2D2D2D',
    textAlign: 'center',
  },
  switchRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  error: {
    marginTop: 16,
    color: '#B42318',
    fontSize: 14,
  },
  saveButton: {
    alignItems: 'center',
    marginTop: 28,
    paddingVertical: 15,
    borderRadius: 24,
    backgroundColor: '#8B7BC7',
  },
  saveLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
});
```

### `src/app/screens/__tests__/SettingsScreen.test.tsx`

```tsx
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Alert, Text, TextInput } from 'react-native';
import { useSettings } from '../../../features/settings/useSettings';
import type { UseSettingsResult } from '../../../features/settings/useSettings';
import { DEFAULT_SETTINGS } from '../../../shared/settings/settingsDefaults';
import { SettingsScreen } from '../SettingsScreen';

jest.mock('../../../features/settings/useSettings', () => ({
  useSettings: jest.fn(),
}));

function renderScreen(): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(createElement(SettingsScreen));
  });
  return renderer;
}

const settingsHookResult = (): UseSettingsResult => ({
  settings: { ...DEFAULT_SETTINGS, customTags: [] },
  loading: false,
  updateSettings: jest.fn<UseSettingsResult['updateSettings']>().mockResolvedValue(),
  reload: jest.fn<UseSettingsResult['reload']>().mockResolvedValue(),
});

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.mocked(useSettings).mockReset();
    jest.mocked(useSettings).mockReturnValue(settingsHookResult());
  });

  it('renders settings values correctly', () => {
    const renderer = renderScreen();
    const focusInput = renderer.root
      .findAllByType(TextInput)
      .find((input) => input.props.accessibilityLabel === 'Focus Duration (minutes)');

    expect(focusInput?.props.value).toBe('25');
    expect(
      renderer.root
        .findAllByType(Text)
        .some((node) => node.props.children === 'Settings'),
    ).toBe(true);
    act(() => renderer.unmount());
  });

  it('calls updateSettings on save', async () => {
    const hookResult = settingsHookResult();
    jest.mocked(useSettings).mockReturnValue(hookResult);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const renderer = renderScreen();
    const saveButton = renderer.root.findByProps({ accessibilityRole: 'button' });

    await act(async () => {
      saveButton.props.onPress();
    });

    expect(hookResult.updateSettings).toHaveBeenCalledWith({
      focusDurationSeconds: 1500,
      shortBreakSeconds: 300,
      longBreakSeconds: 900,
      autoStart: false,
    });
    expect(alertSpy).toHaveBeenCalledWith('Settings saved');
    alertSpy.mockRestore();
    act(() => renderer.unmount());
  });
});
```

### `src/app/screens/__tests__/HomeScreen.test.tsx`

```tsx
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { HomeScreen } from '../HomeScreen';
import { useSettings } from '../../../features/settings/useSettings';
import { useTimer } from '../../../features/focus/useTimer';
import { useTasks } from '../../../features/tasks/useTasks';
import { loadSessions, saveSessions } from '../../../infrastructure/storage/sessionRepository';
import { DEFAULT_SETTINGS } from '../../../shared/settings/settingsDefaults';
import type { UseTimerResult } from '../../../features/focus/useTimer';
import type { UseSettingsResult } from '../../../features/settings/useSettings';
import type { UseTasksResult } from '../../../features/tasks/useTasks';

jest.mock('../../../features/settings/useSettings', () => ({
  useSettings: jest.fn(),
}));

jest.mock('../../../features/focus/useTimer', () => ({
  useTimer: jest.fn(),
}));

jest.mock('../../../features/tasks/useTasks', () => ({
  useTasks: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual<typeof import('@react-navigation/native')>(
    '@react-navigation/native',
  ),
  useFocusEffect: (callback: () => void) => {
    callback();
  },
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

jest.mock('../../components/TaskCard', () => ({
  TaskCard: ({
    task,
    onSelect,
  }: {
    task: { id: string; title: string };
    onSelect: (id: string) => void;
  }) => {
    const React = jest.requireActual<typeof import('react')>('react');
    const ReactNative =
      jest.requireActual<typeof import('react-native')>('react-native');
    return React.createElement(
      ReactNative.Pressable,
      {
        accessibilityLabel: `select-${task.id}`,
        onPress: () => onSelect(task.id),
      },
      React.createElement(ReactNative.Text, null, task.title),
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

const tasksResult = (tasks: UseTasksResult['tasks'] = []): UseTasksResult => ({
  tasks,
  loading: false,
  error: undefined,
  createTask: jest.fn<UseTasksResult['createTask']>().mockResolvedValue(),
  updateTask: jest.fn<UseTasksResult['updateTask']>().mockResolvedValue(),
  toggleTaskCompletion: jest
    .fn<UseTasksResult['toggleTaskCompletion']>()
    .mockResolvedValue(),
  toggleStepCompletion: jest
    .fn<UseTasksResult['toggleStepCompletion']>()
    .mockResolvedValue(),
  addTaskStep: jest.fn<UseTasksResult['addTaskStep']>().mockResolvedValue(),
  removeTaskStep: jest
    .fn<UseTasksResult['removeTaskStep']>()
    .mockResolvedValue(),
  deleteTask: jest.fn<UseTasksResult['deleteTask']>().mockResolvedValue(),
  reload: jest.fn<UseTasksResult['reload']>().mockResolvedValue(),
});

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.mocked(useSettings).mockReset();
    jest.mocked(useTimer).mockReset();
    jest.mocked(useTasks).mockReset();
    jest.mocked(loadSessions).mockReset();
    jest.mocked(saveSessions).mockReset();
    jest.mocked(useSettings).mockReturnValue(settingsResult(true));
    jest.mocked(useTimer).mockReturnValue(timerResult({ loading: true }));
    jest.mocked(useTasks).mockReturnValue(tasksResult());
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

  it('calls timer.start with the selected task id', async () => {
    jest.mocked(useSettings).mockReturnValue(settingsResult(false));
    const timer = timerResult();
    jest.mocked(useTimer).mockReturnValue(timer);
    jest.mocked(useTasks).mockReturnValue(
      tasksResult([
        {
          id: 'task-selected',
          title: 'Selected task',
          priority: 'medium',
          steps: [],
          createdAt: 10,
        },
      ]),
    );

    const renderer = renderScreen();
    const taskButton = renderer.root.findByProps({
      accessibilityLabel: 'select-task-selected',
    });
    act(() => taskButton.props.onPress());

    expect(
      renderer.root
        .findAllByType(Text)
        .some(
          (node) =>
            (Array.isArray(node.props.children)
              ? node.props.children.join('')
              : node.props.children) === 'Focusing on: Selected task',
        ),
    ).toBe(true);

    const startButton = renderer.root
      .findAllByProps({ accessibilityRole: 'button' })
      .find((button) => button.findByType(Text).props.children === 'Start');
    await act(async () => startButton!.props.onPress());

    expect(timer.start).toHaveBeenCalledWith('task-selected');
    act(() => renderer.unmount());
  });

  it('does not change selected task while the timer is running', () => {
    jest.mocked(useSettings).mockReturnValue(settingsResult(false));
    jest.mocked(useTimer).mockReturnValue(
      timerResult({
        state: {
          ...timerResult().state,
          isRunning: true,
          endTime: 2000,
        },
      }),
    );
    jest.mocked(useTasks).mockReturnValue(
      tasksResult([
        {
          id: 'task-selected',
          title: 'Selected task',
          priority: 'medium',
          steps: [],
          createdAt: 10,
        },
      ]),
    );

    const renderer = renderScreen();
    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: 'select-task-selected' })
        .props.onPress();
    });

    expect(
      renderer.root
        .findAllByType(Text)
        .some(
          (node) =>
            (Array.isArray(node.props.children)
              ? node.props.children.join('')
              : node.props.children) === 'Focusing on: Selected task',
        ),
    ).toBe(false);
    act(() => renderer.unmount());
  });
});
```

## Commands and exit status

| Command | Exit status |
|---|---:|
| `npm exec tsc -- --noEmit` | 0 |
| `npm test -- --runInBand` | 0 |
