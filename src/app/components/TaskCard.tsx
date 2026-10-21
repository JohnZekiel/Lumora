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
