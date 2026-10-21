# Copilot changes - prompt 13c

## Updated excerpts

### `src/app/screens/HomeScreen.tsx` - timer controls

```tsx
          <View style={styles.controls}>
            {timer.state.isRunning ? (
              <ActionButton label="Pause" onPress={() => void timer.pause()} />
            ) : remainingSeconds > 0 ? (
              <ActionButton
                label={isAtFullDuration ? 'Start' : 'Resume'}
                onPress={() => {
                  if (isAtFullDuration) {
                    void timer.start(selectedTaskId);
                  } else {
                    void timer.resume();
                  }
                }}
                primary
              />
            ) : null}
            <ActionButton label="Reset" onPress={() => void timer.reset()} />
          </View>
```

### `src/features/focus/useTimer.ts` - settings synchronization effect

```tsx
  useEffect(() => {
    const newDurations = durationsFromSettings();
    const prev = stateRef.current;
    const nextState: TimerState =
      !prev.isRunning &&
      prev.endTime === undefined &&
      prev.remainingSeconds === prev.durations[prev.mode]
        ? {
            ...prev,
            durations: newDurations,
            remainingSeconds: newDurations[prev.mode],
          }
        : {
            ...prev,
            durations: newDurations,
          };

    stateRef.current = nextState;
    setState(nextState);
  }, [options.settings, durationsFromSettings]);
```

### `src/app/screens/AddScreen.tsx` - deadline formatting

```tsx
  const handleDeadlineChange = (text: string): void => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 4 && cleaned.length <= 6) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    } else if (cleaned.length > 6) {
      formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
    }
    setDeadline(formatted);
  };
```

```tsx
        <TextInput
          accessibilityLabel="Deadline"
          placeholder="Deadline (YYYY-MM-DD)"
          value={deadline}
          onChangeText={handleDeadlineChange}
          keyboardType="numeric"
          style={styles.input}
        />
```

## Verification

- `npm exec tsc -- --noEmit` - exit status 0.
- `npm test -- --runInBand` - exit status 0 (203 tests, 19 suites).