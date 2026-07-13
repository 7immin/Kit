// mobile/lib/socket.ts
import { io, Socket } from 'socket.io-client';

// B의 서버가 실행 중인 로컬 IP:포트 (변경 시 여기만 고치면 됨)
export const SERVER_URL = 'http://10.249.53.43:4000';

export const socket: Socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true, // 기본값이지만 명시
});