// server/database.js
const Database = require('better-sqlite3');
const db = new Database('kit.db');

db.exec(`
  -- 1. 룸(발표 세션) 테이블
  CREATE TABLE IF NOT EXISTS rooms (
    room_id TEXT PRIMARY KEY,
    host_device_id TEXT,                -- 방장 식별자 (나중에 내가 만든 방의 기록만 모아볼 때 사용)
    
    -- 발급 코드
    presenter_code TEXT,
    display_code TEXT,
    audience_code TEXT,
    
    -- 사전 설정값
    expected_presenters INTEGER,        -- 예상 발표자 수
    expected_audience INTEGER,          -- 예상 청중 수
    duration_minutes INTEGER,           -- 목표 발표 시간 (분)
    question_identity_mode TEXT,        -- 'named'(기명) 또는 'anonymous'(익명)
    question_timing_mode TEXT,          -- 'during'(도중) 또는 'after'(종료후)
    
    -- 발표 진행 상태
    file_url TEXT,                      -- 업로드된 발표 자료 URL
    status TEXT DEFAULT 'wait',         -- 'wait'(대기) -> 'progress'(발표중) -> 'end'(종료)
    current_presenter_id TEXT,          -- 현재 슬라이드 제어권을 가진 발표자
    
    -- 발표 기록 (발표 종료 시점에 업데이트)
    started_at INTEGER,                 -- 발표 시작 시간 (타임스탬프)
    ended_at INTEGER,                   -- 발표 종료 시간 (타임스탬프)
    total_time_seconds INTEGER,         -- 실제 총 발표 시간 (초 단위)
    actual_presenter_count INTEGER DEFAULT 0, -- 실제 참여한 발표자 수
    actual_audience_count INTEGER DEFAULT 0   -- 실제 참여한 청중 수
  );

  -- 2. 유저 테이블 (현재 방에 접속한 사람들)
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,           -- 소켓 ID 또는 디바이스 ID
    room_id TEXT,
    role TEXT,                          -- 'host'(방장), 'presenter'(공동발표자), 'display'(PC), 'audience'(청중)
    nickname TEXT                       -- 기명일 경우 이름, 익명일 경우 임의 생성된 닉네임
  );

  -- 3. 슬라이드 및 발표자 노트 테이블 (새로 추가됨!)
  CREATE TABLE IF NOT EXISTS slides (
    slide_id TEXT PRIMARY KEY,
    room_id TEXT,
    slide_index INTEGER,                -- 1, 2, 3... 슬라이드 번호
    original_note TEXT,                 -- 사용자가 직접 입력한 원본 대본
    ai_summary_note TEXT                -- AI가 요약/생성해 준 키워드 중심 대본
  );

  -- 4. 질문 테이블
  CREATE TABLE IF NOT EXISTS questions (
    question_id TEXT PRIMARY KEY,
    room_id TEXT,
    author_name TEXT,                   -- 질문자 이름 (익명이면 랜덤 닉네임)
    content TEXT,                       -- 질문 내용
    created_at INTEGER,                 -- 질문 등록 시간
    
    -- 발표자 답변 관련
    is_selected INTEGER DEFAULT 0,      -- 발표자가 답변하려고 터치했는지 여부 (0: 미선택, 1: 선택됨)
    selected_at INTEGER                 -- 답변으로 선택된 시간 (이 시간 기준으로 내림차순 정렬해서 PC/청중 화면 최상단에 띄움)
  );
`);

console.log("KIT 데이터베이스 스펙 빌드 완료");
module.exports = db;