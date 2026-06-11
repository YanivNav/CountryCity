import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Server, Socket } from 'socket.io';
import {
  CategoryReview,
  DEFAULT_CATEGORIES,
  EVENTS,
  FinalScore,
  Player,
  PlayerAnswer,
  Room,
  Round,
} from '@country-city/shared';
import { RoomsService } from '../rooms/rooms.service';
import { ScoringService } from './scoring.service';
import { LetterService } from './letter.service';

interface RoundRuntime {
  id: string;
  roundNumber: number;
  letter: string;
  startedAt: string;
  // userId -> (categoryId -> submitted values)
  answers: Map<string, Map<string, string[]>>;
}

/**
 * Per-room live game state. Phase 1 keeps all in-progress game state in memory
 * (no Prisma writes) — see CLAUDE.md "State persistence". Durable history is a
 * Phase 5 concern.
 */
interface GameRuntime {
  usedLetters: string[];
  round: RoundRuntime | null;
  reviews: CategoryReview[]; // computed at round end, one per active category
  reviewIndex: number; // index of the next category to reveal
  countdown: ReturnType<typeof setTimeout> | null;
}

type SocketUser = { id: string; displayName: string; avatarColor: string };

@Injectable()
export class GameService {
  private readonly runtimes = new Map<string, GameRuntime>();

  constructor(
    private readonly rooms: RoomsService,
    private readonly scoring: ScoringService,
    private readonly letter: LetterService,
  ) {}

  private getRuntime(code: string): GameRuntime {
    let rt = this.runtimes.get(code);
    if (!rt) {
      rt = {
        usedLetters: [],
        round: null,
        reviews: [],
        reviewIndex: 0,
        countdown: null,
      };
      this.runtimes.set(code, rt);
    }
    return rt;
  }

  private clearCountdown(rt: GameRuntime): void {
    if (rt.countdown) {
      clearTimeout(rt.countdown);
      rt.countdown = null;
    }
  }

  async joinRoom(client: Socket, roomCode: string, _server: Server) {
    const user = client.data.user as SocketUser;
    const room = this.rooms.findByCode(roomCode);

    if (!room) {
      client.emit(EVENTS.ERROR, { message: 'Room not found' });
      return;
    }

    if (room.phase !== 'waiting') {
      client.emit(EVENTS.ERROR, { message: 'Game already in progress' });
      return;
    }

    await client.join(roomCode);
    client.data.roomCode = roomCode;

    // Add player if not already present (handles reconnects gracefully)
    if (!room.players.find((p) => p.id === user.id)) {
      const newPlayer: Player = {
        id: user.id,
        displayName: user.displayName,
        avatarColor: user.avatarColor,
        isHost: user.id === room.hostId,
        isReady: false,
        isDone: false,
      };
      room.players.push(newPlayer);
      client.to(roomCode).emit(EVENTS.PLAYER_JOINED, newPlayer);
    }

    // Send full room state to the joining client
    client.emit(EVENTS.ROOM_STATE, room);
  }

  async leaveRoom(client: Socket, server: Server) {
    const roomCode: string | undefined = client.data.roomCode;
    const user = client.data.user as SocketUser | undefined;

    if (!roomCode || !user) return;

    client.leave(roomCode);
    client.data.roomCode = undefined;

    const room = this.rooms.findByCode(roomCode);
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== user.id);
    server.to(roomCode).emit(EVENTS.PLAYER_LEFT, { userId: user.id });

    // Clean up empty rooms
    const sockets = await server.in(roomCode).fetchSockets();
    if (sockets.length === 0) {
      const rt = this.runtimes.get(roomCode);
      if (rt) this.clearCountdown(rt);
      this.runtimes.delete(roomCode);
      this.rooms.delete(roomCode);
      return;
    }

    // Reassign host if the host left
    if (room.hostId === user.id && room.players.length > 0) {
      const next = room.players[0];
      room.hostId = next.id;
      next.isHost = true;
      server.to(roomCode).emit(EVENTS.ROOM_STATE, room);
    }

