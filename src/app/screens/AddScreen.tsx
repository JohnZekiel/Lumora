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
