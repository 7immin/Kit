import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSocketListeners } from '../hooks/useSocketListeners';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useSocketListeners();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="waiting" />
        <Stack.Screen name="remote" />
        <Stack.Screen name="questions" />
        <Stack.Screen name="history" />
        <Stack.Screen name="note-editor" options={{ presentation: 'modal' }} />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}