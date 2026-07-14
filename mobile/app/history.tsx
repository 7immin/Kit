// mobile/app/history.tsx
//
// TODO(B): 발표 기록 상세 조회 API 확정되면 아래 PLACEHOLDER_DETAILS를
// `GET /rooms/history/:id` (혹은 합의된 엔드포인트) fetch 결과로 교체할 것.
// 지금은 UI 구조만 목업(kit_mockup_3.html 화면7)대로 잡아둔 상태.
import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors, radius } from '../constants/theme';

interface HistoryDetail {
  id: string;
  title: string;
  date: string;
  duration: string;
  file: string;
  scriptFile: string | null;
  speakerNames: string[];
  audienceCount: number;
  answeredQuestions: { text: string; nickname: string }[];
}

// TODO(B): 실제 API 응답으로 대체
const PLACEHOLDER_DETAILS: Record<string, HistoryDetail> = {
  h1: {
    id: 'h1',
    title: '2026 상반기 팀 회고',
    date: '2026.06.28',
    duration: '42분',
    file: 'team_retro.pdf',
    scriptFile: 'team_retro_script.txt',
    speakerNames: ['규민', '서연', '민준'],
    audienceCount: 14,
    answeredQuestions: [
      { text: '다음 분기 목표는 어디에서 확인할 수 있나요?', nickname: '서연' },
      { text: '회고에서 나온 액션 아이템은 누가 트래킹하나요?', nickname: '민준' },
    ],
  },
  h2: {
    id: 'h2',
    title: 'Kit 프로젝트 중간발표',
    date: '2026.07.03',
    duration: '18분',
    file: 'kit_midterm.pdf',
    scriptFile: null,
    speakerNames: ['규민', '하은'],
    audienceCount: 9,
    answeredQuestions: [
      { text: '실시간 동기화는 어떤 방식으로 구현하셨나요?', nickname: '하은' },
    ],
  },
};

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const detail = (id && PLACEHOLDER_DETAILS[id]) || PLACEHOLDER_DETAILS.h1;

  return (
    <View style={styles.container}>
      <View style={styles.headbar}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <Text style={styles.iconBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.headTitle}>상세 기록</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}>
        <Text style={styles.eyebrow}>{detail.date}</Text>
        <Text style={styles.title}>{detail.title}</Text>

        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <Text style={{ color: colors.cue }}>⏱</Text>
            </View>
            <View>
              <Text style={styles.heroValue}>{detail.duration}</Text>
              <Text style={styles.heroLabel}>발표 소요 시간</Text>
            </View>
          </View>
          <View style={[styles.heroRow, styles.heroRowDivider]}>
            <View style={styles.avatarStack}>
              {detail.speakerNames.map((name, i) => (
                <View key={name} style={[styles.avatar, i > 0 && { marginLeft: -12 }]}>
                  <Text style={styles.avatarText}>{name.slice(0, 1)}</Text>
                </View>
              ))}
            </View>
            <View>
              <Text style={styles.heroValue}>{detail.speakerNames.join(', ')}</Text>
              <Text style={styles.heroLabel}>발표자</Text>
            </View>
          </View>
        </View>

        <View style={styles.fileRow}>
          <View style={styles.fileIcon}>
            <Text style={{ color: colors.cue }}>▤</Text>
          </View>
          <Text style={styles.fileName} numberOfLines={1}>{detail.file}</Text>
        </View>
        {detail.scriptFile && (
          <View style={[styles.fileRow, { marginTop: 8 }]}>
            <View style={styles.fileIcon}>
              <Text style={{ color: colors.cue }}>📝</Text>
            </View>
            <Text style={styles.fileName} numberOfLines={1}>{detail.scriptFile}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>답변한 질문 ({detail.answeredQuestions.length})</Text>
        {detail.answeredQuestions.length === 0 ? (
          <Text style={styles.emptyHint}>답변한 질문이 없어요.</Text>
        ) : (
          detail.answeredQuestions.map((q, i) => (
            <View key={i} style={styles.qcard}>
              <Text style={styles.qcardText}>{q.text}</Text>
              <View style={styles.qcardMeta}>
                <Text style={styles.qcardNick}>{q.nickname}</Text>
                <Text style={styles.qcardTag}>답변완료</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  headbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 56, paddingHorizontal: 12, paddingBottom: 6 },
  headTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  iconBtn: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnText: { fontSize: 22, color: colors.ink },

  scrollBody: { padding: 20, paddingTop: 8 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.spot },
  title: { fontSize: 19, fontWeight: '700', color: colors.ink, marginTop: 8 },

  heroCard: {
    marginTop: 16, borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.hairline,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  heroRowDivider: { borderTopWidth: 1, borderTopColor: colors.hairline },
  heroIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceRaised,
    alignItems: 'center', justifyContent: 'center',
  },
  heroValue: { fontSize: 18, fontWeight: '700', color: colors.ink },
  heroLabel: { fontSize: 11, color: colors.inkFaint, marginTop: 3 },
  avatarStack: { flexDirection: 'row' },
  avatar: {
    width: 40, height: 40, borderRadius: 999, backgroundColor: colors.surfaceRaised,
    borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontWeight: '700', fontSize: 14, color: colors.ink },

  fileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, padding: 13,
    borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline,
  },
  fileIcon: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: colors.surfaceRaised,
    alignItems: 'center', justifyContent: 'center',
  },
  fileName: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.ink },

  sectionTitle: { fontSize: 14, color: colors.inkDim, fontWeight: '600', marginTop: 20, marginBottom: 10 },
  emptyHint: { color: colors.inkFaint, fontSize: 12.5, textAlign: 'center', paddingVertical: 20 },

  qcard: {
    padding: 13, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1,
    borderColor: colors.hairline, marginBottom: 9,
  },
  qcardText: { fontSize: 13.5, lineHeight: 20, color: colors.ink },
  qcardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  qcardNick: { fontSize: 11.5, color: colors.cue, fontWeight: '600' },
  qcardTag: { fontSize: 11.5, color: colors.inkDim, fontWeight: '600' },
});
