// mobile/app/signup.tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SERVER_URL } from '../lib/socket';
import { colors } from '../constants/theme';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password) {
      alert('모든 항목을 입력해주세요');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }), // TODO: B 확인 후 필드명 조정
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || '회원가입에 실패했어요');
        return;
      }
      alert('회원가입 완료! 로그인해주세요');
      router.replace('/login');
    } catch (e) {
      alert('서버에 연결할 수 없어요');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>회원가입</Text>

      <TextInput
        style={styles.input}
        placeholder="이름"
        placeholderTextColor={colors.inkFaint}
        value={name}
        onChangeText={setName}
      />
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

      <Pressable style={styles.primaryButton} onPress={handleSignup}>
        <Text style={styles.primaryButtonText}>{loading ? '가입 중...' : '회원가입'}</Text>
      </Pressable>

      <Pressable onPress={() => router.back()}>
        <Text style={styles.link}>이미 계정이 있으신가요? 로그인</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, justifyContent: 'center', padding: 24, gap: 10 },
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