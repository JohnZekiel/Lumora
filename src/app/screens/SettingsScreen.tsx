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
    backgroundColor: '#F4F8F5',
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
    backgroundColor: '#EDF3EF',
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
    backgroundColor: '#4A7859',
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
