import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EVENTS } from '@country-city/shared';
import { AuthService } from '../auth/auth.service';
import { GameService } from './game.service';

@WebSocketGateway({ namespace: '/game', cors: true })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly authService: AuthService,
    private readonly gameService: GameService,
  ) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string;
    const user = token ? this.authService.verifyToken(token) : null;
    if (!user) {
      client.disconnect();
      return;
    }
    client.data.user = user;
  }

  async handleDisconnect(client: Socket) {
    await this.gameService.handleDisconnect(client, this.server);
  }

  @SubscribeMessage(EVENTS.ROOM_JOIN)
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomCode: string },
  ) {
    return this.gameService.joinRoom(client, payload.roomCode, this.server);
  }

  @SubscribeMessage(EVENTS.ROOM_LEAVE)
  handleLeave(@ConnectedSocket() client: Socket) {
    return this.gameService.leaveRoom(client, this.server);
  }

  @SubscribeMessage(EVENTS.GAME_START)
  handleStart(@ConnectedSocket() client: Socket) {
    return this.gameService.startGame(client, this.server);
  }

  @SubscribeMessage(EVENTS.PLAYER_DONE)
  handleDone(@ConnectedSocket() client: Socket) {
    return this.gameService.playerDone(client, this.server);
  }

  @SubscribeMessage(EVENTS.ANSWERS_SUBMIT)
  handleSubmit(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { answers: { category: string; values: string[] }[] },
  ) {
    return this.gameService.submitAnswers(client, payload.answers);
  }

  @SubscribeMessage(EVENTS.REVIEW_ADVANCE)
  handleReviewAdvance(@ConnectedSocket() client: Socket) {
    return this.gameService.advanceReview(client, this.server);
  }

  @SubscribeMessage(EVENTS.REVIEW_CHALLENGE)
  handleChallenge(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { answerId: string },
  ) {
    return this.gameService.challengeAnswer(
      client,
      payload.answerId,
      this.server,
    );
  }

  @SubscribeMessage(EVENTS.PLAY_AGAIN)
  handlePlayAgain(@ConnectedSocket() client: Socket) {
    return this.gameService.playAgain(client, this.server);
  }
}
