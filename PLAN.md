# Country-City Multiplayer Game App — Full Specification & Tech Stack Plan

> **Purpose of this document:** Feed this entire file into a Claude Code session to scaffold and build the app. It contains all architectural decisions, data models, file structures, API contracts, and implementation notes needed to begin coding without further clarification.

---

## 1. Product Vision

A real-time multiplayer word game app for iOS, Android, and Web. Players join a shared room, receive a random letter, and race to fill categories with valid words starting with that letter. The experience should feel polished, fast, and social — like a party game you'd actually want to play.

### Game Rules (source of truth)
1. A host creates a room and shares a 6-character code.
2. Other players join using the code.
3. The host starts the game; a letter is picked server-side and revealed to all players via a dramatic slot-machine animation.
4. Each player fills in words for each active category — all starting with the chosen letter.
5. Players may enter multiple words per category (safety answers) if `allow_multiple_answers` is enabled.
6. When a player taps **I'm Done**, a countdown (default 60s) starts for everyone.
7. When the timer hits 0, all inputs lock and the Review phase begins.
8. Categories are reviewed one at a time. All players see each other's answers simultaneously.
9. Scoring per category:
   - Only player who answered (everyone else blank): **15 points**
   - Unique valid answer (others answered differently): **10 points**
   - Two or more players wrote the same answer: **5 points each**
   - No answer submitted: **0 points**
10. After all categories are reviewed, the round ends. The game continues for the configured number of rounds, or until the host ends it.
11. The player with the most total points wins.

### Core Design Principles
- Mobile-first but fully functional on web
- Real-time: every player sees game state changes as they happen
- Customizable: categories, scoring, time limits, letter pool — all configurable per room
- Internationalized: Hebrew (RTL) and English (LTR) supported from day one
- Validation: AI-assisted answer checking for ambiguous or custom categories

---

## 2. Monorepo Structure

The project is a monorepo with two packages: the Expo frontend and the NestJS backend.

```
country-city/
├── apps/
│   ├── mobile/          # Expo + React Native app (iOS, Android, Web)
│   └── api/             # NestJS backend
├── packages/
│   └── shared/          # Shared TypeScript types, constants, socket event names
├── package.json         # Root workspace (npm workspaces or pnpm)
└── turbo.json           # Turborepo config (optional but recommended)
```

Using a monorepo means the shared types package can be imported by both apps — socket event payloads, game state enums, and scoring constants are defined once.

---

## 3. Tech Stack

### 3.1 Frontend — React Native (Expo)

| Tool | Version | Purpose |
|---|---|---|
| **Expo SDK** | 52+ | Build tooling, OTA updates, native modules |
| **Expo Router** | v4 | File-based navigation, deep links, web routes |
| **React Native Reanimated** | 3 | Smooth animations (letter roll, countdown, transitions) |
| **React Native Gesture Handler** | latest | Swipe, drag-to-reorder interactions |
| **React Native Screens** | latest | Native screen transitions on iOS/Android |
| **Tamagui** | latest | Cross-platform design system — themes, tokens, components |
| **Zustand** | latest | Lightweight global state (game state, user prefs) |
| **TanStack Query** | v5 | Server-state management for HTTP requests (non-realtime) |
| **socket.io-client** | v4 | WebSocket connection to NestJS backend |
| **Expo Haptics** | latest | Tactile feedback (letter reveal, submit, score) |
| **Expo AV** | latest | Sound effects (tick, reveal, win) — optional Phase 2 |
| **i18next + react-i18next** | latest | Localization (EN / HE) |

**Web support:** Expo's Metro bundler + `react-native-web` renders all components in the browser. Expo Router generates web routes automatically. Deployed to Vercel.

---

### 3.2 Backend — NestJS

| Tool | Version | Purpose |
|---|---|---|
| **NestJS** | v10+ | Application framework (modules, DI, guards, pipes) |
| **@nestjs/websockets** | built-in | WebSocket gateway (wraps socket.io) |
| **socket.io** | v4 | Real-time transport — rooms, namespaces, events |
| **Prisma** | v5+ | ORM — type-safe DB access, migrations |
| **@prisma/client** | v5+ | Generated type-safe DB client |
| **Passport.js + JWT** | latest | Auth — anonymous sessions via JWT, optional social |
| **@nestjs/jwt** | latest | JWT signing/verification |
| **Anthropic SDK** | latest | Claude API for AI answer validation |
| **natural** (npm) | latest | NLP wordlists for fast dictionary-based validation |
| **class-validator** | latest | DTO validation on HTTP + WS payloads |
| **class-transformer** | latest | Transform/serialize DTOs |

---

