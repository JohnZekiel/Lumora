# Copilot changes - prompt 12

## Full final contents

### `src/app/components/TaskCard.tsx`

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TaskItem } from '../../shared/types/task';

type TaskCardProps = {
  task: TaskItem;
  onToggleComplete: (id: string) => void;
};

const priorityColors = {
  high: '#D9534F',
  medium: '#E59B45',
  low: '#999',
} as const;

export function TaskCard({ task, onToggleComplete }: TaskCardProps) {
  const completed = task.completedAt !== undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${completed ? 'Complete' : 'Mark complete'}: ${task.title}`}
      onPress={() => onToggleComplete(task.id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <Ionicons
          name={completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={completed ? '#8B7BC7' : '#ccc'}
          style={styles.check}
        />
        <View style={styles.details}>
          <Text
            style={[
              styles.title,
              completed && styles.completedTitle,
            ]}
          >
            {task.title}
          </Text>
          {task.deadline ? (
            <Text style={styles.deadline}>Due: {task.deadline}</Text>
          ) : null}
        </View>
        <View
          accessibilityLabel={`${task.priority} priority`}
          style={[
            styles.priorityDot,
            { backgroundColor: priorityColors[task.priority] },
          ]}
        />
      </View>
    </Pressable>
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
  pressed: {
    opacity: 0.75,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  check: {
    marginRight: 12,
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

### `src/app/screens/AddScreen.tsx`

```tsx
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTasks } from '../../features/tasks/useTasks';
import {
  validateDeadline,
  validateEstimate,
  validateTaskTitle,
} from '../../shared/validation/taskValidation';
import type { Priority } from '../../shared/types/task';
import type { RootTabParamList } from '../navigation/RootNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';

type FormErrors = {
  title?: string;
  estimate?: string;
  deadline?: string;
};

