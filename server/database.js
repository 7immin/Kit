// server/database.js
const Database = require('better-sqlite3');
const db = new Database('kit.db');

db.exec(`
  -- 0. 회원 테이블
  CREATE TABLE IF NOT EXISTS accounts (
    account_id TEXT PRIMARY KEY,                    -- 계정 고유 식별자
    login_id TEXT UNIQUE,                           -- 로그인 아이디 (이메일 등)
    password TEXT,                                  -- 비밀번호 (해시 암호화되어 저장)
    name TEXT,                                      -- 사용자 이름 (발표자 이름으로 사용)
    created_at INTEGER                              -- 가입 시간 (타임스탬프)
  );

  -- 1. 발표 준비 테이블
  CREATE TABLE IF NOT EXISTS rooms (
    room_id TEXT PRIMARY KEY,
    title TEXT,                                     -- 방 제목 (필수 입력)
    host_device_id TEXT,                            -- 방장 식별자 (방 생성자, 설정 변경 권한 확인용 - 소켓 연결 기준)
    owner_account_id TEXT,                          -- 방을 생성한 회원의 계정 ID (로그인한 유저의 이전 발표 기록 조회용)

    -- 발급 코드
    presenter_code TEXT,
    display_code TEXT,
    audience_code TEXT,

    -- 설정값
    duration_minutes INTEGER DEFAULT 0,             -- 발표 설정 시간
    question_identity_mode TEXT DEFAULT 'named',    -- 'named' 또는 'anonymous'
    question_timing_mode TEXT DEFAULT 'realtime',   -- 'realtime' 또는 'post'

    -- 발표 진행 상태
    file_url TEXT,                                  -- 발표 자료 URL
    script_url TEXT,                                -- 발표 대본 URL
    status TEXT DEFAULT 'wait',                     -- 'wait'(대기) -> 'progress'(발표중) -> 'end'(종료)
    current_presenter_id TEXT,                      -- 현재 슬라이드 제어권을 가진 발표자

    -- 발표 기록 (발표 종료 시점에 업데이트)
    started_at INTEGER,                             -- 발표 시작 시간 (타임스탬프)
    ended_at INTEGER,                               -- 발표 종료 시간 (타임스탬프)
    total_time_seconds INTEGER DEFAULT 0,           -- 실제 총 발표 시간 (초 단위)

    -- 발표 기록(리스트업) 화면에서 보여줄 통계 데이터 저장용
    total_presenters INTEGER DEFAULT 1,             -- 총 접속했던 발표자 수
    total_audience INTEGER DEFAULT 0,               -- 총 접속했던 청중 수
    presenters_list TEXT                            -- 참여한 발표자 리스트 (발표 종료 시점에 이름들을 쉼표로 연결하여 영구 저장)
  );

  -- 2. 유저 테이블 (현재 방에 접속한 사람들 - 연결이 끊어지면 삭제되는 임시 데이터)
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,           -- 소켓 ID 또는 디바이스 ID
    room_id TEXT,
    role TEXT,                          -- 'host'(방장), 'presenter'(공동발표자), 'display'(PC), 'audience'(청중)
    name TEXT                           -- 청중이 입장할 때 입력한 실제 이름
  );
  
  -- 3. 슬라이드 & AI 노트 테이블 (발표 기록 조회 시 '발표자 노트' 데이터로 사용됨)
  CREATE TABLE IF NOT EXISTS slides (
    slide_id TEXT PRIMARY KEY,
    room_id TEXT,
    slide_index INTEGER,                -- 1, 2, 3... 슬라이드 번호
    original_note TEXT,                 -- 사용자가 직접 입력한 원본 대본
    ai_summary_note TEXT                -- AI가 요약/생성해 준 키워드 중심 대본, 이 컬럼의 값을 사용자가 직접 수정할 수 있게 덮어씌울 예정
  );

  -- 4. 질문 테이블 (발표 기록 조회 시 '답변한 질문' 데이터로 사용됨)
  CREATE TABLE IF NOT EXISTS questions (
    question_id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT,
    author_name TEXT,                   -- 질문자 이름 (익명이면 랜덤 닉네임)
    content TEXT,                       -- 질문 내용
    created_at INTEGER,                 -- 질문 등록 시간
    
    -- 발표자 답변 상태 및 권한 관련
    status TEXT DEFAULT 'pending',      -- 현재 질문 상태: 'pending'(대기), 'answering'(답변중), 'completed'(답변완료)
    answering_presenter_id TEXT,        -- 현재 이 질문을 답변 중인 발표자의 ID (이 사람만 '답변 종료하기'를 누를 수 있음)
    selected_at INTEGER,                -- '답변하기' 버튼이 눌린 시간 (답변 시작 시간, 현재 답변 중인 질문 상단 고정용)
    completed_at INTEGER                -- '답변 종료하기' 버튼이 눌린 시간 (답변 완료 목록에서 내림차순 정렬용)
  );
`);

console.log("KIT 데이터베이스 스펙 빌드 완료");
module.exports = db;