### 3.3 Database — Neon (Postgres)

- **Neon** serverless Postgres as the database host
- Prisma connects via `DATABASE_URL` — standard Postgres connection string
- Neon free tier is sufficient for development; upgrade to paid for production
- No Supabase features used — Neon is pure Postgres

---

### 3.4 Infrastructure

| Service | Purpose |
|---|---|
| **Neon** | Serverless Postgres database |
| **Railway** | NestJS server hosting (WebSocket-compatible, always-on) |
| **Vercel** | Web frontend hosting (Expo web build) |
| **Expo EAS** | iOS/Android binary builds + OTA updates |
| **GitHub Actions** | CI: lint → test → build → deploy |

> **Why Railway for the backend:** Vercel's serverless functions do not support persistent WebSocket connections. Railway runs a real Node.js process, which socket.io requires.

---

## 4. Shared Types Package (`packages/shared`)

Define all cross-app types here. Both `apps/mobile` and `apps/api` import from `@country-city/shared`.

```typescript
// packages/shared/src/events.ts
// All socket event name constants — single source of truth

export const EVENTS = {
  // Client → Server
  ROOM_JOIN:        'room:join',
  ROOM_LEAVE:       'room:leave',
  GAME_START:       'game:start',
  PLAYER_DONE:      'player:done',
  ANSWERS_SUBMIT:   'answers:submit',
  REVIEW_ADVANCE:   'review:advance',
  REVIEW_CHALLENGE: 'review:challenge',
  PLAY_AGAIN:       'game:play-again',

  // Server → Client
  ROOM_STATE:       'room:state',        // full room snapshot on join
  PLAYER_JOINED:    'player:joined',
  PLAYER_LEFT:      'player:left',
  GAME_STARTED:     'game:started',      // includes letter
  COUNTDOWN_START:  'countdown:start',   // includes seconds
  ROUND_ENDED:      'round:ended',
  REVIEW_CATEGORY:  'review:category',   // reveals one category's answers + scores
  GAME_FINISHED:    'game:finished',     // final scores
  ERROR:            'error',
} as const;

// packages/shared/src/types.ts

export type GamePhase =
  | 'waiting'     // lobby, not started
  | 'rolling'     // letter being revealed
  | 'playing'     // players filling answers
  | 'reviewing'   // category-by-category review
  | 'finished';   // game over

export interface Player {
  id: string;
  displayName: string;
  avatarColor: string;
  isHost: boolean;
  isReady: boolean;
  isDone: boolean;   // has tapped "I'm Done" this round
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

export interface RoomSettings {
  categories: string[];          // ordered list of active category IDs
  customCategories: string[];    // user-added category labels
  maxRounds: number | null;      // null = unlimited
  extraTimeSeconds: number;      // countdown after first player done (default: 60)
  allowMultipleAnswers: boolean; // default: true
  scoring: ScoringConfig;
  skipLetters: string[];         // letters excluded from pool
  language: 'en' | 'he' | 'both';
}

export interface ScoringConfig {
  uniqueWinner: number;  // default: 15
  unique: number;        // default: 10
  shared: number;        // default: 5
  none: number;          // default: 0
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
  values: string[];        // all submitted values for this category
  acceptedValue: string | null;
  score: number | null;    // null until scoring is done
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
```

---

## 5. Data Model (Prisma Schema)

Location: `apps/api/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          String   @id @default(uuid())
  displayName String
  avatarColor String
  createdAt   DateTime @default(now())

  hostedRooms  Room[]        @relation("HostedRooms")
  memberships  RoomMember[]
  answers      Answer[]
  scores       Score[]
}

model Room {
  id           String     @id @default(uuid())
  code         String     @unique  // 6-char e.g. "TIGER7"
  hostId       String
  host         User       @relation("HostedRooms", fields: [hostId], references: [id])
  phase        GamePhase  @default(WAITING)
  currentRound Int        @default(0)
  settings     Json       // RoomSettings object
  createdAt    DateTime   @default(now())
  closedAt     DateTime?

  members RoomMember[]
  rounds  Round[]
  scores  Score[]
}

model RoomMember {
  roomId   String
  userId   String
  room     Room     @relation(fields: [roomId], references: [id])
  user     User     @relation(fields: [userId], references: [id])
  joinedAt DateTime @default(now())
  isReady  Boolean  @default(false)

  @@id([roomId, userId])
}

model Round {
  id           String    @id @default(uuid())
  roomId       String
  room         Room      @relation(fields: [roomId], references: [id])
  roundNumber  Int
  letter       String    @db.Char(1)
  startedAt    DateTime  @default(now())
  finishedAt   DateTime?

  answers Answer[]
}

model Answer {
  id              String             @id @default(uuid())
  roundId         String
  round           Round              @relation(fields: [roundId], references: [id])
  userId          String
  user            User               @relation(fields: [userId], references: [id])
  category        String
  values          String[]           // all submitted answers for this category
  acceptedValue   String?            // chosen during review
  score           Int?               // null until calculated
  validationStatus ValidationStatus @default(PENDING)
  submittedAt     DateTime           @default(now())

  @@unique([roundId, userId, category])
}

model Score {
  roomId       String
  userId       String
  room         Room   @relation(fields: [roomId], references: [id])
  user         User   @relation(fields: [userId], references: [id])
  totalPoints  Int    @default(0)
  roundsPlayed Int    @default(0)

  @@id([roomId, userId])
}

enum GamePhase {
  WAITING
  ROLLING
  PLAYING
  REVIEWING
  FINISHED
}

enum ValidationStatus {
  PENDING
  VALID
  INVALID
  CHALLENGED
}
```

