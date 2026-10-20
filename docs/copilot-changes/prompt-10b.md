# Copilot changes - prompt 10b

## Full final contents

### `src/app/navigation/RootNavigator.tsx`

```typescript
    import { Ionicons } from '@expo/vector-icons';
    import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
    import { useSafeAreaInsets } from 'react-native-safe-area-context';
    import { AddScreen } from '../screens/AddScreen';
    import { HomeScreen } from '../screens/HomeScreen';
    import { ProfileScreen } from '../screens/ProfileScreen';
    import { SettingsScreen } from '../screens/SettingsScreen';
    import { TimerScreen } from '../screens/TimerScreen';

    export type RootTabParamList = {
      Home: undefined;
      Timer: undefined;
      Add: undefined;
      Settings: undefined;
      Profile: undefined;
    };

    const Tab = createBottomTabNavigator<RootTabParamList>();

    export function RootNavigator() {
      const insets = useSafeAreaInsets();

      return (
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: '#8B7BC7',
            tabBarInactiveTintColor: '#999',
            tabBarStyle: { paddingBottom: insets.bottom },
            tabBarIcon: ({ color, size }) => {
              const iconMap = {
                Home: 'home-outline',
                Timer: 'timer-outline',
                Add: 'add-circle-outline',
                Settings: 'settings-outline',
                Profile: 'person-outline',
              } as const;

              const iconName = iconMap[route.name];

              return <Ionicons name={iconName} color={color} size={size} />;
            },
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Timer" component={TimerScreen} />
          <Tab.Screen name="Add" component={AddScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      );
    }
```

### `src/app/navigation/__tests__/RootNavigator.test.tsx`

```tsx
import { act, create } from 'react-test-renderer';
import { createElement } from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '../RootNavigator';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('RootNavigator', () => {
  it('renders the app shell with all five tab labels', () => {
    let renderer: ReturnType<typeof create>;

    expect(() => {
      act(() => {
        renderer = create(
          createElement(
            SafeAreaProvider,
            {
              initialMetrics: {
                frame: { x: 0, y: 0, width: 390, height: 844 },
                insets: { top: 0, right: 0, bottom: 0, left: 0 },
              },
            },
            createElement(
              NavigationContainer,
              null,
              createElement(RootNavigator),
            ),
          ),
        );
      });
    }).not.toThrow();

    const renderedTree = JSON.stringify(renderer!.toJSON());
    for (const label of ['Home', 'Timer', 'Add', 'Settings', 'Profile']) {
      expect(renderedTree).toContain(label);
    }

    act(() => renderer!.unmount());
  });
});
```

## Commands and exit status

| Command | Exit status |
|---|---:|
| `npm exec tsc -- --noEmit` (first run; Jest global import missing) | 2 |
| `npm exec tsc -- --noEmit` (after importing `jest` from `@jest/globals`) | 0 |
| `npm test -- --runInBand` (initial smoke test; safe-area provider did not render children) | 1 |
| `npm test -- --runInBand src/app/navigation/__tests__/RootNavigator.test.tsx` (after explicit safe-area metrics; renderer cleanup warnings remained) | 0 |
| `npm test -- --runInBand src/app/navigation/__tests__/RootNavigator.test.tsx` (after unmount cleanup) | 0 |
| `npm exec tsc -- --noEmit` (final run) | 0 |
| `npm test -- --runInBand` (final run: 194 tests, 16 suites) | 0 |
