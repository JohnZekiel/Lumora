import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  loadSettings,
  saveSettings,
} from '../../../infrastructure/storage/settingsRepository';
import { DEFAULT_SETTINGS } from '../../../shared/settings/settingsDefaults';
import type { UserSettings } from '../../../shared/types/settings';
import { useSettings, type UseSettingsResult } from '../useSettings';

jest.mock('../../../infrastructure/storage/settingsRepository', () => ({
  loadSettings: jest.fn(),
  saveSettings: jest.fn(),
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

const storedSettings: UserSettings = {
  ...DEFAULT_SETTINGS,
  customTags: ['work'],
  colorScheme: 'dark',
};

describe('useSettings', () => {
  beforeEach(() => {
    jest.mocked(loadSettings).mockReset();
    jest.mocked(saveSettings).mockReset();
    jest.mocked(loadSettings).mockResolvedValue({
      ...DEFAULT_SETTINGS,
      customTags: [],
    });
    jest.mocked(saveSettings).mockResolvedValue();
  });

  it('loads settings on mount without saving and clears loading', async () => {
    jest.mocked(loadSettings).mockResolvedValue(storedSettings);

    const { result, renderer } = await renderHook(() => useSettings());

    expect(result.current.settings).toEqual(storedSettings);
    expect(result.current.loading).toBe(false);
    expect(loadSettings).toHaveBeenCalledTimes(1);
    expect(saveSettings).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('validates, updates, and saves partial settings', async () => {
    const { result, renderer } = await renderHook(() => useSettings());

    await act(async () => {
      await result.current.updateSettings({
        colorScheme: 'dark',
        focusDurationSeconds: 1800,
      });
    });

    expect(result.current.settings).toEqual({
      ...DEFAULT_SETTINGS,
      customTags: [],
      colorScheme: 'dark',
      focusDurationSeconds: 1800,
    });
    expect(saveSettings).toHaveBeenCalledWith(result.current.settings);
    act(() => renderer.unmount());
  });

  it('keeps the default when an invalid value is provided', async () => {
    const { result, renderer } = await renderHook(() => useSettings());

    await act(async () => {
      await result.current.updateSettings({ focusDurationSeconds: 99999 });
    });

    expect(result.current.settings.focusDurationSeconds).toBe(
      DEFAULT_SETTINGS.focusDurationSeconds,
    );
    act(() => renderer.unmount());
  });

  it('keeps optimistic settings and exposes an error when saving fails', async () => {
    jest.mocked(saveSettings).mockRejectedValue(new Error('write failed'));
    const { result, renderer } = await renderHook(() => useSettings());

    await act(async () => {
      await result.current.updateSettings({ autoStart: true });
    });

    expect(result.current.settings.autoStart).toBe(true);
    expect(result.current.error).toBe('write failed');
    act(() => renderer.unmount());
  });

  it('reloads settings and replaces the current value', async () => {
    const { result, renderer } = await renderHook(() => useSettings());
    jest.mocked(loadSettings).mockResolvedValue(storedSettings);

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.settings).toEqual(storedSettings);
    expect(result.current.loading).toBe(false);
    expect(saveSettings).not.toHaveBeenCalled();
    act(() => renderer.unmount());
  });

  it('surfaces initial load errors', async () => {
    jest.mocked(loadSettings).mockRejectedValue(new Error('read failed'));

    const { result, renderer } = await renderHook<UseSettingsResult>(() =>
      useSettings(),
    );

    expect(result.current.error).toBe('read failed');
    expect(result.current.loading).toBe(false);
    act(() => renderer.unmount());
  });
});
