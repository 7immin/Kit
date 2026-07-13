// mobile/app/waiting.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { socket, SERVER_URL } from '../lib/socket';
import { EVENTS } from '../../shared/events';
import { useKitStore } from '../store/useKitStore';
import { colors, radius } from '../constants/theme';

function AudienceCount() {
  const count = useKitStore((s) => s.audienceCount);
  return <Text style={styles.value}>청중 {count}명 입장</Text>;
}

function PresenterList() {
  const presenters = useKitStore((s) => s.presenters);
  return (
    <View>
      <Text style={styles.label}>발표자 ({presenters.length}명)</Text>
      {presenters.map((p) => (
        <Text key={p.userId} style={styles.value}>
          {p.name} {p.isCurrentPresenter ? '(현재 발표자)' : ''}
        </Text>
      ))}
    </View>
  );
}

function TimeStepper() {
  const [minutes, setMinutes] = useState(5);
  const roomId = useKitStore((s) => s.roomId);

  const change = (delta: number) => {
    const next = Math.min(60, Math.max(1, minutes + delta));
    setMinutes(next);
    socket.emit(EVENTS.ROOM_SETTINGS_UPDATE, { roomId, durationMinutes: next });
  };

  return (
    <View style={styles.row}>
      <Text style={styles.label}>발표 시간</Text>
      <View style={styles.stepper}>
        <Pressable style={styles.stepperBtn} onPress={() => change(-1)}>
          <Text style={styles.stepperBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{minutes}분</Text>
        <Pressable style={styles.stepperBtn} onPress={() => change(1)}>
          <Text style={styles.stepperBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SettingsToggles() {
  const [allowMidQuestions, setAllowMidQuestions] = useState(true);
  const [anonymous, setAnonymous] = useState(false);
  const roomId = useKitStore((s) => s.roomId);

  const toggleMidQ = () => {
    const next = !allowMidQuestions;
    setAllowMidQuestions(next);
    socket.emit(EVENTS.ROOM_SETTINGS_UPDATE, { roomId, allowMidQuestions: next });
  };
  const toggleAnon = () => {
    const next = !anonymous;
    setAnonymous(next);
    socket.emit(EVENTS.ROOM_SETTINGS_UPDATE, { roomId, anonymous: next });
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>질문자 익명 처리</Text>
        <Switch
          value={anonymous}
          onValueChange={toggleAnon}
          trackColor={{ false: colors.surfaceRaised, true: colors.spot }}
        />
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.label}>발표 중간 질문 허용</Text>
        <Switch
          value={allowMidQuestions}
          onValueChange={toggleMidQ}
          trackColor={{ false: colors.surfaceRaised, true: colors.spot }}
        />
      </View>
    </View>
  );
}

function DeckUploadButton() {
  const [uploading, setUploading] = useState(false);
  const deckUploaded = useKitStore((s) => s.deckUploaded);
  const roomId = useKitStore((s) => s.roomId);

  const handlePick = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
    if (result.canceled) return;

    const file = result.assets[0];
    setUploading(true);

    const formData = new FormData();
    formData.append('presentationFile', {
      uri: file.uri,
      name: file.name,
      type: 'application/pdf',
    } as any);

    try {
      const res = await fetch(`${SERVER_URL}/rooms/${roomId}/presentation`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = await res.json();
      if (data.success) {
        useKitStore.setState({ deckUploaded: true, slideCount: data.slideCount });
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert('업로드 실패, 서버 연결을 확인해주세요');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Pressable style={styles.uploadRow} onPress={handlePick}>
      <View style={[styles.uploadIcon, deckUploaded && styles.uploadIconDone]}>
        <Text style={{ color: deckUploaded ? colors.cue : colors.inkDim }}>{deckUploaded ? '✓' : '↑'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.uploadTitle}>
          {uploading ? '업로드 중...' : deckUploaded ? `발표 자료 업로드 완료 · ${useKitStore.getState().slideCount}슬라이드` : '발표자료 업로드'}
        </Text>
        <Text style={styles.uploadSub}>PDF</Text>
      </View>
    </Pressable>
  );
}

function ScriptUploadButton() {
  const [uploading, setUploading] = useState(false);
  const deckUploaded = useKitStore((s) => s.deckUploaded);
  const scriptProcessing = useKitStore((s) => s.scriptProcessing);
  const slideNotes = useKitStore((s) => s.slideNotes);
  const roomId = useKitStore((s) => s.roomId);

  const handlePick = async () => {
    if (!deckUploaded) {
      alert('발표 자료(PDF)를 먼저 업로드해주세요');
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({ type: 'text/plain' });
    if (result.canceled) return;

    const file = result.assets[0];
    setUploading(true);
    useKitStore.setState({ scriptProcessing: true });

    const formData = new FormData();
    formData.append('scriptFile', {
      uri: file.uri,
      name: file.name,
      type: 'text/plain',
    } as any);

    try {
      const res = await fetch(`${SERVER_URL}/rooms/${roomId}/script`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message);
        useKitStore.setState({ scriptProcessing: false }); // 버그 수정: 실패 시에도 로딩 상태 해제
      }
      // 성공 시 NOTES_READY 소켓 이벤트가 slideNotes/scriptProcessing을 갱신해줌
    } catch (e) {
      alert('업로드 실패, 서버 연결을 확인해주세요');
      useKitStore.setState({ scriptProcessing: false }); // 네트워크 실패 시에도 동일하게 해제
    } finally {
      setUploading(false);
    }
  };

  const label = uploading
    ? '전송 중...'
    : scriptProcessing
    ? 'AI가 슬라이드별로 정리 중...'
    : slideNotes.length > 0
    ? `대본 업로드 완료 · ${slideNotes.length}개 노트 생성됨`
    : '대본 업로드';

  return (
    <Pressable style={[styles.uploadRow, !deckUploaded && styles.disabled]} onPress={handlePick}>
      <View style={[styles.uploadIcon, slideNotes.length > 0 && styles.uploadIconDone]}>
        <Text style={{ color: slideNotes.length > 0 ? colors.cue : colors.inkDim }}>
          {scriptProcessing ? '…' : slideNotes.length > 0 ? '✓' : '↑'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.uploadTitle}>{label}</Text>
        <Text style={styles.uploadSub}>TXT</Text>
      </View>
    </Pressable>
  );
}

function NoteEditButton() {
  const slideCount = useKitStore((s) => s.slideCount);

  const handlePress = () => {
    if (slideCount === 0) {
      alert('먼저 발표 자료를 업로드해주세요');
      return;
    }
    useKitStore.setState({ currentNoteSlideIndex: 1 });
    router.push('/note-editor');
  };

  return (
    <Pressable style={styles.ghostButton} onPress={handlePress}>
      <Text style={styles.ghostButtonText}>노트 수정</Text>
    </Pressable>
  );
}

export default function WaitingScreen() {
  const title = useKitStore((s) => s.title);
  const displayCode = useKitStore((s) => s.displayCode);
  const presenterCode = useKitStore((s) => s.presenterCode);

  return (
    <View style={styles.container}>
      <Text style={styles.roomTitle}>{title ?? '제목 없는 발표'}</Text>

      <View style={styles.codeRow}>
        <View style={styles.codeChip}>
          <Text style={styles.codeLabel}>디스플레이 코드</Text>
          <Text style={styles.codeValue}>{displayCode ?? '-'}</Text>
        </View>
        <View style={styles.codeChip}>
          <Text style={styles.codeLabel}>발표자 코드</Text>
          <Text style={styles.codeValue}>{presenterCode ?? '-'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <PresenterList />
        <View style={styles.divider} />
        <AudienceCount />
      </View>

      <View style={{ height: 16 }} />
      <DeckUploadButton />
      <View style={{ height: 10 }} />
      <ScriptUploadButton />
      <View style={{ height: 10 }} />
      <NoteEditButton />

      <View style={{ height: 16 }} />
      <SettingsToggles />
      <View style={{ height: 10 }} />
      <View style={styles.card}>
        <TimeStepper />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, padding: 20, paddingTop: 60, gap: 4 },
  roomTitle: { color: colors.ink, fontSize: 19, fontWeight: '700', marginBottom: 16 },

  codeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  codeChip: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline,
    borderRadius: radius.md, padding: 12,
  },
  codeLabel: { color: colors.inkFaint, fontSize: 11 },
  codeValue: { color: colors.cue, fontSize: 16, fontWeight: '700', marginTop: 3 },

  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline,
    borderRadius: radius.md, padding: 14,
  },
  divider: { height: 1, backgroundColor: colors.hairline, marginVertical: 10 },

  label: { color: colors.inkDim, fontSize: 13 },
  value: { color: colors.ink, fontSize: 15 },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepperBtn: {
    width: 26, height: 26, borderRadius: 999, backgroundColor: colors.surfaceRaised,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnText: { color: colors.inkDim, fontSize: 16, fontWeight: '700' },
  stepperValue: { color: colors.ink, fontSize: 14, fontWeight: '700', minWidth: 34, textAlign: 'center' },

  uploadRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.hairline, borderRadius: radius.md, padding: 14,
  },
  disabled: { opacity: 0.45 },
  uploadIcon: {
    width: 36, height: 36, borderRadius: 11, backgroundColor: colors.surfaceRaised,
    alignItems: 'center', justifyContent: 'center',
  },
  uploadIconDone: { backgroundColor: 'rgba(14,138,125,0.12)' },
  uploadTitle: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  uploadSub: { color: colors.inkFaint, fontSize: 11, marginTop: 2 },

  ghostButton: {
    height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  ghostButtonText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
});