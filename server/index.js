const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const { EVENTS } = require('../shared/events.js');
const db = require('./database.js');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// 랜덤 방 코드 6자리 생성 함수 (예: A7X9BQ)
const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

io.on('connection', (socket) => {
  console.log(`클라이언트 연결됨: ${socket.id}`);

  // ==========================================
  // [시나리오 1] 방장이 앱에서 '방 생성'을 눌렀을 때
  // ==========================================
  socket.on(EVENTS.ROOM_CREATE, () => {
    const roomId = generateCode();
    const presenterCode = generateCode();
    const displayCode = generateCode();
    const audienceCode = generateCode();

    // 1. DB에 새로운 룸 정보 INSERT (초기 상태: wait)
    const stmt = db.prepare(`
      INSERT INTO rooms (room_id, host_device_id, presenter_code, display_code, audience_code, status)
      VALUES (?, ?, ?, ?, ?, 'wait')
    `);
    stmt.run(roomId, socket.id, presenterCode, displayCode, audienceCode);

    // 2. 방장을 소켓 룸에 조인
    socket.join(roomId);

    // 3. 생성된 코드들을 방장(앱)에게 전달
    socket.emit(EVENTS.ROOM_CREATED, {
      roomId,
      displayCode,
      audienceCode,
      presenterCode
    });
    console.log(`[방 생성] Room: ${roomId} (방장: ${socket.id})`);
  });

  // ==========================================
  // [시나리오 2] 공동 발표자가 방 코드로 입장할 때
  // ==========================================
  socket.on(EVENTS.ROOM_JOIN_PRESENTER, ({ roomId, presenterCode, name }) => {
    // 1. DB에서 해당 방과 코드가 맞는지 검증
    const room = db.prepare('SELECT * FROM rooms WHERE room_id = ? AND presenter_code = ?').get(roomId, presenterCode);
    
    if (!room) {
      return socket.emit('error', { message: '방을 찾을 수 없거나 코드가 틀렸습니다.' });
    }

    // 2. users 테이블에 공동 발표자 추가
    db.prepare('INSERT OR REPLACE INTO users (user_id, room_id, role, nickname) VALUES (?, ?, ?, ?)')
      .run(socket.id, roomId, 'presenter', name);

    socket.join(roomId);

    // 3. 입장 성공 응답 (입장 시점에 이미 등록된 자료가 있다면 URL 전달)
    socket.emit(EVENTS.ROOM_JOINED, {
      roomId,
      role: 'presenter',
      userId: socket.id,
      currentFileUrl: room.file_url || null
    });
    console.log(`[발표자 입장] Room: ${roomId}, 이름: ${name}`);
  });

  // ==========================================
  // [시나리오 3] PC 디스플레이 웹 입장
  // ==========================================
  socket.on(EVENTS.ROOM_JOIN_DISPLAY, ({ displayCode }) => {
    // 1. 디스플레이 코드로 진짜 방 찾기
    const room = db.prepare('SELECT * FROM rooms WHERE display_code = ?').get(displayCode);
    if (!room) return socket.emit('error', { message: '잘못된 디스플레이 코드입니다.' });

    const roomId = room.room_id;

    // 2. users 테이블에 PC 디스플레이 등록
    db.prepare('INSERT OR REPLACE INTO users (user_id, room_id, role) VALUES (?, ?, ?)')
      .run(socket.id, roomId, 'display');

    socket.join(roomId);

    // 3. 입장 성공 시 응답 (화면에 QR코드를 그릴 수 있도록 audienceCode를 같이 내려줌)
    socket.emit(EVENTS.ROOM_JOINED, {
      roomId,
      role: 'display',
      userId: socket.id,
      currentFileUrl: room.file_url || null,
      audienceCode: room.audience_code // 핵심: PC 화면에 청중 접속 코드를 띄우기 위해 전달!
    });
    
    console.log(`[PC 디스플레이 입장] Room: ${roomId}`);
  });

  // ==========================================
  // [시나리오 4] 청중이 모바일 웹으로 입장할 때
  // ==========================================
  socket.on(EVENTS.ROOM_JOIN_AUDIENCE, ({ audienceCode, nickname }) => {
    // 1. 청중 코드로 방 찾기
    const room = db.prepare('SELECT * FROM rooms WHERE audience_code = ?').get(audienceCode);
    if (!room) return socket.emit('error', { message: '잘못된 코드입니다.' });

    const roomId = room.room_id;

    // 2. users 테이블에 청중 추가 (시나리오: 익명/기명 닉네임 저장)
    db.prepare('INSERT OR REPLACE INTO users (user_id, room_id, role, nickname) VALUES (?, ?, ?, ?)')
      .run(socket.id, roomId, 'audience', nickname);

    socket.join(roomId);

    socket.emit(EVENTS.ROOM_JOINED, {
      roomId,
      role: 'audience',
      userId: socket.id,
      currentFileUrl: room.file_url || null
    });

    // 3. 현재 룸의 총 청중 수를 계산해서 방장/발표자들에게 브로드캐스트
    const countQuery = db.prepare("SELECT COUNT(*) as count FROM users WHERE room_id = ? AND role = 'audience'").get(roomId);
    io.to(roomId).emit(EVENTS.AUDIENCE_COUNT_UPDATE, { count: countQuery.count });
    
    console.log(`[청중 입장] 닉네임: ${nickname}, 현재 청중 수: ${countQuery.count}`);
  });

  // (index.js 하단 부분)
  // 연결 끊김 시 (청중이 나가면 인원수 다시 계산해서 쏴주기)
  socket.on('disconnect', () => {
    console.log(`연결 끊김: ${socket.id}`);

    // 1. 방금 나간 사람이 어느 방에 있던, 어떤 역할(role)의 유저인지 DB에서 찾기
    const user = db.prepare('SELECT room_id, role FROM users WHERE user_id = ?').get(socket.id);

    if (user) {
      // 2. users 테이블에서 이 사람의 데이터 지우기
      db.prepare('DELETE FROM users WHERE user_id = ?').run(socket.id);

      // 3. 만약 나간 사람이 '청중(audience)'이었다면?
      if (user.role === 'audience') {
        // 남은 청중 수 다시 계산해서 방에 있는 사람들에게 알려주기
        const countQuery = db.prepare("SELECT COUNT(*) as count FROM users WHERE room_id = ? AND role = 'audience'").get(user.room_id);
        io.to(user.room_id).emit(EVENTS.AUDIENCE_COUNT_UPDATE, { count: countQuery.count });
        console.log(`[청중 퇴장] Room: ${user.room_id}, 남은 청중 수: ${countQuery.count}`);
      }
    }
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`KIT 서버 구동 중: http://localhost:${PORT}`);
});