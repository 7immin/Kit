import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { socket } from '../lib/socket';
import { EVENTS } from '../../shared/events';
import { useKitStore } from '../store/useKitStore';

export default function StartScreen() {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const handleCreateRoom = () => {
    if (!socket.connected) socket.connect();

    socket.once(EVENTS.ROOM_CREATED, (payload: any) => {
      useKitStore.getState().setRoomCreated(payload);
      socket.emit(EVENTS.ROOM_JOIN_PRESENTER, {
        roomId: payload.roomId,
        presenterCode: payload.presenterCode,
        name: name || '발표자',
      });
    });

    socket.once(EVENTS.ROOM_JOINED, (payload: any) => {
      useKitStore.getState().setRoomJoined(payload);
      router.push('/waiting');
    });

    socket.emit(EVENTS.ROOM_CREATE);
  };

  const handleJoinWithCode = () => {
    if (!joinCode) return;
    if (!socket.connected) socket.connect();

    socket.once(EVENTS.ROOM_JOINED, (payload: any) => {
      useKitStore.getState().setRoomJoined(payload);
      router.push('/waiting');
    });

    socket.emit(EVENTS.ROOM_JOIN_PRESENTER, {
      presenterCode: joinCode.trim().toUpperCase(),
      name: name || '발표자',
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kit</Text>
      <TextInput style={styles.input} placeholder="이름" value={name} onChangeText={setName} />

      <Pressable style={styles.button} onPress={handleCreateRoom}>
        <Text style={styles.buttonText}>발표 방 만들기</Text>
      </Pressable>

      <View style={{ height: 32 }} />

      <TextInput
        style={styles.input}
        placeholder="발표자 코드 입력"
        value={joinCode}
        onChangeText={setJoinCode}
        autoCapitalize="characters"
      />
      <Pressable style={styles.buttonSecondary} onPress={handleJoinWithCode}>
        <Text style={styles.buttonText}>코드로 참가</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 24, textAlign: 'center' },
  input: { backgroundColor: '#222', color: '#fff', padding: 12, borderRadius: 8 },
  button: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonSecondary: { backgroundColor: '#333', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});