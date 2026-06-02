import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { EVENTS, Player } from '@country-city/shared';
import { RoomsService } from '../rooms/rooms.service';
import { ScoringService } from './scoring.service';
import { LetterService } from './letter.service';

@Injectable()
export class GameService {
  constructor(
    private readonly rooms: RoomsService,
    private readonly scoring: ScoringService,
    private readonly letter: LetterService,
  ) {}

  async joinRoom(client: Socket, roomCode: string, _server: Server) {
    const user = client.data.user as {
      id: string;
      displayName: string;
      avatarColor: string;
    };
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
    const user = client.data.user as { id: string } | undefined;

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
  }

  async handleDisconnect(client: Socket, server: Server) {
    await this.leaveRoom(client, server);
  }

  async startGame(client: Socket, server: Server) {
    // TODO: implement
  }

  async playerDone(client: Socket, server: Server) {
    // TODO: implement
  }

  async submitAnswers(
    client: Socket,
    answers: { category: string; values: string[] }[],
  ) {
    // TODO: implement
  }

  async advanceReview(client: Socket, server: Server) {
    // TODO: implement
  }

  async challengeAnswer(client: Socket, answerId: string, server: Server) {
    // TODO: implement
  }

  async playAgain(client: Socket, server: Server) {
    // TODO: implement
  }
}