---

## 6. Backend Architecture (NestJS)

### 6.1 Module Structure

```
apps/api/src/
├── main.ts                        # Bootstrap, CORS, WS adapter
├── app.module.ts                  # Root module
│
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts         # POST /auth/anonymous
│   ├── auth.service.ts            # Issue JWT for anonymous users
│   └── jwt.strategy.ts
│
├── rooms/
│   ├── rooms.module.ts
│   ├── rooms.controller.ts        # POST /rooms, GET /rooms/:code
│   ├── rooms.service.ts           # Create room, join, settings
│   └── dto/
│       ├── create-room.dto.ts
│       └── join-room.dto.ts
│
├── game/
│   ├── game.module.ts
│   ├── game.gateway.ts            # WebSocket gateway — all socket events
│   ├── game.service.ts            # Game state machine, round management
│   ├── scoring.service.ts         # Score calculation logic
│   └── letter.service.ts          # Letter pool + seeded RNG
│
├── validation/
│   ├── validation.module.ts
│   ├── validation.service.ts      # Orchestrates dictionary + AI layers
│   ├── dictionary.service.ts      # Fast wordlist checks (natural npm)
│   └── ai-validation.service.ts   # Claude API calls
│
└── prisma/
    ├── prisma.module.ts
    └── prisma.service.ts          # PrismaClient singleton
```

---

### 6.2 Auth Flow

Anonymous auth: client calls `POST /auth/anonymous` with a chosen display name. Server creates a `User` record and returns a JWT. The JWT is attached to all subsequent HTTP requests (Authorization header) and passed as a handshake auth parameter to socket.io.

```typescript
// POST /auth/anonymous
// Body: { displayName: string }
// Response: { token: string, user: { id, displayName, avatarColor } }

// Avatar color is randomly assigned from a preset palette on the server.
// The JWT payload: { sub: userId, displayName }
// Token expiry: 30 days (refresh not required for MVP)
```

Socket.io auth:
```typescript
// Client connects with:
io('wss://api.example.com/game', {
  auth: { token: jwtToken }
});

// Server validates token in gateway handleConnection():
@WebSocketGateway({ namespace: '/game', cors: { origin: '*' } })
export class GameGateway implements OnGatewayConnection {
  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token;
    const user = await this.authService.verifyToken(token);
    if (!user) { client.disconnect(); return; }
    client.data.user = user;  // attach user to socket for all handlers
  }
}
```

---

### 6.3 WebSocket Gateway — Full Event Contract

