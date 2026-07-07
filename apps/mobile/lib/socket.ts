import { io, Socket } from 'socket.io-client';
import { EVENTS } from '@country-city/shared';
import { useUserStore } from '../stores/userStore';
import { getWebSocketBaseUrl } from './serverUrl';

const WS_URL = getWebSocketBaseUrl();

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = useUserStore.getState().token;
    socket = io(`${WS_URL}/game`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: false,
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export const socketEmit = {
  joinRoom: (roomCode: string) => getSocket().emit(EVENTS.ROOM_JOIN, { roomCode }),
  leaveRoom: () => getSocket().emit(EVENTS.ROOM_LEAVE),
  startGame: () => getSocket().emit(EVENTS.GAME_START),
  markDone: () => getSocket().emit(EVENTS.PLAYER_DONE),
  submitAnswers: (answers: { category: string; values: string[] }[]) =>
    getSocket().emit(EVENTS.ANSWERS_SUBMIT, { answers }),
  advanceReview: () => getSocket().emit(EVENTS.REVIEW_ADVANCE),
  challengeAnswer: (answerId: string) =>
    getSocket().emit(EVENTS.REVIEW_CHALLENGE, { answerId }),
  playAgain: () => getSocket().emit(EVENTS.PLAY_AGAIN),
  finishGame: () => getSocket().emit(EVENTS.GAME_FINISH),
};
