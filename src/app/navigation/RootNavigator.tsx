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
            tabBarActiveTintColor: '#4A7859',
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
