// mobile/app/note-editor.tsx
import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SERVER_URL } from '../lib/socket';
import { useKitStore } from '../store/useKitStore';
import { colors, radius } from '../constants/theme';

export default function NoteEditorScreen() {
  const roomId = useKitStore((s) => s.roomId);
  const slideCount = useKitStore((s) => s.slideCount);
  const slideNotes = useKitStore((s) => s.slideNotes);
  const currentIndex = useKitStore((s) => s.currentNoteSlideIndex);

  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    const existing = slideNotes.find((n) => n.slideIndex === currentIndex);
    setText(existing?.text ?? '');
    setStatusText('');
  }, [currentIndex]);

  const goToSlide = (delta: number) => {
    const next = Math.min(slideCount, Math.max(1, currentIndex + delta));
    useKitStore.setState({ currentNoteSlideIndex: next });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${SERVER_URL}/rooms/${roomId}/slides/${currentIndex}/note`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newNote: text, editedByName: '나' }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusText('저장됨 · 방금');
        // 로컬 slideNotes 캐시도 갱신
        const updated = slideNotes.filter((n) => n.slideIndex !== currentIndex);
        updated.push({ slideIndex: currentIndex, text });
        useKitStore.setState({ slideNotes: updated });
      } else {
        alert(data.message || '저장 실패');
      }
    } catch (e) {
      alert('저장 실패, 서버 연결을 확인해주세요');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>노트 수정</Text>
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{saving ? '저장 중...' : '저장'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.slideFrame}>
          <Text style={styles.slideIdx}>SLIDE {currentIndex} / {slideCount || '-'}</Text>
          <Text style={styles.slideTitle}>슬라이드 미리보기 준비 중</Text>
        </View>

        <View style={styles.navRow}>
          <Pressable style={styles.navBtn} onPress={() => goToSlide(-1)} disabled={currentIndex <= 1}>
            <Text style={[styles.navBtnText, currentIndex <= 1 && styles.disabled]}>‹</Text>
          </Pressable>
          <Text style={styles.navLabel}>{currentIndex} / {slideCount || '-'}</Text>
          <Pressable style={styles.navBtn} onPress={() => goToSlide(1)} disabled={currentIndex >= slideCount}>
            <Text style={[styles.navBtnText, currentIndex >= slideCount && styles.disabled]}>›</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.textarea}
          multiline
          value={text}
          onChangeText={setText}
          placeholder="이 슬라이드의 발표자 노트를 입력하세요"
        />

        {statusText ? <Text style={styles.statusText}>{statusText}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: colors.hairline,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 24, color: colors.ink },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink },
  saveBtn: { backgroundColor: colors.spot, borderRadius: 11, paddingVertical: 9, paddingHorizontal: 16 },
  saveBtnText: { color: colors.spotInk, fontWeight: '700', fontSize: 13 },

  body: { padding: 20, gap: 14 },
  slideFrame: {
    aspectRatio: 16 / 9, borderRadius: radius.md, backgroundColor: colors.surfaceRaised,
    borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center',
  },
  slideIdx: { position: 'absolute', top: 10, left: 12, fontSize: 11, color: colors.inkFaint },
  slideTitle: { fontSize: 15, fontWeight: '700', color: colors.inkDim },

  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 38, height: 38, borderRadius: 999, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontSize: 20, color: colors.ink },
  navLabel: { fontSize: 12, color: colors.inkFaint },
  disabled: { opacity: 0.3 },

  textarea: {
    minHeight: 160, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.hairline,
    borderRadius: radius.md, padding: 14, fontSize: 14.5, lineHeight: 21, color: colors.ink,
    textAlignVertical: 'top',
  },
  statusText: { fontSize: 11.5, color: colors.inkFaint, textAlign: 'center' },
});