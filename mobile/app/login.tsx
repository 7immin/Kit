// mobile/app/login.tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SERVER_URL } from '../lib/socket';
import { colors, radius } from '../constants/theme';
import * as SecureStore from 'expo-secure-store';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      alert('이메일과 비밀번호를 입력해주세요');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }), // TODO: B 확인 후 필드명 조정
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || '로그인에 실패했어요');
        return;
      }
      await SecureStore.setItemAsync('token', data.token);
      router.replace('/');
    } catch (e) {
      alert('서버에 연결할 수 없어요');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.brandBadge}>K</Text>
      <Text style={styles.title}>Kit에 로그인</Text>

      <TextInput
        style={styles.input}
        placeholder="이메일"
        placeholderTextColor={colors.inkFaint}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        placeholderTextColor={colors.inkFaint}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Pressable style={styles.primaryButton} onPress={handleLogin}>
        <Text style={styles.primaryButtonText}>{loading ? '로그인 중...' : '로그인'}</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/signup')}>
        <Text style={styles.link}>계정이 없으신가요? 회원가입</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, justifyContent: 'center', padding: 24, gap: 10 },
  brandBadge: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: colors.spot, color: colors.spotInk,
    textAlign: 'center', lineHeight: 48, fontWeight: '700', fontSize: 20, alignSelf: 'center', marginBottom: 12,
    overflow: 'hidden',
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.ink, textAlign: 'center', marginBottom: 20 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline,
    borderRadius: 14, height: 50, paddingHorizontal: 14, fontSize: 14, color: colors.ink,
  },
  primaryButton: {
    height: 52, borderRadius: 16, backgroundColor: colors.spot,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  primaryButtonText: { color: colors.spotInk, fontWeight: '700', fontSize: 15.5 },
  link: { color: colors.cue, textAlign: 'center', marginTop: 14, fontSize: 13 },
});