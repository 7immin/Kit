// mobile/store/useKitStore.ts
import { create } from 'zustand';

export interface Presenter {
  userId: string;
  name: string;
  isCurrentPresenter: boolean;
}

interface KitState {
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

  setRoomCreated: (payload: { roomId: string; displayCode: string; audienceCode: string; presenterCode: string; title: string }) => void;
  setRoomJoined: (payload: { userId: string; role: 'presenter' }) => void;
  setPresenterList: (presenters: Presenter[]) => void;
  setAudienceCount: (count: number) => void;
  setNotesReady: (payload: { slideNotes: { slideIndex: number; text: string }[] }) => void;
}

export const useKitStore = create<KitState>((set) => ({
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

  setRoomCreated: (payload) => set(payload),
  setRoomJoined: (payload) => set(payload),
  setPresenterList: (presenters) => set({ presenters }),
  setAudienceCount: (count) => set({ audienceCount: count }),
  setNotesReady: (payload) => set({ slideNotes: payload.slideNotes, scriptProcessing: false }),
}));