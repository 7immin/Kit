// server/index.js
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
  cors: { origin: "*", methods: ["GET", "POST", "PUT"] }
});

const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
const generateUserId = () => 'usr_' + Math.random().toString(36).substring(2, 10); //  고정 user_id 발급기

const roomTimers = {}; 
const roomSlides = {};

// =========================================================================
// [REST API 구역]
// =========================================================================

app.post('/rooms/:roomId/script', (req, res) => {
  const { roomId } = req.params;
  const mockNotes = [{ slideIndex: 1, text: '자동 분할된 첫 번째 슬라이드 대본입니다.' }];
  io.to(roomId).emit(EVENTS.NOTES_READY, { slideNotes: mockNotes, source: 'auto_split' });
  res.json({ success: true, message: '대본 업로드 및 분할 완료' });
});

app.post('/rooms/:roomId/slides/note/ai', (req, res) => {
  const { roomId } = req.params;
  const { hasScript } = req.body;
  const mockNotes = [{ slideIndex: 1, text: 'AI가 요약한 핵심 키워드 1, 2, 3' }];
  io.to(roomId).emit(EVENTS.NOTES_READY, { slideNotes: mockNotes, source: hasScript ? 'ai_summarize' : 'ai_generate' });
  res.json({ success: true, message: 'AI 처리 완료' });
});

app.put('/rooms/:roomId/slides/:slideIndex/note', (req, res) => {
  const { roomId, slideIndex } = req.params;
  const { newNote, editedByName } = req.body;
  db.prepare('UPDATE slides SET ai_summary_note = ? WHERE room_id = ? AND slide_index = ?').run(newNote, roomId, slideIndex);
  io.to(roomId).emit(EVENTS.NOTE_SAVED, { slideIndex: parseInt(slideIndex, 10), editedByName });
  res.json({ success: true });
});

app.get('/rooms/:roomId/questions', (req, res) => {
  const { roomId } = req.params;
  const questions = db.prepare(`
    SELECT question_id as questionId, content as text, author_name as nickname, status, created_at as createdAt, selected_at as answeredAt, completed_at as completedAt
    FROM questions WHERE room_id = ? ORDER BY created_at DESC
  `).all(roomId);

  const formattedQuestions = questions.map(q => ({
    ...q,
    questionId: String(q.questionId) 
  }));

  res.json({ success: true, questions: formattedQuestions });
});

// =========================================================================
// [Socket.io 구역]
// =========================================================================

function broadcastPresenterList(roomId) {
  const room = db.prepare('SELECT current_presenter_id FROM rooms WHERE room_id = ?').get(roomId);
  if (!room) return;
  const presenters = db.prepare("SELECT user_id, name FROM users WHERE room_id = ? AND role IN ('host', 'presenter')").all(roomId);
  
  const list = presenters.map(p => ({
    userId: p.user_id,
    name: p.name || '방장',
    isCurrentPresenter: p.user_id === room.current_presenter_id
  }));
  io.to(roomId).emit(EVENTS.PRESENTER_LIST_UPDATE, { presenters: list });
}

