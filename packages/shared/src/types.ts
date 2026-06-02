export type GamePhase =
  | 'waiting'
  | 'rolling'
  | 'playing'
  | 'reviewing'
  | 'finished';

export interface Player {
  id: string;
  displayName: string;
  avatarColor: string;
  isHost: boolean;
  isReady: boolean;
  isDone: boolean;
}

export interface ScoringConfig {
  uniqueWinner: number;
  unique: number;
  shared: number;
  none: number;
}

export interface RoomSettings {
  categories: string[];
  customCategories: string[];
  maxRounds: number | null;
  extraTimeSeconds: number;
  allowMultipleAnswers: boolean;
  scoring: ScoringConfig;
  skipLetters: string[];
  language: 'en' | 'he' | 'both';
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  phase: GamePhase;
  currentRound: number;
  settings: RoomSettings;
  players: Player[];
}

export interface Round {
  id: string;
  roundNumber: number;
  letter: string;
  startedAt: string;
}

export interface PlayerAnswer {
  userId: string;
  displayName: string;
  avatarColor: string;
  values: string[];
  acceptedValue: string | null;
  score: number | null;
  validationStatus: 'pending' | 'valid' | 'invalid' | 'challenged';
}

export interface CategoryReview {
  categoryId: string;
  categoryLabel: string;
  answers: PlayerAnswer[];
}

export interface FinalScore {
  userId: string;
  displayName: string;
  avatarColor: string;
  totalPoints: number;
  roundBreakdown: { round: number; points: number }[];
}
