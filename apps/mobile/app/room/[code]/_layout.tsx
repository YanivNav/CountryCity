import { useEffect } from 'react';
import { Slot, useLocalSearchParams, useRouter } from 'expo-router';
import { EVENTS } from '@country-city/shared';
import type { Room, Player, Round, CategoryReview, FinalScore } from '@country-city/shared';
import { getSocket, disconnectSocket, socketEmit } from '../../../lib/socket';
import { useGameStore } from '../../../stores/gameStore';

export default function RoomLayout() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const {
    setRoom, updatePlayer, removePlayer,
    setPhase, setRound, startCountdown,
    setReviewCategory, setFinalScores, clearScores,
  } = useGameStore();

  useEffect(() => {
    if (!code) return;

    const socket = getSocket();
    socket.connect();
    socketEmit.joinRoom(code);

    socket.on(EVENTS.ROOM_STATE, (room: Room) => setRoom(room));
    socket.on(EVENTS.PLAYER_JOINED, (player: Player) => updatePlayer(player));
    socket.on(EVENTS.PLAYER_LEFT, ({ userId }: { userId: string }) => removePlayer(userId));

    socket.on(EVENTS.GAME_STARTED, (data: Round) => {
      clearScores();
      setRound(data);
      setPhase('rolling');
      router.replace(`/room/${code}/rolling`);
    });

    socket.on(EVENTS.COUNTDOWN_START, ({ seconds }: { seconds: number }) =>
      startCountdown(seconds),
    );

    socket.on(EVENTS.ROUND_ENDED, () => setPhase('reviewing'));

    socket.on(EVENTS.REVIEW_CATEGORY, (review: CategoryReview) =>
      setReviewCategory(review),
    );

    socket.on(EVENTS.GAME_FINISHED, (scores: FinalScore[]) => {
      setFinalScores(scores);
      setPhase('finished');
      router.replace(`/room/${code}/results`);
    });

    socket.on(EVENTS.ERROR, ({ message }: { message: string }) => {
      console.warn('[socket error]', message);
    });

    return () => {
      socketEmit.leaveRoom();
      socket.off(EVENTS.ROOM_STATE);
      socket.off(EVENTS.PLAYER_JOINED);
      socket.off(EVENTS.PLAYER_LEFT);
      socket.off(EVENTS.GAME_STARTED);
      socket.off(EVENTS.COUNTDOWN_START);
      socket.off(EVENTS.ROUND_ENDED);
      socket.off(EVENTS.REVIEW_CATEGORY);
      socket.off(EVENTS.GAME_FINISHED);
      socket.off(EVENTS.ERROR);
      disconnectSocket();
    };
  }, [code]);

  return <Slot />;
}
