// mobile/lib/socket.ts
import { io, Socket } from 'socket.io-client';

// B의 서버가 실행 중인 로컬 IP:포트 (변경 시 여기만 고치면 됨)
export const SERVER_URL = 'http://10.249.53.43:4000';

export const socket: Socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true, // 기본값이지만 명시
});

// [추가] 서버는 socket_id가 아니라 이 userId로 "같은 사람"을 판별함 (재연결돼도 같은 값을 계속 보내야
// current_presenter_id 등 발표 제어권을 안 잃음). 앱을 껐다 켜기 전까지는 메모리에 고정해서 재사용.
// 소켓이 재연결될 때(폰 백그라운드 갔다옴, 네트워크 끊김 등) socket_id가 바뀌는데, 서버 DB엔 예전
// socket_id가 남아있어서 그 상태로 PRESENTATION_START 등을 보내면 서버가 "이 소켓의 유저"를 못 찾고
// 조용히 무시해버림 — 재연결 시 이 userId로 ROOM_JOIN_PRESENTER를 다시 보내 socket_id를 갱신해야 함.
let cachedUserId: string | null = null;
export function getLocalUserId(): string {
  if (!cachedUserId) {
    cachedUserId = 'usr_' + Math.random().toString(36).substring(2, 10);
  }
  return cachedUserId;
}

// 서버가 PDF를 슬라이드별 PNG로 변환해 저장해둔 걸 REST로 받아와
// slideIndex -> 전체 이미지 URL(SERVER_URL 접두) 맵으로 만들어준다.
// (web/src/App.jsx의 fetchSlideImages와 동일한 계약: GET /rooms/:roomId/slides -> { slides: [{ slideIndex, imageUrl }] })
export async function fetchSlideImages(roomId: string): Promise<Record<number, string>> {
  try {
    const res = await fetch(`${SERVER_URL}/rooms/${roomId}/slides`);
    if (!res.ok) return {};
    const data = await res.json();
    const map: Record<number, string> = {};
    (data.slides || []).forEach((s: { slideIndex: number; imageUrl?: string | null }) => {
      if (s.imageUrl) map[s.slideIndex] = `${SERVER_URL}${s.imageUrl}`;
    });
    return map;
  } catch (e) {
    console.error('슬라이드 이미지 목록을 불러오지 못했습니다.', e);
    return {};
  }
}

// [추가] NOTE_SAVED 소켓 이벤트엔 실제로 바뀐 노트 내용이 안 실려있고(slideIndex, editedByName만
// 옴 — shared/events.js 스펙 참고), 그래서 다른 발표자 기기가 바뀐 내용을 알려면 이걸로 다시
// 받아와야 함. ai_summary_note가 AI 요약/수동 수정본, original_note가 대본 분할 원본이라
// ai_summary_note를 우선하고 없으면 original_note로 대체한다.
export async function fetchSlideNotes(roomId: string): Promise<{ slideIndex: number; text: string }[]> {
  try {
    const res = await fetch(`${SERVER_URL}/rooms/${roomId}/slides`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.slides || []).map(
      (s: { slideIndex: number; originalNote?: string | null; aiSummaryNote?: string | null }) => ({
        slideIndex: s.slideIndex,
        text: s.aiSummaryNote || s.originalNote || '',
      })
    );
  } catch (e) {
    console.error('슬라이드 노트를 불러오지 못했습니다.', e);
    return [];
  }
}