```typescript
@WebSocketGateway({ namespace: '/game', cors: true })
export class GameGateway {

  @WebSocketServer() server: Server;

  // ── Client → Server ──────────────────────────────────────────

  @SubscribeMessage(EVENTS.ROOM_JOIN)
  // Payload: { roomCode: string }
  // Emits to sender: EVENTS.ROOM_STATE (full room snapshot)
  // Emits to room: EVENTS.PLAYER_JOINED
  async handleJoin(client: Socket, payload: { roomCode: string }) {}

  @SubscribeMessage(EVENTS.ROOM_LEAVE)
  // Payload: none
  // Emits to room: EVENTS.PLAYER_LEFT
  // If host leaves: next player becomes host, or room closes if empty
  async handleLeave(client: Socket) {}

  @SubscribeMessage(EVENTS.GAME_START)
  // Payload: none (host only, validated server-side)
  // Server picks letter via LetterService
  // Emits to room: EVENTS.GAME_STARTED { roundId, letter, roundNumber }
  // Updates room.phase = ROLLING in DB
  async handleStart(client: Socket) {}

  @SubscribeMessage(EVENTS.PLAYER_DONE)
  // Payload: none
  // Server marks player as done
  // If first player done: emits EVENTS.COUNTDOWN_START { seconds: settings.extraTimeSeconds }
  // When all done OR countdown expires: triggers round end, moves to REVIEWING
  async handleDone(client: Socket) {}

  @SubscribeMessage(EVENTS.ANSWERS_SUBMIT)
  // Payload: { answers: { category: string; values: string[] }[] }
  // Persists answers to DB, triggers async validation
  // Client can call this multiple times (upsert); last call before round end wins
  async handleSubmit(client: Socket, payload: AnswersSubmitDto) {}

  @SubscribeMessage(EVENTS.REVIEW_ADVANCE)
  // Payload: none (host only)
  // Emits to room: EVENTS.REVIEW_CATEGORY { categoryIndex, categoryReview: CategoryReview }
  // When all categories reviewed: calculates final scores, emits EVENTS.GAME_FINISHED
  async handleReviewAdvance(client: Socket) {}

  @SubscribeMessage(EVENTS.REVIEW_CHALLENGE)
  // Payload: { answerId: string }
  // Marks answer as CHALLENGED, broadcasts to room for group decision
  // Host can then invalidate or confirm
  async handleChallenge(client: Socket, payload: { answerId: string }) {}

  @SubscribeMessage(EVENTS.PLAY_AGAIN)
  // Payload: none (host only)
  // Resets room to WAITING phase, same players, same settings
  // Emits to room: EVENTS.ROOM_STATE (fresh state)
  async handlePlayAgain(client: Socket) {}
}
```

---

### 6.4 Scoring Service

```typescript
// apps/api/src/game/scoring.service.ts

@Injectable()
export class ScoringService {

  async calculateRound(roundId: string, settings: RoomSettings): Promise<void> {
    const answers = await this.prisma.answer.findMany({
      where: { roundId, validationStatus: { not: 'INVALID' } }
    });

    const categories = settings.categories;

    for (const category of categories) {
      const categoryAnswers = answers.filter(a => a.category === category);

      for (const answer of categoryAnswers) {
        const score = this.scoreAnswer(answer, categoryAnswers, settings.scoring);
        await this.prisma.answer.update({
          where: { id: answer.id },
          data: { score }
        });
      }
    }

    // Aggregate into scores table
    await this.aggregateScores(roundId);
  }

  private scoreAnswer(
    answer: Answer,
    allCategoryAnswers: Answer[],
    config: ScoringConfig
  ): number {
    if (!answer.acceptedValue) return config.none;

    const normalized = this.normalize(answer.acceptedValue);
    const otherAnswers = allCategoryAnswers.filter(a => a.id !== answer.id);
    const othersAnswered = otherAnswers.filter(a => !!a.acceptedValue);

    if (othersAnswered.length === 0) return config.uniqueWinner;

    const matchCount = allCategoryAnswers.filter(
      a => a.acceptedValue && this.normalize(a.acceptedValue) === normalized
    ).length;

    return matchCount === 1 ? config.unique : config.shared;
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/^(the |a |an |ה|ה־)/i, '')  // strip leading articles (EN + HE)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');       // strip diacritics
  }
}
```

---

### 6.5 Validation Service (Two-Layer)

```typescript
// apps/api/src/validation/validation.service.ts

@Injectable()
export class ValidationService {

  async validate(
    value: string,
    category: string,
    letter: string,
    language: string
  ): Promise<{ valid: boolean; confidence: 'high' | 'low'; reason?: string }> {

    // Layer 0: Letter check (instant)
    const firstChar = value.trim()[0]?.toLowerCase();
    if (firstChar !== letter.toLowerCase()) {
      return { valid: false, confidence: 'high', reason: 'Wrong starting letter' };
    }

    // Layer 1: Dictionary check for standard categories (fast, free)
    const standardCategories = ['country', 'city', 'animal', 'plant', 'profession'];
    if (standardCategories.includes(category)) {
      const inDict = await this.dictionaryService.check(value, category, language);
      if (inDict !== null) return { valid: inDict, confidence: 'high' };
      // null means "not in our dictionary" → fall through to AI
    }

    // Layer 2: AI validation (for custom categories, famous people, ambiguous cases)
    return this.aiValidationService.validate(value, category, letter, language);
  }
}

// apps/api/src/validation/ai-validation.service.ts

@Injectable()
export class AiValidationService {

  constructor(private readonly anthropic: Anthropic) {}

  async validate(
    value: string,
    category: string,
    letter: string,
    language: string
  ): Promise<{ valid: boolean; confidence: 'low'; reason: string }> {

    const prompt = `You are validating an answer in the game "Country City" (also known as "Categories" or "Scattergories").

