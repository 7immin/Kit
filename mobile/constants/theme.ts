export const colors = {
  canvas: '#ECEEF3',
  surface: '#FFFFFF',
  surfaceRaised: '#EEF1F6',
  hairline: '#E2E5EC',
  ink: '#171A21',
  inkDim: '#6B7180',
  inkFaint: '#868C9C',
  spot: '#2F5FE0',
  spotInk: '#FFFFFF',
  cue: '#0E8A7D',
  alert: '#D6393F',
  alertInk: '#FFFFFF',
};

export const radius = { lg: 28, md: 16, sm: 10 };

// 앱 전체는 라이트 톤 단일 팔레트(colors)만 쓰고 별도 다크 테마는 없음.
// use-theme-color 등 Expo 템플릿 잔재 컴포넌트가 기대하는 light/dark 형태로 매핑만 해준다.
const themeTone = {
  text: colors.ink,
  background: colors.canvas,
  tint: colors.spot,
  icon: colors.inkDim,
  tabIconDefault: colors.inkFaint,
  tabIconSelected: colors.spot,
};

export const Colors = {
  light: themeTone,
  dark: themeTone,
};