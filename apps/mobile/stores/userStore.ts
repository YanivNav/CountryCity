import { create } from 'zustand';

interface UserState {
  id: string | null;
  displayName: string;
  avatarColor: string;
  token: string | null;
  setUser: (user: { id: string; displayName: string; avatarColor: string }) => void;
  setToken: (token: string) => void;
  clear: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  id: null,
  displayName: '',
  avatarColor: '#3D2FCF',
  token: null,
  setUser: (user) => set(user),
  setToken: (token) => set({ token }),
  clear: () => set({ id: null, displayName: '', token: null }),
}));
