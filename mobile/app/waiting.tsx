import { View, Text, StyleSheet } from 'react-native';
import { useKitStore } from '../store/useKitStore';

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

export default function WaitingScreen() {
  const displayCode = useKitStore((s) => s.displayCode);
  const presenterCode = useKitStore((s) => s.presenterCode);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>디스플레이 코드</Text>
      <Text style={styles.code}>{displayCode ?? '-'}</Text>

      <Text style={styles.label}>발표자 코드</Text>
      <Text style={styles.code}>{presenterCode ?? '-'}</Text>

      <View style={{ height: 24 }} />
      <AudienceCount />
      <View style={{ height: 16 }} />
      <PresenterList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', padding: 24, paddingTop: 60, gap: 8 },
  label: { color: '#888', fontSize: 13, marginTop: 12 },
  value: { color: '#fff', fontSize: 15 },
  code: { color: '#3FD0C9', fontSize: 20, fontWeight: '700', fontFamily: 'monospace' },
});