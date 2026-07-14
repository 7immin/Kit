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
  setRoomCreated: (payload: { roomId: string; displayCode: string; audienceCode: string; presenterCode: string; title: string }) => void;
  setRoomJoined: (payload: { userId: string; role: 'presenter' }) => void;
  setPresenterList: (presenters: Presenter[]) => void;
  setAudienceCount: (count: number) => void;
  setNotesReady: (payload: { slideNotes: { slideIndex: number; text: string }[] }) => void;

  setPresentationStarted: (payload: { durationMinutes: number; allowMidQuestions: boolean; anonymous: boolean }) => void;
  setPresentationEnded: (payload: { totalElapsedSeconds: number }) => void;
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
