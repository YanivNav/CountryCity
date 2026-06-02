import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DEFAULT_CATEGORIES, GamePhase, Player, Room, RoomSettings } from '@country-city/shared';
import { CreateRoomDto } from './dto/create-room.dto';

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const DEFAULT_SETTINGS: RoomSettings = {
  categories: DEFAULT_CATEGORIES.map((c) => c.id),
  customCategories: [],
  maxRounds: null,
  extraTimeSeconds: 60,
  allowMultipleAnswers: true,
  scoring: { uniqueWinner: 15, unique: 10, shared: 5, none: 0 },
  skipLetters: [],
  language: 'en',
};

@Injectable()
export class RoomsService {
  private readonly rooms = new Map<string, Room>();

  create(host: { id: string; displayName: string; avatarColor: string }, _dto: CreateRoomDto): Room {
    const code = generateCode();
    const hostPlayer: Player = {
      id: host.id,
      displayName: host.displayName,
      avatarColor: host.avatarColor,
      isHost: true,
      isReady: false,
      isDone: false,
    };
    const room: Room = {
      id: randomUUID(),
      code,
      hostId: host.id,
      phase: 'waiting' as GamePhase,
      currentRound: 0,
      settings: { ...DEFAULT_SETTINGS },
      players: [hostPlayer],
    };
    this.rooms.set(code, room);
    return room;
  }

  findByCode(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  updateSettings(hostId: string, code: string, settings: Partial<RoomSettings>): Room {
    const room = this.rooms.get(code);
    if (!room) throw new Error('Room not found');
    if (room.hostId !== hostId) throw new Error('Not host');
    room.settings = { ...room.settings, ...settings };
    return room;
  }

  // Placeholder — will return real history in Phase 5
  getHistory(_code: string) {
    return [];
  }

  delete(code: string): void {
    this.rooms.delete(code);
  }
}