Letter: "${letter.toUpperCase()}"
Category: "${category}"
Answer submitted: "${value}"
Game language: ${language}

Is this a valid answer? Consider:
- The answer must start with the letter "${letter.toUpperCase()}" (case-insensitive)
- The answer must genuinely fit the category "${category}"
- For "famous person": any well-known real person counts
- Be lenient with alternate spellings and transliterations
- Do not penalize for minor typos if the intended answer is clear

Respond with JSON only: { "valid": true/false, "reason": "brief one-sentence explanation" }`;

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',  // fast + cheap for validation
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = JSON.parse(text);
    return { valid: parsed.valid, confidence: 'low', reason: parsed.reason };
  }
}
```

> **Cost note:** Claude Haiku is used for validation — it's the fastest and cheapest model. A typical game round with 9 categories and 4 players may trigger ~10–20 AI calls (only for ambiguous answers not in the dictionary). At Haiku pricing this is negligible.

---

### 6.6 Letter Service

```typescript
// apps/api/src/game/letter.service.ts

const DEFAULT_LETTER_POOL_EN = 'ABCDEFGHIJKLMNOPRSTW'.split(''); // no X, Q, Y, V, Z, U by default
const DEFAULT_LETTER_POOL_HE = 'אבגדהוזחטיכלמנסעפצקרשת'.split('');

@Injectable()
export class LetterService {

  pickLetter(settings: RoomSettings, usedLetters: string[]): string {
    const pool = settings.language === 'he'
      ? DEFAULT_LETTER_POOL_HE
      : DEFAULT_LETTER_POOL_EN;

    const filtered = pool
      .filter(l => !settings.skipLetters.includes(l))
      .filter(l => !usedLetters.includes(l));  // don't repeat in same game

    if (filtered.length === 0) {
      // All letters used — reset (shouldn't happen in normal games)
      return pool.filter(l => !settings.skipLetters.includes(l))[
        Math.floor(Math.random() * pool.length)
      ];
    }

    return filtered[Math.floor(Math.random() * filtered.length)];
  }
}
```

---

## 7. Frontend Architecture (Expo + React Native)

### 7.1 File Structure

```
apps/mobile/
├── app/                              # Expo Router screens
│   ├── _layout.tsx                   # Root layout — auth provider, theme
│   ├── index.tsx                     # Home screen
│   ├── create.tsx                    # Create room + settings
│   ├── join.tsx                      # Join by code
│   ├── profile.tsx                   # Display name, avatar, history
│   └── room/
│       └── [code]/
│           ├── _layout.tsx           # Socket connection, room subscription
│           ├── lobby.tsx             # Waiting room
│           ├── rolling.tsx           # Letter reveal animation
│           ├── play.tsx              # Answer input
│           ├── review.tsx            # Category-by-category reveal
│           └── results.tsx           # Final leaderboard
│
├── components/
│   ├── game/
│   │   ├── LetterRoller.tsx          # Slot machine animation component
│   │   ├── CategoryInput.tsx         # Single category row (label + input(s))
│   │   ├── CountdownBar.tsx          # Animated progress bar
│   │   ├── PlayerCard.tsx            # Avatar + name + status chip
│   │   ├── AnswerReveal.tsx          # Animated answer card for review
│   │   ├── ScoreBadge.tsx            # +15 / +10 / +5 / — badge
│   │   └── Podium.tsx                # Top 3 animated podium
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Avatar.tsx                # Colored circle with initials
│       ├── RoomCode.tsx              # Large copyable code display
│       ├── Toggle.tsx
│       └── DraggableList.tsx         # Gesture-based reorderable list
│
├── stores/
│   ├── gameStore.ts                  # Zustand — game state
│   ├── userStore.ts                  # Zustand — user prefs + identity
│   └── socketStore.ts                # Zustand — socket connection state
│
├── lib/
│   ├── socket.ts                     # socket.io-client singleton + typed emitters
│   ├── api.ts                        # HTTP client (TanStack Query fetchers)
│   ├── auth.ts                       # JWT storage + anonymous login
│   └── i18n/
│       ├── index.ts                  # i18next config
│       ├── en.json
│       └── he.json
│
└── tamagui.config.ts                 # Design tokens, themes, fonts
```

---

### 7.2 Socket Client

