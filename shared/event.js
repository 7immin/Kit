/**
 * Socket.io 이벤트 명세서
 * 방향 알림:
 * [C2S] Client -> Server (앱/웹이 서버로 요청)
 * [S2C] Server -> Client (서버가 앱/웹으로 브로드캐스트)
 */

export const SOCKET_EVENTS = {
  // ==========================================
  // 1. 룸 시스템 & 연결
  // ==========================================
  /**
   * [C2S] 방 입장 요청
   * @payload { roomId: string, userType: 'PRESENTER' | 'DISPLAY' | 'AUDIENCE', nickname?: string }
   */
  JOIN_ROOM: 'room:join',
  
  /**
   * [S2C] 방 입장 성공 및 현재 상태 전달 (입장한 사람에게만 전송)
   * @payload { userCount: number, currentSlide: number, settings: object, isTimerRunning: boolean }
   */
  ROOM_JOINED: 'room:joined',

  /**
   * [S2C] 방 인원수 변경 (누군가 들어오거나 나갈 때 브로드캐스트)
   * @payload { userCount: number }
   */
  USER_COUNT_UPDATED: 'room:user_count_updated',

  /**
   * [C2S / S2C] 발표 환경 설정 변경 (익명 허용, 중간 질문 토글 등)
   * @payload { allowAnonymous: boolean, allowQuestions: boolean }
   */
  UPDATE_SETTINGS: 'room:update_settings',


  // ==========================================
  // 2. 슬라이드 제어
  // ==========================================
  /**
   * [C2S] 슬라이드 변경 요청 (모바일 리모컨)
   * @payload { roomId: string, targetSlide: number }
   */
  CHANGE_SLIDE: 'slide:change',

  /**
   * [S2C] 슬라이드 변경 브로드캐스트 (PC 디스플레이 화면 전환용)
   * @payload { currentSlide: number }
   */
  SLIDE_CHANGED: 'slide:changed',


  // ==========================================
  // 3. 타이머 동기화
  // ==========================================
  /**
   * [C2S] 타이머 시작/정지 요청
   * @payload { roomId: string, action: 'START' | 'STOP', totalMinutes?: number }
   */
  CONTROL_TIMER: 'timer:control',

  /**
   * [S2C] 1초마다 타이머 상태 브로드캐스트 (서버가 주도)
   * @payload { remainingSeconds: number, isOvertime: boolean }
   */
  TIMER_TICK: 'timer:tick',


  // ==========================================
  // 4. 질문 시스템
  // ==========================================
  /**
   * [C2S] 청중 질문 등록
   * @payload { roomId: string, content: string, isAnonymous: boolean, isPublic: boolean }
   */
  SUBMIT_QUESTION: 'question:submit',

  /**
   * [S2C] 새로운 질문 브로드캐스트 (모바일 앱의 질문 리스트 갱신용)
   * @payload { questionId: number, content: string, author: string, isPublic: boolean, createdAt: string }
   */
  NEW_QUESTION: 'question:new',

  /**
   * [C2S] 발표자가 답변할 질문 선택
   * @payload { roomId: string, questionId: number }
   */
  SELECT_QUESTION: 'question:select',

  /**
   * [S2C] 선택된 질문 PC 화면에 띄우기
   * @payload { questionId: number, content: string, author: string }
   */
  QUESTION_SELECTED: 'question:selected',


  // ==========================================
  // 5. 발표자 교체 및 파일 전환
  // ==========================================
  /**
   * [C2S] 제어 권한 획득 (다음 발표자가 앱에서 '발표 시작' 누름)
   * @payload { roomId: string, newPresenterId: string, fileUrl: string }
   */
  TRANSFER_PRESENTER: 'presenter:transfer',

  /**
   * [S2C] 발표자 및 파일 변경 브로드캐스트 (PC에서 새 파일 로드)
   * @payload { currentPresenterId: string, fileUrl: string, currentSlide: 1 }
   */
  PRESENTER_TRANSFERRED: 'presenter:transferred',


  // ==========================================
  // 6. 에러 처리
  // ==========================================
  /**
   * [S2C] 소켓 로직 에러 발생 시
   * @payload { message: string, code: string }
   */
  ERROR: 'error'
};