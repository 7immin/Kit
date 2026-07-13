// mobile/lib/socket.ts
import { io, Socket } from 'socket.io-client';

// TODO: B의 서버가 실행 중인 로컬 IP:포트로 교체 (ipconfig로 확인한 IPv4 주소)
const SERVER_URL = 'http://10.249.53.23:4000/';

export const socket: Socket = io(SERVER_URL, {
  autoConnect: false,
});