```typescript
// apps/mobile/lib/socket.ts

import { io, Socket } from 'socket.io-client';
import { EVENTS } from '@country-city/shared';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = getStoredToken(); // from SecureStore
    socket = io(`${API_BASE_URL}/game`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: false,
    });
  }
  return socket;
}

// Typed emit helpers — use these instead of raw socket.emit
export const socketEmit = {
  joinRoom:       (roomCode: string) =>
    getSocket().emit(EVENTS.ROOM_JOIN, { roomCode }),
  markDone:       () =>
    getSocket().emit(EVENTS.PLAYER_DONE),
  submitAnswers:  (answers: { category: string; values: string[] }[]) =>
    getSocket().emit(EVENTS.ANSWERS_SUBMIT, { answers }),
  startGame:      () =>
    getSocket().emit(EVENTS.GAME_START),
  advanceReview:  () =>
    getSocket().emit(EVENTS.REVIEW_ADVANCE),
  challengeAnswer:(answerId: string) =>
    getSocket().emit(EVENTS.REVIEW_CHALLENGE, { answerId }),
  playAgain:      () =>
    getSocket().emit(EVENTS.PLAY_AGAIN),
};
```

---

### 7.3 Zustand Game Store

```typescript
// apps/mobile/stores/gameStore.ts

interface GameState {
  room: Room | null;
  round: Round | null;
  phase: GamePhase;
  countdown: number | null;
  myAnswers: Record<string, string[]>;       // category → values I've typed
  reviewIndex: number;
  currentCategoryReview: CategoryReview | null;
  scores: FinalScore[];

  // Actions
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
```

---

### 7.4 Room Layout — Socket Subscription

The `app/room/[code]/_layout.tsx` is the central hub that connects to the socket, subscribes to all events, and updates the game store. All child screens read from the store.

```typescript
// apps/mobile/app/room/[code]/_layout.tsx

export default function RoomLayout() {
  const { code } = useLocalSearchParams();
  const router = useRouter();
  const { setRoom, setPhase, updatePlayer, ... } = useGameStore();

  useEffect(() => {
    const socket = getSocket();
    socket.connect();
    socketEmit.joinRoom(code as string);

    socket.on(EVENTS.ROOM_STATE,       (room) => setRoom(room));
    socket.on(EVENTS.PLAYER_JOINED,    (p)    => updatePlayer(p));
    socket.on(EVENTS.PLAYER_LEFT,      ({ userId }) => removePlayer(userId));
    socket.on(EVENTS.GAME_STARTED,     (data) => {
      setRound(data);
      setPhase('rolling');
      router.replace(`/room/${code}/rolling`);
    });
    socket.on(EVENTS.COUNTDOWN_START,  ({ seconds }) => startCountdown(seconds));
    socket.on(EVENTS.ROUND_ENDED,      () => setPhase('reviewing'));
    socket.on(EVENTS.REVIEW_CATEGORY,  (review) => setReviewCategory(review));
    socket.on(EVENTS.GAME_FINISHED,    (scores) => {
      setFinalScores(scores);
      setPhase('finished');
      router.replace(`/room/${code}/results`);
    });

    return () => {
      socket.off(EVENTS.ROOM_STATE);
      // ... off all events
      socket.disconnect();
    };
  }, [code]);

  return <Slot />;
}
```

---

### 7.5 Screen Specifications

#### Home Screen (`app/index.tsx`)
- App logo and name
- **Create Game** and **Join Game** CTA buttons (full-width)
- Recent rooms list (stored in AsyncStorage — tap to rejoin)
- Profile shortcut in header (display name, avatar)

#### Create Room Screen (`app/create.tsx`)
- Calls `POST /rooms` on mount to create the room and get the code immediately
- Room code displayed prominently at top (large, tap-to-copy, share button)
- Category editor:
  - Default categories listed with toggle switches
  - **+ Add category** button → text input inline
  - Drag handle to reorder (DraggableList component)
- Settings accordion:
  - Number of rounds (stepper: 1–10 or ∞)
  - Countdown duration (segmented: 30s / 60s / 90s / 120s)
  - Multiple answers (toggle)
  - Skip letters (grid of A–Z, tap to exclude)
- Room is live as soon as created — players can join while host configures settings

#### Lobby Screen (`app/room/[code]/lobby.tsx`)
- Room code at top, large (copyable + share sheet)
- Real-time player list — avatar + name + "Host" badge if applicable
- Host: **Start Game** button (disabled until ≥2 players)
- Non-host: "Waiting for host to start…" + animated ellipsis
- Settings summary visible to all players (read-only for non-host)

#### Letter Roll Screen (`app/room/[code]/rolling.tsx`)
- Full-screen, dark background
- Slot machine: all letters cycle rapidly, decelerate over ~3s, snap to the chosen letter
- Uses `react-native-reanimated` for the scroll animation with a custom easing curve
- Haptic feedback on snap (Expo Haptics `impactAsync(Heavy)`)
- Letter stays displayed for 1.5s, then auto-navigates to Play screen
- All players see this simultaneously (letter comes from `EVENTS.GAME_STARTED`)