const priorities: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function AddScreen() {
  const navigation =
    useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { createTask, error: taskError } = useTasks();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [estimateText, setEstimateText] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const handleSubmit = async (): Promise<void> => {
    setErrors({});

    const nextErrors: FormErrors = {};
    const titleResult = validateTaskTitle(title);
    if (!titleResult.ok) {
      nextErrors.title = titleResult.errors[0];
    }

    const estimate = estimateText.trim() === ''
      ? undefined
      : Number.parseInt(estimateText, 10);
    const estimateResult = validateEstimate(estimate);
    if (!estimateResult.ok) {
      nextErrors.estimate = estimateResult.errors[0];
    }

    const normalizedDeadline = deadline.trim() || undefined;
    const deadlineResult = validateDeadline(normalizedDeadline);
    if (!deadlineResult.ok) {
      nextErrors.deadline = deadlineResult.errors[0];
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      await createTask({
        title,
        priority,
        estimate,
        deadline: normalizedDeadline,
        category: category.trim() || undefined,
        steps: [],
      });
      setTitle('');
      setPriority('medium');
      setEstimateText('');
      setDeadline('');
      setCategory('');
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert(
        'Unable to add task',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Add task</Text>
        <TextInput
          accessibilityLabel="Task title"
          placeholder="What needs to be done?"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          maxLength={160}
        />
        {errors.title ? <Text style={styles.error}>{errors.title}</Text> : null}

        <TextInput
          accessibilityLabel="Category"
          placeholder="Category (e.g. Work)"
          value={category}
          onChangeText={setCategory}
          style={styles.input}
          maxLength={30}
        />

        <Text style={styles.fieldLabel}>Priority</Text>
        <View style={styles.priorityRow}>
          {priorities.map((option) => {
            const active = priority === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setPriority(option.value)}
                style={({ pressed }) => [
                  styles.priorityPill,
                  active && styles.activePriority,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    active && styles.activePriorityText,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          accessibilityLabel="Estimate"
          keyboardType="numeric"
          placeholder="Estimate (minutes)"
          value={estimateText}
          onChangeText={setEstimateText}
          style={styles.input}
        />
        {errors.estimate ? (
          <Text style={styles.error}>{errors.estimate}</Text>
        ) : null}

        <TextInput
          accessibilityLabel="Deadline"
          placeholder="Deadline (YYYY-MM-DD)"
          value={deadline}
          onChangeText={setDeadline}
          style={styles.input}
        />
        {errors.deadline ? (
          <Text style={styles.error}>{errors.deadline}</Text>
        ) : null}

        {taskError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {taskError}
          </Text>
        ) : null}

        <Pressable
          testID="add-task-submit"
          accessibilityRole="button"
          onPress={() => void handleSubmit()}
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.submitLabel}>Add Task</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F6FC',
  },
  form: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  heading: {
    marginBottom: 24,
    color: '#2D2D2D',
    fontSize: 28,
    fontWeight: '700',
  },
  input: {
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E0EC',
    backgroundColor: '#fff',
    color: '#2D2D2D',
    fontSize: 16,
  },
  error: {
    marginBottom: 12,
    color: '#B42318',
    fontSize: 13,
  },
  fieldLabel: {
    marginTop: 12,
    marginBottom: 8,
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  priorityPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#8B7BC7',
    backgroundColor: '#fff',
  },
  activePriority: {
    backgroundColor: '#8B7BC7',
  },
  priorityText: {
    color: '#8B7BC7',
    fontWeight: '600',
  },
  activePriorityText: {
    color: '#fff',
  },
  submitButton: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 15,
    borderRadius: 24,
    backgroundColor: '#8B7BC7',
  },
  submitLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
});
```

### `src/app/screens/HomeScreen.tsx`

```tsx
import { useCallback } from 'react';
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
                onToggleComplete={(id) => {
                  void tasksHook.toggleTaskCompletion(id);
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

### `src/app/screens/__tests__/AddScreen.test.tsx`

```tsx
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Text, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTasks } from '../../../features/tasks/useTasks';
import type { UseTasksResult } from '../../../features/tasks/useTasks';
import { AddScreen } from '../AddScreen';

jest.mock('../../../features/tasks/useTasks', () => ({
  useTasks: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual<typeof import('@react-navigation/native')>(
    '@react-navigation/native',
  ),
  useNavigation: jest.fn(),
}));

const mockNavigate = jest.fn();

function renderScreen(): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(createElement(AddScreen));
  });
  return renderer;
}

function taskHookResult(): UseTasksResult {
  return {
    tasks: [],
    loading: false,
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
  };
}

describe('AddScreen', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    jest.mocked(useNavigation).mockReturnValue({
      navigate: mockNavigate,
    } as ReturnType<typeof useNavigation>);
    jest.mocked(useTasks).mockReturnValue(taskHookResult());
  });

  it('displays validation error for empty title', async () => {
    const tasks = taskHookResult();
    jest.mocked(useTasks).mockReturnValue(tasks);
    const renderer = renderScreen();
    const submitButton = renderer.root.findByProps({ testID: 'add-task-submit' });

    await act(async () => {
      submitButton!.props.onPress();
    });

    expect(
      renderer.root
        .findAllByType(Text)
        .some((node) => node.props.children === 'Task title cannot be empty.'),
    ).toBe(true);
    expect(tasks.createTask).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('calls createTask and navigates home on valid submit', async () => {
    const tasks = taskHookResult();
    jest.mocked(useTasks).mockReturnValue(tasks);
    const renderer = renderScreen();
    const titleInput = renderer.root
      .findAllByType(TextInput)
      .find((input) => input.props.placeholder === 'What needs to be done?');
    expect(titleInput).toBeDefined();

    act(() => {
      titleInput!.props.onChangeText('Write a test');
    });

    const submitButton = renderer.root.findByProps({ testID: 'add-task-submit' });

    await act(async () => {
      submitButton!.props.onPress();
    });

    expect(tasks.createTask).toHaveBeenCalledWith({
      title: 'Write a test',
      priority: 'medium',
      estimate: undefined,
      deadline: undefined,
      category: undefined,
      steps: [],
    });
    expect(mockNavigate).toHaveBeenCalledWith('Home');
    act(() => renderer.unmount());
  });
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
  TaskCard: ({ task }: { task: { title: string } }) => {
    const React = jest.requireActual<typeof import('react')>('react');
    const ReactNative =
      jest.requireActual<typeof import('react-native')>('react-native');
    return React.createElement(ReactNative.Text, null, task.title);
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

const tasksResult = (): UseTasksResult => ({
  tasks: [],
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
});
```

## Commands and exit status

| Command | Exit status |
|---|---:|
| `npm exec tsc -- --noEmit` | 0 |
| `npm test -- --runInBand` | 0 |
