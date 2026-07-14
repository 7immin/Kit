// mobile/app/index.tsx
import { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { socket, getLocalUserId } from '../lib/socket';
import { EVENTS } from '../../shared/events';
import { useKitStore } from '../store/useKitStore';
import { colors, radius } from '../constants/theme';

// TODO: 발표 기록 조회 API 준비되면 실제 데이터로 교체
const PLACEHOLDER_HISTORY = [
  { id: 'h1', title: '2026 상반기 팀 회고', date: '2026.06.28', duration: '42분' },
  { id: 'h2', title: 'Kit 프로젝트 중간발표', date: '2026.07.03', duration: '18분' },
];

export default function StartScreen() {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');

  // [추가] 뒤로가기 등으로 방(대기화면/리모컨 등)에서 시작화면으로 돌아오면, 소켓을 완전히 끊었다
  // 다시 붙게 만들어서 서버 쪽에 남아있던 예전 방 멤버십(및 그 방의 타이머 브로드캐스트 수신)을
  // 정리한다. 서버에 ROOM_LEAVE 처리 로직이 아직 없어서, 연결을 통째로 끊는 게 지금 확실히
  // 청소되는 유일한 방법 — disconnect되면 소켓은 서버의 모든 room에서 자동으로 빠짐.
  useFocusEffect(
    useCallback(() => {
      const { roomId } = useKitStore.getState();
      if (roomId) {
        socket.emit(EVENTS.ROOM_LEAVE, {});
        socket.disconnect();
        useKitStore.getState().resetRoomState();
      }
    }, [])
  );

  const handleCreateRoom = () => {
    if (!title.trim()) {
      alert('발표 제목을 입력해주세요');
      return;
    }

    const doEmit = () => {
      socket.once(EVENTS.ROOM_CREATED, (payload: any) => {
        useKitStore.getState().setRoomCreated({
          ...payload,
          role: 'presenter',
          nickname: name || '발표자',
        });
        router.push('/waiting');
      });
      socket.emit(EVENTS.ROOM_CREATE, { title: title.trim(), name: name || '발표자', userId: getLocalUserId() });
    };

    if (socket.connected) {
      doEmit();
    } else {
      socket.once('connect', doEmit);
      socket.connect();
    }
  };

  const handleJoinWithCode = () => {
    if (!joinCode.trim()) return;
    if (!socket.connected) socket.connect();

    socket.once(EVENTS.ROOM_JOINED, (payload: any) => {
      useKitStore.getState().setRoomJoined(payload);
      router.push('/waiting');
    });

    socket.emit(EVENTS.ROOM_JOIN_PRESENTER, {
      presenterCode: joinCode.trim().toUpperCase(),
      name: name || '발표자',
      userId: getLocalUserId(),
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 브랜드 마크 */}
      <View style={styles.brandRow}>
        <View style={styles.brandBadge}>
          <Text style={styles.brandBadgeText}>K</Text>
        </View>
        <Text style={styles.brandName}>Kit</Text>
      </View>

      {/* 방 생성 카드 */}
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>READY WHEN YOU ARE</Text>
        <Text style={styles.heroTitle}>새 발표방을 열까요?</Text>
        <Text style={styles.heroSub}>자료를 올리고, 코드를 공유하고, 바로 시작하세요.</Text>

        <TextInput
          style={styles.input}
          placeholder="발표 제목"
          placeholderTextColor={colors.inkFaint}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="이름"
          placeholderTextColor={colors.inkFaint}
          value={name}
          onChangeText={setName}
        />

        <Pressable style={styles.primaryButton} onPress={handleCreateRoom}>
          <Text style={styles.primaryButtonText}>발표 방 만들기</Text>
        </Pressable>
      </View>

      {/* 코드로 참가 카드 */}
      <View style={styles.joinCard}>
        <Text style={styles.joinLabel}>코드로 참가하기</Text>
        <View style={styles.joinRow}>
          <TextInput
            style={styles.joinInput}
            placeholder="발표자 코드"
            placeholderTextColor={colors.inkFaint}
            value={joinCode}
            onChangeText={setJoinCode}
            autoCapitalize="characters"
          />
          <Pressable style={styles.joinButton} onPress={handleJoinWithCode}>
            <Text style={styles.joinButtonText}>참가</Text>
          </Pressable>
        </View>
        <Text style={styles.joinHint}>다른 발표자는 발표자 코드를 입력해 방에 들어와요</Text>
      </View>

      {/* 최근 발표 목록 */}
      <Text style={styles.sectionTitle}>최근 발표</Text>
      {PLACEHOLDER_HISTORY.map((item) => (
        <Pressable
          key={item.id}
          style={styles.recentCard}
          onPress={() => router.push({ pathname: '/history', params: { id: item.id } })}
        >
          <View style={styles.recentThumb}>
            <Text style={{ color: colors.cue }}>▤</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.recentTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.recentMeta}>{item.date} · {item.duration}</Text>
          </View>
          <Text style={styles.recentChevron}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },

  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  brandBadge: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: colors.spot,
    alignItems: 'center', justifyContent: 'center',
  },
  brandBadgeText: { color: colors.spotInk, fontWeight: '700', fontSize: 16 },
  brandName: { fontSize: 17, fontWeight: '700', color: colors.ink },

  heroCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline,
    borderRadius: radius.lg, padding: 22, marginBottom: 16,
  },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.spot, marginBottom: 8 },
  heroTitle: { fontSize: 21, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  heroSub: { fontSize: 13, color: colors.inkDim, marginBottom: 18 },

  input: {
    backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.hairline,
    borderRadius: 14, height: 48, paddingHorizontal: 14, fontSize: 14, color: colors.ink,
    marginBottom: 10,
  },

  primaryButton: {
    height: 52, borderRadius: 16, backgroundColor: colors.spot,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  primaryButtonText: { color: colors.spotInk, fontWeight: '700', fontSize: 15.5 },

  joinCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline,
    borderRadius: radius.lg, padding: 18, marginBottom: 26,
  },
  joinLabel: { fontSize: 13.5, fontWeight: '700', color: colors.ink, marginBottom: 10 },
  joinRow: { flexDirection: 'row', gap: 8 },
  joinInput: {
    flex: 1, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.hairline,
    borderRadius: 14, height: 48, paddingHorizontal: 14, fontSize: 14, color: colors.ink,
  },
  joinButton: {
    width: 84, height: 48, borderRadius: 14, backgroundColor: colors.spot,
    alignItems: 'center', justifyContent: 'center',
  },
  joinButtonText: { color: colors.spotInk, fontWeight: '700', fontSize: 14 },
  joinHint: { fontSize: 11.5, color: colors.inkFaint, marginTop: 10 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.inkDim, marginBottom: 10 },

  recentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.md, padding: 14, marginBottom: 10,
  },
  recentThumb: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: colors.surfaceRaised,
    alignItems: 'center', justifyContent: 'center',
  },
  recentTitle: { fontSize: 14.5, fontWeight: '600', color: colors.ink },
  recentMeta: { fontSize: 12, color: colors.inkFaint, marginTop: 3 },
  recentChevron: { fontSize: 18, color: colors.inkFaint },
});