#### Play Screen (`app/room/[code]/play.tsx`)
- Letter badge pinned at top
- Scroll view of categories, each showing:
  - Category label (localized)
  - One or more text inputs (controlled, stored in `gameStore.myAnswers`)
  - Green checkmark when at least one input has content
  - If `allowMultipleAnswers`: small **+** button to add a second input slot
- Fill progress at top: "5 / 9 filled"
- **I'm Done** FAB (floating action button) — triggers `socketEmit.markDone()`
- When countdown starts: sticky countdown bar appears at top, pulses red below 15s
- When timer hits 0: all inputs become read-only, `socketEmit.submitAnswers()` fires automatically, route changes to `review`

#### Review Screen (`app/room/[code]/review.tsx`)
- Category progress pills at top: "Country → City → Animal…" (current highlighted)
- Category title large and centered
- Player answer cards animate in with stagger (150ms per card, slide-up + fade)
- Each card shows: avatar, player name, their answer(s), score badge
- Score badge: `+15` (gold), `+10` (green), `+5` (blue), `—` (gray)
- Challenge button per answer (flag icon) — sends `EVENTS.REVIEW_CHALLENGE`
- Running score tally at bottom (updates each category)
- **Next** button (host only) or auto-advance after 6s
- Final category → auto-navigates to Results

#### Results Screen (`app/room/[code]/results.tsx`)
- Animated podium: 1st, 2nd, 3rd places drop in from top with spring (staggered)
- Full leaderboard below podium (sorted by total points)
- Per-player: avatar, name, total points, round breakdown expandable
- **Play Again** (host only — same room, new round) / **Home** button

---

## 8. Default Categories

Stored as constants in `packages/shared/src/categories.ts`:

```typescript
export const DEFAULT_CATEGORIES = [
  { id: 'country',       en: 'Country',         he: 'מדינה'         },
  { id: 'city',          en: 'City',             he: 'עיר'           },
  { id: 'animal',        en: 'Animal',           he: 'חיה'           },
  { id: 'plant',         en: 'Plant',            he: 'צמח'           },
  { id: 'inanimate',     en: 'Inanimate object', he: 'חפץ דומם'      },
  { id: 'boy',           en: "Boy's name",       he: 'שם פרטי לזכר'  },
  { id: 'girl',          en: "Girl's name",      he: 'שם פרטי לנקבה' },
  { id: 'famous_person', en: 'Famous person',    he: 'אדם מפורסם'    },
  { id: 'profession',    en: 'Profession',       he: 'מקצוע'         },
];
```

---

## 9. UI/UX Design Direction

### Visual Identity
- **Aesthetic:** Playful but clean. Bold display typography, vibrant accent, generous whitespace.
- **Font:** Display — `Nunito` (rounded, fun, legible at large sizes). Body — `Inter`.
- **Color Palette:**
  - Primary (actions, highlights): Deep indigo `#3D2FCF`
  - Accent (energy, urgency): Bright coral `#FF6B5B`
  - Success (valid, scored): Emerald `#22C997`
  - Warning (countdown < 15s): Amber `#F59E0B`
  - Background light: `#F8F7FF` / Background dark: `#16141E`
  - Surface light: `#FFFFFF` / Surface dark: `#1F1D2B`
  - Each category gets a unique subtle tint (10-color cycle)

### Dark Mode
Full dark mode via Tamagui themes. System preference respected by default, user-overridable.

### RTL (Hebrew) Support
- Detect locale on app launch via `expo-localization`
- Apply `I18nManager.forceRTL(true)` and restart if needed
- All flexbox directions flip via `direction: 'rtl'` on root
- All animations mirror (slide-in from left instead of right)
- Text inputs `textAlign: 'right'`
- Tamagui handles most RTL automatically

### Key Animations (React Native Reanimated 3)
| Moment | Animation |
|---|---|
| Letter roll | Custom scroll interpolation: ease-in for spin, custom deceleration curve, spring snap |
| Answer reveal | Cards stagger in: `translateY: 40→0` + `opacity: 0→1`, 150ms between each |
| Score badge | Slide in from trailing edge + scale bounce (`spring`) |
| Countdown bar | `width` shrinks linearly, `backgroundColor` interpolates indigo→amber→coral |
| Player join (lobby) | `translateY: 20→0` + `opacity: 0→1` with spring |
| Podium | Each position drops from `translateY: -200` with staggered spring |
| "I'm Done" first press | Ripple effect + haptic Heavy + brief screen flash |

---

## 10. API Endpoints (HTTP)