io.on('connection', (socket) => {
  console.log(`클라이언트 연결됨: ${socket.id}`);

  // ----------------------------------------------------
  // [1] 방 생성 & 입장 로직
  // ----------------------------------------------------
  socket.on(EVENTS.ROOM_CREATE, (payload = {}) => {
    const { title, name } = payload; // 안전하게 구조 분해 진행

    if (!title || title.trim() === '') {
      return socket.emit('error', { message: '방 제목을 입력해주세요.' });
    }

    const roomId = generateCode();
    const presenterCode = generateCode();
    const displayCode = generateCode();
    const audienceCode = generateCode();
    const userId = generateUserId(); // 방장의 고정 user_id 생성

    const stmt = db.prepare(`
      INSERT INTO rooms (room_id, title, host_user_id, current_presenter_id, presenter_code, display_code, audience_code, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'wait')
    `);
    // socket.id 대신 userId를 host_user_id와 current_presenter_id로 저장
    stmt.run(roomId, title, userId, userId, presenterCode, displayCode, audienceCode);

    // users 테이블에 user_id와 socket_id 분리 삽입
    db.prepare('INSERT OR REPLACE INTO users (user_id, socket_id, room_id, role, name) VALUES (?, ?, ?, ?, ?)')
      .run(userId, socket.id, roomId, 'host', name || '발표자');

    socket.join(roomId);
    socket.emit(EVENTS.ROOM_CREATED, { roomId, title, displayCode, audienceCode, presenterCode, userId }); // userId도 응답에 포함
    broadcastPresenterList(roomId);
  });

  socket.on(EVENTS.ROOM_JOIN_PRESENTER, ({ roomId, presenterCode, name }) => {
    const room = db.prepare('SELECT * FROM rooms WHERE room_id = ? AND presenter_code = ?').get(roomId, presenterCode);
    if (!room) return socket.emit('error', { message: '방을 찾을 수 없거나 코드가 틀렸습니다.' });

    const userId = generateUserId();
    db.prepare('INSERT OR REPLACE INTO users (user_id, socket_id, room_id, role, name) VALUES (?, ?, ?, ?, ?)')
      .run(userId, socket.id, roomId, 'presenter', name);

    socket.join(roomId);
    socket.emit(EVENTS.ROOM_JOINED, {
      roomId, role: 'presenter', userId, nickname: name, 
      title: room.title, 
      displayCode: room.display_code,
      presenterCode: room.presenter_code,
      audienceCode: null, 
      currentFileUrl: room.file_url || null
    });
    broadcastPresenterList(roomId);
  });

  socket.on(EVENTS.ROOM_JOIN_DISPLAY, ({ displayCode }) => {
    const room = db.prepare('SELECT * FROM rooms WHERE display_code = ?').get(displayCode);
    if (!room) return socket.emit('error', { message: '잘못된 디스플레이 코드입니다.' });

    const userId = generateUserId();
    db.prepare('INSERT OR REPLACE INTO users (user_id, socket_id, room_id, role) VALUES (?, ?, ?, ?)')
      .run(userId, socket.id, room.room_id, 'display');

    socket.join(room.room_id);
    socket.emit(EVENTS.ROOM_JOINED, {
      roomId: room.room_id, role: 'display', userId, nickname: null, 
      title: room.title, 
      displayCode: null, 
      presenterCode: null, 
      audienceCode: room.audience_code, 
      currentFileUrl: room.file_url || null
    });
  });

  socket.on(EVENTS.ROOM_JOIN_AUDIENCE, ({ audienceCode, name }) => {
    const room = db.prepare('SELECT * FROM rooms WHERE audience_code = ?').get(audienceCode);
    if (!room) return socket.emit('error', { message: '잘못된 코드입니다.' });

    if (!name || name.trim() === '') {
      return socket.emit('error', { message: '이름을 입력해주세요.' });
    }

    const userId = generateUserId();
    db.prepare('INSERT OR REPLACE INTO users (user_id, socket_id, room_id, role, name) VALUES (?, ?, ?, ?, ?)')
      .run(userId, socket.id, room.room_id, 'audience', name);

    socket.join(room.room_id);
    socket.emit(EVENTS.ROOM_JOINED, {
      roomId: room.room_id, 
      title: room.title, 
      role: 'audience', 
      userId, 
      nickname: name, 
      currentFileUrl: room.file_url || null
    });

    const countQuery = db.prepare("SELECT COUNT(*) as count FROM users WHERE room_id = ? AND role = 'audience'").get(room.room_id);
    io.to(room.room_id).emit(EVENTS.AUDIENCE_COUNT_UPDATE, { count: countQuery.count });
  });

  // ----------------------------------------------------
  // [2] 설정 변경 & 발표 시작/종료
  // ----------------------------------------------------
  socket.on(EVENTS.ROOM_SETTINGS_UPDATE, (payload) => {
    //  권한 체크 로직 변경: socket.id를 통해 고정 user_id를 찾은 뒤 검증
    const user = db.prepare('SELECT user_id FROM users WHERE socket_id = ?').get(socket.id);
    if (!user) return;

    const room = db.prepare('SELECT * FROM rooms WHERE host_user_id = ? AND status = ?').get(user.user_id, 'wait');
    if (!room) return;

    const allowMidQs = payload.allowMidQuestions ? 1 : 0;
    const isAnon = payload.anonymous ? 1 : 0;

    db.prepare(`UPDATE rooms SET duration_minutes = ?, is_anonymous = ?, allow_mid_questions = ? WHERE room_id = ?`)
      .run(payload.durationMinutes, isAnon, allowMidQs, room.room_id);

    io.to(room.room_id).emit(EVENTS.ROOM_SETTINGS_UPDATED, payload); 
  });

  socket.on(EVENTS.PRESENTATION_START, (payload) => {
    const user = db.prepare('SELECT user_id FROM users WHERE socket_id = ?').get(socket.id);
    if (!user) return;

    const room = db.prepare('SELECT * FROM rooms WHERE host_user_id = ? AND status = ?').get(user.user_id, 'wait');
    if (!room) return;

    const startedAt = Date.now();
    const durationSeconds = payload.durationMinutes * 60;
    const allowMidQs = payload.allowMidQuestions ? 1 : 0;
    const isAnon = payload.anonymous ? 1 : 0;

    db.prepare(`UPDATE rooms SET duration_minutes = ?, is_anonymous = ?, allow_mid_questions = ?, status = 'progress', started_at = ? WHERE room_id = ?`)
      .run(payload.durationMinutes, isAnon, allowMidQs, startedAt, room.room_id);

    roomSlides[room.room_id] = 1;

    io.to(room.room_id).emit(EVENTS.PRESENTATION_STARTED, { startedAt, ...payload, currentFileUrl: room.file_url });

    if (roomTimers[room.room_id]) clearInterval(roomTimers[room.room_id]);
    io.to(room.room_id).emit(EVENTS.TIMER_UPDATE, { elapsedSeconds: 0, durationSeconds, isOvertime: false });

    roomTimers[room.room_id] = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startedAt) / 1000);
      const isOvertime = elapsedSeconds >= durationSeconds;
      io.to(room.room_id).emit(EVENTS.TIMER_UPDATE, { elapsedSeconds, durationSeconds, isOvertime });
    }, 1000);
  });

  socket.on(EVENTS.PRESENTATION_END, () => {
    const user = db.prepare('SELECT user_id FROM users WHERE socket_id = ?').get(socket.id);
    if (!user) return;

    // 현재 슬라이드 제어권이 있는 user_id인지 확인
    const room = db.prepare('SELECT * FROM rooms WHERE current_presenter_id = ?').get(user.user_id);
    if (!room || !room.started_at) return;

    const endTime = Date.now();
    const totalElapsedSeconds = Math.floor((endTime - room.started_at) / 1000);

    const presenterCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE room_id = ? AND role IN ('host', 'presenter')").get(room.room_id).c;
    const audienceCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE room_id = ? AND role = 'audience'").get(room.room_id).c;

    db.prepare(`UPDATE rooms SET status = 'end', ended_at = ?, total_time_seconds = ?, total_presenters = ?, total_audience = ? WHERE room_id = ?`)
      .run(endTime, totalElapsedSeconds, presenterCount, audienceCount, room.room_id);

    // 발표 종료 시점에 session_presenters 테이블에 참여자 스냅샷 저장
    const presenters = db.prepare("SELECT name FROM users WHERE room_id = ? AND role IN ('host', 'presenter')").all(room.room_id);
    const insertSession = db.prepare("INSERT INTO session_presenters (room_id, display_name_at_time, joined_at) VALUES (?, ?, ?)");
    for (const p of presenters) {
      insertSession.run(room.room_id, p.name || '발표자', Date.now());
    }

    io.to(room.room_id).emit(EVENTS.PRESENTATION_ENDED, { totalElapsedSeconds, presenterCount, audienceCount });

    if (roomTimers[room.room_id]) {
      clearInterval(roomTimers[room.room_id]);
      delete roomTimers[room.room_id];
    }
  });

  // ----------------------------------------------------
  // [3] 발표자 교체 및 슬라이드 제어
  // ----------------------------------------------------
  socket.on(EVENTS.PRESENTER_TRANSFER, ({ targetUserId }) => {
    const user = db.prepare('SELECT user_id FROM users WHERE socket_id = ?').get(socket.id);
    if (!user) return;

    const room = db.prepare('SELECT * FROM rooms WHERE current_presenter_id = ?').get(user.user_id);
    if (!room) return;
    
    db.prepare('UPDATE rooms SET current_presenter_id = ? WHERE room_id = ?').run(targetUserId, room.room_id);
    io.to(room.room_id).emit(EVENTS.PRESENTER_CHANGED, { newPresenterId: targetUserId, fileUrl: room.file_url });
    broadcastPresenterList(room.room_id);
  });

  socket.on(EVENTS.SLIDE_NEXT, () => {
    const user = db.prepare('SELECT user_id FROM users WHERE socket_id = ?').get(socket.id);
    if (!user) return;

    const room = db.prepare('SELECT room_id FROM rooms WHERE current_presenter_id = ?').get(user.user_id);
    if (room) {
      roomSlides[room.room_id] = (roomSlides[room.room_id] || 1) + 1;
      io.to(room.room_id).emit(EVENTS.SLIDE_CHANGED, { slideIndex: roomSlides[room.room_id] });
    }
  });

  socket.on(EVENTS.SLIDE_PREV, () => {
    const user = db.prepare('SELECT user_id FROM users WHERE socket_id = ?').get(socket.id);
    if (!user) return;

    const room = db.prepare('SELECT room_id FROM rooms WHERE current_presenter_id = ?').get(user.user_id);
    if (room) {
      roomSlides[room.room_id] = Math.max(1, (roomSlides[room.room_id] || 1) - 1);
      io.to(room.room_id).emit(EVENTS.SLIDE_CHANGED, { slideIndex: roomSlides[room.room_id] });
    }
  });

  // ----------------------------------------------------
  // [4] Q&A 시스템
  // ----------------------------------------------------
  socket.on(EVENTS.QUESTION_SUBMIT, ({ text, category }) => {
    const user = db.prepare('SELECT * FROM users WHERE socket_id = ?').get(socket.id);
    if (!user) return;

    const room = db.prepare('SELECT status, allow_mid_questions, is_anonymous FROM rooms WHERE room_id = ?').get(user.room_id);
    if (!room) return;

    if (room.allow_mid_questions === 0 && room.status !== 'end') {
      return socket.emit('error', { message: '발표 종료 후 질문해 주세요.' });
    }

    const authorName = room.is_anonymous === 1 ? '익명' : user.name;

    const info = db.prepare('INSERT INTO questions (room_id, author_name, content, category, created_at, status) VALUES (?, ?, ?, ?, ?, ?)')
      .run(user.room_id, authorName, text, category, Date.now(), 'pending');

    io.to(user.room_id).emit(EVENTS.QUESTION_NEW, { 
      questionId: String(info.lastInsertRowid), 
      text, 
      nickname: authorName, 
      category, 
      createdAt: Date.now() 
    });
  });

  socket.on(EVENTS.QUESTION_ANSWERING_START, ({ questionId }) => {
    const user = db.prepare('SELECT user_id, room_id, role, name FROM users WHERE socket_id = ?').get(socket.id);
    if (!user || (user.role !== 'presenter' && user.role !== 'host')) return;

    const isAnswering = db.prepare("SELECT * FROM questions WHERE room_id = ? AND status = 'answering'").get(user.room_id);
    if (isAnswering) return;

    const q = db.prepare("SELECT * FROM questions WHERE question_id = ?").get(questionId);
    if (!q) return;

    db.prepare("UPDATE questions SET status = 'answering', selected_at = ?, answering_presenter_id = ? WHERE question_id = ?")
      .run(Date.now(), user.user_id, questionId);

    io.to(user.room_id).emit(EVENTS.QUESTION_ANSWERING_STARTED, {
      questionId: String(questionId),
      text: q.content, 
      nickname: q.author_name, 
      answeringPresenterId: user.user_id,
      answeringPresenterName: user.name || '발표자'
    });
  });

  socket.on(EVENTS.QUESTION_ANSWERING_END, () => {
    const user = db.prepare('SELECT user_id, room_id, role FROM users WHERE socket_id = ?').get(socket.id);
    if (!user || (user.role !== 'presenter' && user.role !== 'host')) return;

    const q = db.prepare("SELECT * FROM questions WHERE room_id = ? AND status = 'answering' AND answering_presenter_id = ?").get(user.room_id, user.user_id);
    if (!q) return;

    const now = Date.now();
    db.prepare("UPDATE questions SET status = 'completed', completed_at = ? WHERE question_id = ?").run(now, q.question_id);

    const answered = db.prepare(`
      SELECT question_id as questionId, content as text, author_name as nickname, completed_at as answeredAt
      FROM questions WHERE room_id = ? AND status = 'completed' ORDER BY completed_at DESC
    `).all(user.room_id);
    
    const formattedAnswered = answered.map(row => ({
      ...row,
      questionId: String(row.questionId)
    }));

    io.to(user.room_id).emit(EVENTS.ANSWERED_QUESTIONS_UPDATE, { answered: formattedAnswered });
  });

  // ----------------------------------------------------
  // [5] 연결 종료 처리
  // ----------------------------------------------------
  socket.on('disconnect', () => {
    console.log(`연결 끊김: ${socket.id}`);
    const user = db.prepare('SELECT user_id, room_id, role FROM users WHERE socket_id = ?').get(socket.id);

    if (user) {
      db.prepare('DELETE FROM users WHERE socket_id = ?').run(socket.id);
      
      if (user.role === 'audience') {
        const countQuery = db.prepare("SELECT COUNT(*) as count FROM users WHERE room_id = ? AND role = 'audience'").get(user.room_id);
        io.to(user.room_id).emit(EVENTS.AUDIENCE_COUNT_UPDATE, { count: countQuery.count });
      } else if (user.role === 'host' || user.role === 'presenter') {
        broadcastPresenterList(user.room_id);
      }
    }
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`KIT 백엔드 서버 구동 중: http://localhost:${PORT}`);
});