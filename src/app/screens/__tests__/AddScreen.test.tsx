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
