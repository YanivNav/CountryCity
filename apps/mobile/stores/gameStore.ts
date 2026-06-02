import { create } from 'zustand';
import type {
  Room, Round, GamePhase, Player,
  CategoryReview, FinalScore,
} from '@country-city/shared';

interface GameState {
  room: Room | null;
  round: Round | null;
  phase: GamePhase;
  countdown: number | null;
  myAnswers: Record<string, string[]>;
  reviewIndex: number;
  currentCategoryReview: CategoryReview | null;
  scores: FinalScore[];

  setRoom: (room: Room) => void;
  updatePlayer: (player: Player) => void;
  removePlayer: (userId: string) => void;
  setPhase: (phase: GamePhase) => void;
  setRound: (round: Round) => void;
  startCountdown: (seconds: number) => void;
  setMyAnswer: (category: string, index: number, value: string) => void;
  addAnswerSlot: (category: string) => void;
  setReviewCategory: (review: CategoryReview) => void;
  setFinalScores: (scores: FinalScore[]) => void;
  resetForNewRound: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  room: null,
  round: null,
  phase: 'waiting',
  countdown: null,
  myAnswers: {},
  reviewIndex: 0,
  currentCategoryReview: null,
  scores: [],

  setRoom: (room) => set({ room, phase: room.phase }),
  updatePlayer: (player) =>
    set((s) => ({
      room: s.room
        ? {
            ...s.room,
            players: s.room.players.some((p) => p.id === player.id)
              ? s.room.players.map((p) => (p.id === player.id ? player : p))
              : [...s.room.players, player],
          }
        : null,
    })),
  removePlayer: (userId) =>
    set((s) => ({
      room: s.room
        ? { ...s.room, players: s.room.players.filter((p) => p.id !== userId) }
        : null,
    })),
  setPhase: (phase) => set({ phase }),
  setRound: (round) => set({ round }),
  startCountdown: (seconds) => set({ countdown: seconds }),
  setMyAnswer: (category, index, value) =>
    set((s) => {
      const current = s.myAnswers[category] ?? [''];
      const updated = [...current];
      updated[index] = value;
      return { myAnswers: { ...s.myAnswers, [category]: updated } };
    }),
  addAnswerSlot: (category) =>
    set((s) => ({
      myAnswers: { ...s.myAnswers, [category]: [...(s.myAnswers[category] ?? ['']), ''] },
    })),
  setReviewCategory: (review) =>
    set((s) => ({ currentCategoryReview: review, reviewIndex: s.reviewIndex + 1 })),
  setFinalScores: (scores) => set({ scores }),
  resetForNewRound: () =>
    set({ round: null, countdown: null, myAnswers: {}, reviewIndex: 0, currentCategoryReview: null }),
}));
