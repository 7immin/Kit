// mobile/hooks/useSocketListeners.ts
import { useEffect } from 'react';
import { socket } from '../lib/socket';
import { useKitStore } from '../store/useKitStore';
import { EVENTS } from '../../shared/events';

export function useSocketListeners() {
  useEffect(() => {
    const onRoomCreated = (payload: any) => useKitStore.getState().setRoomCreated(payload);
    const onRoomJoined = (payload: any) => useKitStore.getState().setRoomJoined(payload);
    const onPresenterList = (payload: any) => useKitStore.getState().setPresenterList(payload.presenters);
    const onAudienceCount = (payload: any) => useKitStore.getState().setAudienceCount(payload.count);

    socket.on(EVENTS.ROOM_CREATED, onRoomCreated);
    socket.on(EVENTS.ROOM_JOINED, onRoomJoined);
    socket.on(EVENTS.PRESENTER_LIST_UPDATE, onPresenterList);
    socket.on(EVENTS.AUDIENCE_COUNT_UPDATE, onAudienceCount);

    if (!socket.connected) socket.connect();

    return () => {
      socket.off(EVENTS.ROOM_CREATED, onRoomCreated);
      socket.off(EVENTS.ROOM_JOINED, onRoomJoined);
      socket.off(EVENTS.PRESENTER_LIST_UPDATE, onPresenterList);
      socket.off(EVENTS.AUDIENCE_COUNT_UPDATE, onAudienceCount);
    };
  }, []);
}