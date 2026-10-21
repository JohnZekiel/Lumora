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
