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
