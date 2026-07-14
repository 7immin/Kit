// mobile/app/questions.tsx
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { socket } from '../lib/socket';
import { EVENTS } from '../../shared/events';
import { useKitStore } from '../store/useKitStore';
import { colors, radius } from '../constants/theme';

function fmt(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function DuringQuestionsView() {
  const allowMidQuestions = useKitStore((s) => s.allowMidQuestions);
  const questionsDuring = useKitStore((s) => s.questionsDuring);

  useEffect(() => {
    useKitStore.setState({ unreadQuestionCount: 0 });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headbar}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <Text style={styles.iconBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.headTitle}>발표 중 질문</Text>
      </View>

      {!allowMidQuestions ? (
        <View style={styles.emptyHint}>
          <Text style={styles.emptyHintText}>이번 발표는 발표 중 질문을 받지 않아요.{'\n'}질문은 발표가 끝난 뒤에 확인할 수 있어요.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollBody}>
          {questionsDuring.length === 0 ? (
            <View style={styles.emptyHint}>
              <Text style={styles.emptyHintText}>아직 들어온 질문이 없어요.</Text>
            </View>
          ) : (
            questionsDuring.map((q) => (
              <View key={q.questionId} style={styles.qcard}>
                <Text style={styles.qcardText}>{q.text}</Text>
                <View style={styles.qcardMeta}>
                  <Text style={styles.qcardNick}>{q.nickname}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function EndedQuestionsView() {
  const userId = useKitStore((s) => s.userId);
  const totalElapsedSeconds = useKitStore((s) => s.totalElapsedSeconds);
  const questionsAfter = useKitStore((s) => s.questionsAfter);
  const answeredQuestions = useKitStore((s) => s.answeredQuestions);
  const answeringQuestion = useKitStore((s) => s.answeringQuestion);
  const [mySelectedId, setMySelectedId] = useState<string | null>(null);

  const iAmAnswering = answeringQuestion !== null && answeringQuestion.answeringPresenterId === userId;
  const someoneElseAnswering = answeringQuestion !== null && answeringQuestion.answeringPresenterId !== userId;

  const handleSelect = (questionId: string) => {
    setMySelectedId((prev) => (prev === questionId ? null : questionId));
  };

  const handleStartAnswering = () => {
    if (!mySelectedId) return;
    socket.emit(EVENTS.QUESTION_ANSWERING_START, { questionId: mySelectedId });
  };

  const handleEndAnswering = () => {
    socket.emit(EVENTS.QUESTION_ANSWERING_END, {});
    setMySelectedId(null);
  };

  const handleFinish = () => {
    socket.emit(EVENTS.ROOM_LEAVE, {});
    useKitStore.getState().resetRoomState();
    router.replace('/');
  };

  let bottomButton: { label: string; onPress?: () => void; disabled?: boolean } | null = null;
  if (iAmAnswering) {
    bottomButton = { label: '답변 종료하기', onPress: handleEndAnswering };
  } else if (someoneElseAnswering) {
    bottomButton = { label: `${answeringQuestion?.answeringPresenterName ?? '다른 발표자'}님이 답변 중이에요`, disabled: true };
  } else if (mySelectedId) {
    bottomButton = { label: '답변하기', onPress: handleStartAnswering };
  } else if (questionsAfter.length > 0) {
    bottomButton = { label: '질문을 선택해주세요', disabled: true };
  }

  return (
    <View style={styles.container}>
      <View style={styles.headbar}>
        <Pressable style={styles.iconBtn} onPress={handleFinish}>
          <Text style={styles.iconBtnText}>✕</Text>
        </Pressable>
        <Text style={styles.headTitle}>질문</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}>
        <View style={styles.endedBanner}>
          <Text style={styles.endedEyebrow}>발표 종료됨</Text>
          <Text style={styles.endedTime}>{fmt(totalElapsedSeconds)}</Text>
        </View>

        <Text style={styles.hintText}>질문을 선택한 뒤 답변하기를 누르면 디스플레이 화면에 크게 뜨고, 청중 화면 목록 위에 고정돼요.</Text>

        {answeringQuestion && (
          <>
            <Text style={styles.sectionTitle}>답변 중인 질문</Text>
            <View style={[styles.qcard, styles.qcardLive]}>
              <Text style={styles.qcardText}>{answeringQuestion.text}</Text>
              <View style={styles.qcardMeta}>
                <Text style={styles.qcardNick}>{answeringQuestion.nickname}</Text>
                <Text style={styles.qcardTagLive}>
                  {/* [수정] 본인이 답변 중일 때 '나'로 하드코딩해서 보여주고 있었음 — 실제 등록된
                      이름이 뜨도록 고침 (서버가 이 이벤트에 실어주는 이름을 그대로 사용) */}
                  {answeringQuestion.answeringPresenterName}님이 답변 중
                </Text>
              </View>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>답변 안된 질문 ({questionsAfter.length})</Text>
        {questionsAfter.length === 0 ? (
          !answeringQuestion && (
            <View style={styles.emptyHint}>
              <Text style={styles.emptyHintText}>아직 남은 질문이 없어요.{'\n'}새 질문이 오면 여기 쌓여요.</Text>
            </View>
          )
        ) : (
          questionsAfter.map((q) => {
            const selected = mySelectedId === q.questionId;
            return (
              <Pressable
                key={q.questionId}
                style={[styles.qcard, selected && styles.qcardSelected]}
                onPress={() => handleSelect(q.questionId)}
              >
                <Text style={styles.qcardText}>{q.text}</Text>
                <View style={styles.qcardMeta}>
                  <Text style={styles.qcardNick}>{q.nickname}</Text>
                  <Text style={styles.qcardTagPending}>답변 안됨</Text>
                </View>
                {selected && (
                  <View style={styles.qcardCheck}>
                    <Text style={styles.qcardCheckText}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })
        )}

        {answeredQuestions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>답변된 질문 ({answeredQuestions.length})</Text>
            {answeredQuestions.map((q) => (
              <View key={q.questionId} style={[styles.qcard, styles.qcardAnswered]}>
                <Text style={styles.qcardText}>{q.text}</Text>
                <View style={styles.qcardMeta}>
                  <Text style={styles.qcardNick}>{q.nickname}</Text>
                  <Text style={styles.qcardTagDone}>답변됨</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {bottomButton && (
        <View style={styles.bottomAction}>
          <Pressable
            style={[styles.primaryButton, bottomButton.disabled && styles.disabled]}
            disabled={bottomButton.disabled}
            onPress={bottomButton.onPress}
          >
            <Text style={styles.primaryButtonText}>{bottomButton.label}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function QuestionsScreen() {
  const sessionEnded = useKitStore((s) => s.sessionEnded);
  return sessionEnded ? <EndedQuestionsView /> : <DuringQuestionsView />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },

  headbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 56, paddingHorizontal: 12, paddingBottom: 6 },
  headTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  iconBtn: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnText: { fontSize: 18, color: colors.ink },

  scrollBody: { padding: 20, paddingTop: 8 },

  emptyHint: { paddingVertical: 30, paddingHorizontal: 14, alignItems: 'center' },
  emptyHintText: { textAlign: 'center', color: colors.inkFaint, fontSize: 12.5, lineHeight: 19 },

  endedBanner: {
    padding: 16, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', marginBottom: 14,
  },
  endedEyebrow: { color: colors.spot, fontSize: 11, fontWeight: '700' },
  endedTime: { fontSize: 24, fontWeight: '700', color: colors.cue, marginTop: 4 },

  hintText: { fontSize: 12.5, color: colors.inkFaint, lineHeight: 19, marginBottom: 14 },

  sectionTitle: { fontSize: 14, color: colors.inkDim, fontWeight: '600', marginBottom: 10, marginTop: 6 },

  qcard: {
    padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1,
    borderColor: colors.hairline, marginBottom: 9, position: 'relative',
  },
  qcardSelected: { borderColor: colors.spot, backgroundColor: 'rgba(47,95,224,0.05)' },
  qcardLive: { borderColor: colors.cue, backgroundColor: 'rgba(14,138,125,0.06)' },
  qcardAnswered: { opacity: 0.72 },
  qcardText: { fontSize: 13.5, lineHeight: 20, color: colors.ink, paddingRight: 20 },
  qcardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  qcardNick: { fontSize: 11.5, color: colors.cue, fontWeight: '600' },
  qcardTagPending: { fontSize: 11.5, color: colors.spot, fontWeight: '700' },
  qcardTagLive: { fontSize: 11.5, color: colors.cue, fontWeight: '700' },
  qcardTagDone: { fontSize: 11.5, color: colors.inkDim, fontWeight: '600' },
  qcardCheck: {
    position: 'absolute', top: 12, right: 12, width: 22, height: 22, borderRadius: 999,
    backgroundColor: colors.spot, alignItems: 'center', justifyContent: 'center',
  },
  qcardCheckText: { color: colors.spotInk, fontSize: 12, fontWeight: '700' },

  bottomAction: { padding: 20, paddingTop: 8 },
  primaryButton: {
    height: 52, borderRadius: radius.md, backgroundColor: colors.spot,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryButtonText: { color: colors.spotInk, fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.4 },
});