    // If a player leaves mid-round and everyone still here is done, end the round.
    if (
      room.phase === 'playing' &&
      room.players.length > 0 &&
      room.players.every((p) => p.isDone)
    ) {
      this.endRound(roomCode, server);
    }
  }

  async handleDisconnect(client: Socket, server: Server) {
    await this.leaveRoom(client, server);
  }

  startGame(client: Socket, server: Server) {
    const user = client.data.user as SocketUser;
    const roomCode: string | undefined = client.data.roomCode;
    const room = roomCode ? this.rooms.findByCode(roomCode) : undefined;
    if (!room || !roomCode) return;

    if (room.hostId !== user.id) {
      client.emit(EVENTS.ERROR, { message: 'Only the host can start the game' });
      return;
    }
    if (room.phase !== 'waiting') {
      client.emit(EVENTS.ERROR, { message: 'Game already started' });
      return;
    }
    if (room.players.length < 2) {
      client.emit(EVENTS.ERROR, { message: 'Need at least 2 players to start' });
      return;
    }

    const rt = this.getRuntime(roomCode);
    this.clearCountdown(rt);

    const letter = this.letter.pick(room.settings, rt.usedLetters);
    rt.usedLetters.push(letter);

    room.currentRound += 1;
    room.phase = 'playing';
    room.players.forEach((p) => (p.isDone = false));

    const round: Round = {
      id: randomUUID(),
      roundNumber: room.currentRound,
      letter,
      startedAt: new Date().toISOString(),
    };
    rt.round = { ...round, answers: new Map() };
    rt.reviews = [];
    rt.reviewIndex = 0;

    server.to(roomCode).emit(EVENTS.GAME_STARTED, round);
  }

  submitAnswers(
    client: Socket,
    answers: { category: string; values: string[] }[],
  ) {
    const user = client.data.user as SocketUser;
    const roomCode: string | undefined = client.data.roomCode;
    const room = roomCode ? this.rooms.findByCode(roomCode) : undefined;
    if (!room || !roomCode || room.phase !== 'playing') return;

    const rt = this.getRuntime(roomCode);
    if (!rt.round) return;

    // Upsert: the most recent submission for this player replaces the previous.
    const byCategory = new Map<string, string[]>();
    for (const entry of answers) {
      byCategory.set(entry.category, entry.values);
    }
    rt.round.answers.set(user.id, byCategory);
  }

  playerDone(client: Socket, server: Server) {
    const user = client.data.user as SocketUser;
    const roomCode: string | undefined = client.data.roomCode;
    const room = roomCode ? this.rooms.findByCode(roomCode) : undefined;
    if (!room || !roomCode || room.phase !== 'playing') return;

    const player = room.players.find((p) => p.id === user.id);
    if (!player || player.isDone) return;

    player.isDone = true;

    // Everyone is done — end the round immediately.
    if (room.players.every((p) => p.isDone)) {
      this.endRound(roomCode, server);
      return;
    }

    // First player to finish starts the countdown for everyone else.
    const doneCount = room.players.filter((p) => p.isDone).length;
    if (doneCount === 1) {
      const seconds = room.settings.extraTimeSeconds;
      if (seconds <= 0) {
        this.endRound(roomCode, server);
        return;
      }
      const rt = this.getRuntime(roomCode);
      this.clearCountdown(rt);
      rt.countdown = setTimeout(() => {
        this.endRound(roomCode, server);
      }, seconds * 1000);
      server.to(roomCode).emit(EVENTS.COUNTDOWN_START, { seconds });
    }
  }

  private endRound(roomCode: string, server: Server) {
    const room = this.rooms.findByCode(roomCode);
    const rt = this.runtimes.get(roomCode);
    if (!room || !rt || !rt.round || room.phase !== 'playing') return;

    this.clearCountdown(rt);
    room.phase = 'reviewing';

    rt.reviews = this.buildReviews(room, rt.round);
    rt.reviewIndex = 0;

    server.to(roomCode).emit(EVENTS.ROUND_ENDED);

    // Reveal the first category right away; the host advances through the rest.
    this.emitNextCategory(roomCode, server);
  }

  advanceReview(client: Socket, server: Server) {
    const user = client.data.user as SocketUser;
    const roomCode: string | undefined = client.data.roomCode;
    const room = roomCode ? this.rooms.findByCode(roomCode) : undefined;
    if (!room || !roomCode || room.phase !== 'reviewing') return;

    if (room.hostId !== user.id) {
      client.emit(EVENTS.ERROR, { message: 'Only the host can advance review' });
      return;
    }

    this.emitNextCategory(roomCode, server);
  }

  private emitNextCategory(roomCode: string, server: Server) {
    const rt = this.runtimes.get(roomCode);
    if (!rt) return;

    if (rt.reviewIndex >= rt.reviews.length) {
      this.finalizeGame(roomCode, server);
      return;
    }

    const review = rt.reviews[rt.reviewIndex];
    rt.reviewIndex += 1;
    server.to(roomCode).emit(EVENTS.REVIEW_CATEGORY, review);
  }

  private finalizeGame(roomCode: string, server: Server) {
    const room = this.rooms.findByCode(roomCode);
    const rt = this.runtimes.get(roomCode);
    if (!room || !rt) return;

    room.phase = 'finished';
    const finalScores = this.buildFinalScores(room, rt.reviews);
    server.to(roomCode).emit(EVENTS.GAME_FINISHED, finalScores);
  }

  challengeAnswer(_client: Socket, _answerId: string, _server: Server) {
    // Deferred to Phase 3 (AI Validation). The challenge flow lets players flag
    // an answer for a group decision; it has no effect until validation lands.
  }

  playAgain(client: Socket, server: Server) {
    const user = client.data.user as SocketUser;
    const roomCode: string | undefined = client.data.roomCode;
    const room = roomCode ? this.rooms.findByCode(roomCode) : undefined;
    if (!room || !roomCode) return;

    if (room.hostId !== user.id) {
      client.emit(EVENTS.ERROR, { message: 'Only the host can restart' });
      return;
    }

    const rt = this.getRuntime(roomCode);
    this.clearCountdown(rt);
    rt.usedLetters = [];
    rt.round = null;
    rt.reviews = [];
    rt.reviewIndex = 0;

    room.phase = 'waiting';
    room.currentRound = 0;
    room.players.forEach((p) => (p.isDone = false));

    server.to(roomCode).emit(EVENTS.ROOM_STATE, room);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private categoryLabel(id: string, language: string): string {
    const def = DEFAULT_CATEGORIES.find((c) => c.id === id);
    if (def) return language === 'he' ? def.he : def.en;
    return id; // custom categories use their id/label as-is
  }

  private buildReviews(room: Room, round: RoundRuntime): CategoryReview[] {
    return room.settings.categories.map((categoryId) => {
      const answers: PlayerAnswer[] = room.players.map((player) => {
        const raw = round.answers.get(player.id)?.get(categoryId) ?? [];
        const values = raw.map((v) => v.trim()).filter((v) => v.length > 0);
        const acceptedValue = values[0] ?? null;
        return {
          userId: player.id,
          displayName: player.displayName,
          avatarColor: player.avatarColor,
          values,
          acceptedValue,
          score: null,
          // No automated validation in Phase 1 — answered values are accepted.
          validationStatus: acceptedValue ? 'valid' : 'pending',
        };
      });

      this.scoring.scoreCategory(answers, room.settings.scoring);

      return {
        categoryId,
        categoryLabel: this.categoryLabel(categoryId, room.settings.language),
        answers,
      };
    });
  }

  private buildFinalScores(room: Room, reviews: CategoryReview[]): FinalScore[] {
    return room.players
      .map((player) => {
        const totalPoints = reviews.reduce((sum, review) => {
          const answer = review.answers.find((a) => a.userId === player.id);
          return sum + (answer?.score ?? 0);
        }, 0);
        return {
          userId: player.id,
          displayName: player.displayName,
          avatarColor: player.avatarColor,
          totalPoints,
          roundBreakdown: [{ round: room.currentRound, points: totalPoints }],
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }
}
