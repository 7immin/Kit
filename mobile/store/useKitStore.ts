// mobile/store/useKitStore.ts
import { create } from 'zustand';

export interface Presenter {
  userId: string;
  name: string;
  isCurrentPresenter: boolean;
}

export interface QuestionItem {
  questionId: string;
  text: string;
  nickname: string;
  category: 'during' | 'after';
  createdAt: number;
}

export interface AnsweredQuestionItem {
  questionId: string;
  text: string;
  nickname: string;
  answeredAt: number;
}

export interface AnsweringQuestion {
  questionId: string;
  text: string;
  nickname: string;
  answeringPresenterId: string;
  answeringPresenterName: string;
}

interface KitData {
  roomId: string | null;
  userId: string | null;
  role: 'presenter' | null;
  nickname: string | null;
  displayCode: string | null;
  presenterCode: string | null;
  audienceCode: string | null;
  presenters: Presenter[];
  audienceCount: number;
  title: string | null;
  slideNotes: { slideIndex: number; text: string }[];
  scriptProcessing: boolean;
  deckUploaded: boolean;
  slideCount: number;
  currentNoteSlideIndex: number;
  // slideIndex -> 전체 이미지 URL (서버가 PDF를 PNG로 변환해서 제공, lib/socket.ts의 fetchSlideImages로 채움)
  slideImages: Record<number, string>;

  // 대기화면 설정값 (형제 컴포넌트인 "발표 시작" 버튼이 읽어야 해서 store로 lift)
  durationMinutes: number;
  allowMidQuestions: boolean;
  anonymous: boolean;

  // 발표 진행 상태
  presenting: boolean;
  sessionEnded: boolean;
  currentSlideIndex: number;

  // 타이머 (매초 갱신 - 좁은 selector로만 구독할 것)
  elapsedSeconds: number;
  durationSeconds: number;
  isOvertime: boolean;
  totalElapsedSeconds: number;

  // 질문
  unreadQuestionCount: number;
  questionsDuring: QuestionItem[];
  questionsAfter: QuestionItem[];
  answeredQuestions: AnsweredQuestionItem[];
  answeringQuestion: AnsweringQuestion | null;
}

interface KitState extends KitData {
  // [수정] 실제 호출부(index.tsx)에서 userId/role/nickname 등 추가 필드까지 같이 넘기고 있어서
  // Partial<KitData>로 넉넉하게 받아둠 (재연결 시 재입장에 필요한 값들이라 store에 반드시 남아있어야 함)
  setRoomCreated: (payload: Partial<KitData>) => void;
  setRoomJoined: (payload: Partial<KitData>) => void;
  setPresenterList: (presenters: Presenter[]) => void;
  setAudienceCount: (count: number) => void;
  setNotesReady: (payload: { slideNotes: { slideIndex: number; text: string }[] }) => void;
  setSlideImages: (images: Record<number, string>) => void;

  setPresentationStarted: (payload: { durationMinutes: number; allowMidQuestions: boolean; anonymous: boolean }) => void;
  setPresentationEnded: (payload: { totalElapsedSeconds: number }) => void;
  // [신규] PRESENTATION_CANCELLED: 발표 시작을 취소하고 시작 전 상태로 되돌림 (대기화면으로 복귀)
  setPresentationCancelled: () => void;
  setSlideChanged: (slideIndex: number) => void;
  setTimerUpdate: (payload: { elapsedSeconds: number; durationSeconds: number; isOvertime: boolean }) => void;

  setQuestionNew: (payload: QuestionItem) => void;
  setQuestionAnsweringStarted: (payload: AnsweringQuestion) => void;
  setAnsweredQuestionsUpdate: (payload: { answered: AnsweredQuestionItem[] }) => void;

  resetRoomState: () => void;
}

const initialRoomState: KitData = {
  roomId: null,
  userId: null,
  role: null,
  nickname: null,
  displayCode: null,
  presenterCode: null,
  audienceCode: null,
  presenters: [],
  audienceCount: 0,
  title: null,
  slideNotes: [],
  scriptProcessing: false,
  deckUploaded: false,
  slideCount: 0,
  currentNoteSlideIndex: 1,
  slideImages: {},

  durationMinutes: 5,
  allowMidQuestions: true,
  anonymous: false,

  presenting: false,
  sessionEnded: false,
  currentSlideIndex: 1,

  elapsedSeconds: 0,
  durationSeconds: 0,
  isOvertime: false,
  totalElapsedSeconds: 0,

  unreadQuestionCount: 0,
  questionsDuring: [],
  questionsAfter: [],
  answeredQuestions: [],
  answeringQuestion: null,
};

export const useKitStore = create<KitState>((set) => ({
  ...initialRoomState,

  setRoomCreated: (payload) => set(payload),
  setRoomJoined: (payload) => set(payload),
  setPresenterList: (presenters) => set({ presenters }),
  setAudienceCount: (count) => set({ audienceCount: count }),
  setNotesReady: (payload) => set({ slideNotes: payload.slideNotes, scriptProcessing: false }),
  setSlideImages: (images) => set({ slideImages: images }),

  setPresentationStarted: (payload) =>
    set({
      presenting: true,
      sessionEnded: false,
      currentSlideIndex: 1,
      durationMinutes: payload.durationMinutes,
      allowMidQuestions: payload.allowMidQuestions,
      anonymous: payload.anonymous,
      elapsedSeconds: 0,
      durationSeconds: payload.durationMinutes * 60,
      isOvertime: false,
      unreadQuestionCount: 0,
      questionsDuring: [],
      questionsAfter: [],
      answeredQuestions: [],
      answeringQuestion: null,
    }),
  setPresentationEnded: (payload) =>
    set({
      presenting: false,
      sessionEnded: true,
      totalElapsedSeconds: payload.totalElapsedSeconds,
    }),
  setPresentationCancelled: () =>
    set({
      presenting: false,
      sessionEnded: false,
      currentSlideIndex: 1,
      elapsedSeconds: 0,
      durationSeconds: 0,
      isOvertime: false,
      unreadQuestionCount: 0,
      questionsDuring: [],
      questionsAfter: [],
      answeredQuestions: [],
      answeringQuestion: null,
    }),
  setSlideChanged: (slideIndex) => set({ currentSlideIndex: slideIndex }),
  setTimerUpdate: (payload) =>
    set({
      elapsedSeconds: payload.elapsedSeconds,
      durationSeconds: payload.durationSeconds,
      isOvertime: payload.isOvertime,
    }),

  setQuestionNew: (payload) =>
    set((state) => {
      if (payload.category === 'during') {
        return {
          questionsDuring: [payload, ...state.questionsDuring],
          unreadQuestionCount: state.unreadQuestionCount + 1,
        };
      }
      return { questionsAfter: [payload, ...state.questionsAfter] };
    }),
  setQuestionAnsweringStarted: (payload) =>
    set((state) => ({
      answeringQuestion: payload,
      questionsAfter: state.questionsAfter.filter((q) => q.questionId !== payload.questionId),
    })),
  setAnsweredQuestionsUpdate: (payload) =>
    set({ answeredQuestions: payload.answered, answeringQuestion: null }),

  resetRoomState: () => set(initialRoomState),
}));
