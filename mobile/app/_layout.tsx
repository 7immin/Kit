import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSocketListeners } from '../hooks/useSocketListeners';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useSocketListeners();

  return (
    // remote.tsx의 슬라이드 스와이프 제스처(GestureDetector)가 동작하려면 트리 최상단에
    // GestureHandlerRootView가 반드시 있어야 함 (expo-router가 자동으로 감싸주지 않음)
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="waiting" />
          {/* [수정] remote.tsx에 자체 좌우 스와이프(슬라이드 넘기기)가 있는데, 기본으로 켜져있는
              iOS/OS 자체의 "오른쪽 스와이프 = 뒤로가기" 제스처와 충돌해서 화면이 통째로 팝되며
              index.tsx로 돌아가버리고(뒤로가기 시 방 정리 로직 때문에) 방에서 나가지는 문제가 있었음.
              발표 종료 버튼 + 첫 슬라이드에서 스와이프 시 취소 확인 팝업으로 나가는 길은 이미
              충분하므로, 이 화면에서는 시스템 뒤로가기 스와이프 자체를 꺼서 충돌을 없앰 */}
          <Stack.Screen name="remote" options={{ gestureEnabled: false }} />
          <Stack.Screen name="questions" />
          <Stack.Screen name="history" />
          {/* [수정] note-editor는 이제 슬라이드별로 저장 안 한 초안(drafts)을 들고 있다가 저장
              버튼 한 번에 한꺼번에 반영하는데, 모달 화면은 iOS에서 아래로 스와이프해서 그냥
              닫아버릴 수 있어서(뒤로가기 버튼의 "저장 안 하고 나가기" 확인 절차를 완전히 건너뜀)
              그 상태로 나가면 초안이 소리 없이 사라져버림. 그래서 스와이프로 닫는 것 자체를 막고
              반드시 헤더의 뒤로가기 버튼(확인창 있음)으로만 나가게 함 */}
          <Stack.Screen name="note-editor" options={{ presentation: 'modal', gestureEnabled: false }} />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}