These are the REST endpoints. All game state changes during a session go through WebSocket, not HTTP.

```
POST   /auth/anonymous         Create anonymous user, returns JWT
GET    /auth/me                Get current user from JWT

POST   /rooms                  Create a new room, returns { room, code }
GET    /rooms/:code            Get room info (for join screen preview)
PATCH  /rooms/:code/settings   Update room settings (host only)

GET    /rooms/:code/history    Get completed rounds for this room (results screen)
```

---

## 11. Environment Variables

### `apps/api/.env`
```
DATABASE_URL=postgresql://...@neon.tech/country_city
JWT_SECRET=<random 64-char hex>
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
CLIENT_URL=http://localhost:8081   # Expo web dev URL
```

### `apps/mobile/.env`
```
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_WS_URL=ws://localhost:3001
```

---

## 12. Development Phases

### Phase 1 — Core Gameplay (MVP)
- [ ] Monorepo setup (npm workspaces, shared package)
- [ ] Prisma schema + Neon DB + initial migration
- [ ] NestJS: anonymous auth (JWT)
- [ ] NestJS: `POST /rooms`, `GET /rooms/:code`
- [ ] NestJS: GameGateway — join, leave, start, done, submit, review, finish
- [ ] NestJS: ScoringService
- [ ] NestJS: LetterService
- [ ] Expo: anonymous login flow + JWT storage
- [ ] Expo: Home, Create, Join screens
- [ ] Expo: Room layout with socket subscription
- [ ] Expo: Lobby screen
- [ ] Expo: Letter Roll screen (basic, no animation yet)
- [ ] Expo: Play screen (all 9 default categories)
- [ ] Expo: Review screen
- [ ] Expo: Results screen

### Phase 2 — Polish & Animation
- [ ] Letter roll slot machine animation (Reanimated)
- [ ] Answer reveal stagger animation
- [ ] Countdown bar animation + color shift
- [ ] Podium animation
- [ ] Score badge spring animation
- [ ] Haptics on key moments
- [ ] Dark mode
- [ ] Category customization UI (toggle, add, reorder)
- [ ] Room settings UI (rounds, timer, skip letters)

### Phase 3 — AI Validation
- [ ] NestJS: DictionaryService (static wordlists for standard categories)
- [ ] NestJS: AiValidationService (Claude Haiku)
- [ ] NestJS: ValidationService orchestrator
- [ ] Wire validation into answer submission flow
- [ ] Show validation status on Review screen (pending → valid/invalid indicator)
- [ ] Challenge flow (players can flag AI decisions for group vote)

### Phase 4 — RTL & Localization
- [ ] i18next setup with EN and HE namespaces
- [ ] Translate all UI strings
- [ ] RTL layout testing on all screens
- [ ] Hebrew letter mode (alephbet pool)
- [ ] Mixed-language rooms

### Phase 5 — Social & History
- [ ] User profiles with game history
- [ ] Persistent identity (optional upgrade from anonymous)
- [ ] Share room link (deep link) + QR code
- [ ] Post-game share card image
- [ ] Emoji reactions during review

### Phase 6 — Advanced Features
- [ ] Spectator mode
- [ ] Tournament brackets
- [ ] Custom room themes / skins
- [ ] Word validity hints during play (soft AI suggestions)

---

## 13. Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Realtime transport | socket.io on NestJS | Full control, learn the technology, supports complex room logic |
| Database | Neon (Postgres) via Prisma | Serverless Postgres, generous free tier, Prisma DX is excellent |
| Scoring | NestJS ScoringService | Server-side prevents cheating; single source of truth |
| Auth | Anonymous JWT | Zero friction to play; no account required |
| Validation (fast) | Dictionary wordlists | Covers ~80% of answers instantly and for free |
| Validation (smart) | Claude Haiku | Handles custom categories, famous people, edge cases cheaply |
| Frontend state | Zustand | Lightweight, no boilerplate, works well with socket event handlers |
| Navigation | Expo Router | File-based routing, deep links, web support out of the box |
| UI framework | Tamagui | Best cross-platform (iOS/Android/Web) with RTL and dark mode support |
| Monorepo | npm workspaces | Shared types between frontend and backend without publishing |

---

## 14. Estimated Timeline

| Phase | Duration |
|---|---|
| Phase 1 — MVP | 3–4 weeks |
| Phase 2 — Polish & Animation | 2 weeks |
| Phase 3 — AI Validation | 1 week |
| Phase 4 — RTL & Localization | 1 week |
| Phase 5 — Social & History | 2 weeks |
| Phase 6 — Advanced | ongoing |
| **Total to fully polished app** | **~9–10 weeks** |

---

*Last updated: May 2026*
