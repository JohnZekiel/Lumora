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
