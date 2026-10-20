import { useCallback, useEffect, useRef, useState } from 'react';
import { loadSettings, saveSettings } from '../../infrastructure/storage/settingsRepository';
import { validateSettings } from '../../shared/settings/settingsValidation';
import { DEFAULT_SETTINGS } from '../../shared/settings/settingsDefaults';
import type { UserSettings } from '../../shared/types/settings';

export type UseSettingsResult = {
  settings: UserSettings;
  loading: boolean;
  error?: string;
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  reload: () => Promise<void>;
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<UserSettings>({
    ...DEFAULT_SETTINGS,
    customTags: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const settingsRef = useRef(settings);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const loadedSettings = await loadSettings();
      settingsRef.current = loadedSettings;
      setSettings(loadedSettings);
      setError(undefined);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Unable to load settings.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateSettings = useCallback(
    async (partial: Partial<UserSettings>): Promise<void> => {
      const nextSettings = validateSettings({
        ...settingsRef.current,
        ...partial,
      });
      if (nextSettings === null) {
        setError('Unable to validate settings.');
        return;
      }

      settingsRef.current = nextSettings;
      setSettings(nextSettings);
      setError(undefined);

      try {
        await saveSettings(nextSettings);
      } catch (saveError) {
        setError(getErrorMessage(saveError, 'Unable to save settings.'));
      }
    },
    [],
  );

  return {
    settings,
    loading,
    ...(error === undefined ? {} : { error }),
    updateSettings,
    reload,
  };
}
