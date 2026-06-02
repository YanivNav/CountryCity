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
  ROOM_STATE:       'room:state',
  PLAYER_JOINED:    'player:joined',
  PLAYER_LEFT:      'player:left',
  GAME_STARTED:     'game:started',
  COUNTDOWN_START:  'countdown:start',
  ROUND_ENDED:      'round:ended',
  REVIEW_CATEGORY:  'review:category',
  GAME_FINISHED:    'game:finished',
  ERROR:            'error',
} as const;
