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

  setRoomCreated: (payload: { roomId: string; displayCode: string; audienceCode: string; presenterCode: string }) => void;
  setRoomJoined: (payload: { userId: string; role: 'presenter' }) => void;
  setPresenterList: (presenters: Presenter[]) => void;
  setAudienceCount: (count: number) => void;
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

  setRoomCreated: (payload) => set(payload),
  setRoomJoined: (payload) => set(payload),
  setPresenterList: (presenters) => set({ presenters }),
  setAudienceCount: (count) => set({ audienceCount: count }),
}));