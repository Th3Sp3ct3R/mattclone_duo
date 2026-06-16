import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useTheme } from '@julio/ui-native';

import { LoginScreen } from '@/screens/LoginScreen/LoginScreen.jsx';
import { HomeScreen } from '@/screens/HomeScreen/HomeScreen.jsx';

const Stack = createNativeStackNavigator();

export function RootNavigator({ auth }) {
  const isAuthed = Boolean(auth.user);
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.card },
        headerTintColor: theme.colors.foreground,
        headerTitleStyle: { color: theme.colors.foreground }
      }}
    >
      {isAuthed ? (
        <Stack.Screen name="Home" options={{ title: 'julio' }}>
          {(props) => <HomeScreen {...props} auth={auth} />}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="Login" options={{ title: 'Sign in' }}>
          {(props) => <LoginScreen {...props} auth={auth} />}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}


