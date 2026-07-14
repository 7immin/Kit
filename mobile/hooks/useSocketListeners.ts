// mobile/hooks/useSocketListeners.ts (전체, 발표 시작/타이머/슬라이드/질문 리스너 추가된 버전)
import { useEffect } from 'react';
import { router } from 'expo-router';
import { socket } from '../lib/socket';
import { useKitStore } from '../store/useKitStore';
import { EVENTS } from '../../shared/events';

export function useSocketListeners() {
  useEffect(() => {
    const onRoomCreated = (payload: any) => useKitStore.getState().setRoomCreated(payload);
    const onRoomJoined = (payload: any) => useKitStore.getState().setRoomJoined(payload);
    const onPresenterList = (payload: any) => useKitStore.getState().setPresenterList(payload.presenters);
    const onAudienceCount = (payload: any) => useKitStore.getState().setAudienceCount(payload.count);
    const onNotesReady = (payload: any) => useKitStore.getState().setNotesReady(payload);

    // 발표 시작/종료: 방 안의 모든 발표자 기기가 함께 화면 전환됨 (발표자 본인이든 아니든)
    const onPresentationStarted = (payload: any) => {
      useKitStore.getState().setPresentationStarted(payload);
      router.replace('/remote');
    };
    const onPresentationEnded = (payload: any) => {
      useKitStore.getState().setPresentationEnded(payload);
      router.replace('/questions');
    };

    const onSlideChanged = (payload: any) => useKitStore.getState().setSlideChanged(payload.slideIndex);
    const onTimerUpdate = (payload: any) => useKitStore.getState().setTimerUpdate(payload);

    const onQuestionNew = (payload: any) => useKitStore.getState().setQuestionNew(payload);
    const onQuestionAnsweringStarted = (payload: any) => useKitStore.getState().setQuestionAnsweringStarted(payload);
    const onAnsweredQuestionsUpdate = (payload: any) => useKitStore.getState().setAnsweredQuestionsUpdate(payload);

    socket.on(EVENTS.ROOM_CREATED, onRoomCreated);
    socket.on(EVENTS.ROOM_JOINED, onRoomJoined);
    socket.on(EVENTS.PRESENTER_LIST_UPDATE, onPresenterList);
    socket.on(EVENTS.AUDIENCE_COUNT_UPDATE, onAudienceCount);
    socket.on(EVENTS.NOTES_READY, onNotesReady);

    socket.on(EVENTS.PRESENTATION_STARTED, onPresentationStarted);
    socket.on(EVENTS.PRESENTATION_ENDED, onPresentationEnded);
    socket.on(EVENTS.SLIDE_CHANGED, onSlideChanged);
    socket.on(EVENTS.TIMER_UPDATE, onTimerUpdate);

    socket.on(EVENTS.QUESTION_NEW, onQuestionNew);
    socket.on(EVENTS.QUESTION_ANSWERING_STARTED, onQuestionAnsweringStarted);
    socket.on(EVENTS.ANSWERED_QUESTIONS_UPDATE, onAnsweredQuestionsUpdate);

    if (!socket.connected) socket.connect();

    return () => {
      socket.off(EVENTS.ROOM_CREATED, onRoomCreated);
      socket.off(EVENTS.ROOM_JOINED, onRoomJoined);
      socket.off(EVENTS.PRESENTER_LIST_UPDATE, onPresenterList);
      socket.off(EVENTS.AUDIENCE_COUNT_UPDATE, onAudienceCount);
      socket.off(EVENTS.NOTES_READY, onNotesReady);

      socket.off(EVENTS.PRESENTATION_STARTED, onPresentationStarted);
      socket.off(EVENTS.PRESENTATION_ENDED, onPresentationEnded);
      socket.off(EVENTS.SLIDE_CHANGED, onSlideChanged);
      socket.off(EVENTS.TIMER_UPDATE, onTimerUpdate);

      socket.off(EVENTS.QUESTION_NEW, onQuestionNew);
      socket.off(EVENTS.QUESTION_ANSWERING_STARTED, onQuestionAnsweringStarted);
      socket.off(EVENTS.ANSWERED_QUESTIONS_UPDATE, onAnsweredQuestionsUpdate);
    };
  }, []);
}
