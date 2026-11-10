export const TIME_CONTROLS = [
  // Bullet
  { id: 'bullet_1_0', category: 'bullet', name: '1 min', minutes: 1, increment: 0, label: '1+0' },
  { id: 'bullet_1_1', category: 'bullet', name: '1 min + 1s', minutes: 1, increment: 1, label: '1+1' },
  { id: 'bullet_1_2', category: 'bullet', name: '1 min + 2s', minutes: 1, increment: 2, label: '1+2' },

  // Blitz
  { id: 'blitz_3_0', category: 'blitz', name: '3 min', minutes: 3, increment: 0, label: '3+0' },
  { id: 'blitz_3_2', category: 'blitz', name: '3 min + 2s', minutes: 3, increment: 2, label: '3+2' },
  { id: 'blitz_3_3', category: 'blitz', name: '3 min + 3s', minutes: 3, increment: 3, label: '3+3' },
  { id: 'blitz_5_0', category: 'blitz', name: '5 min', minutes: 5, increment: 0, label: '5+0' },
  { id: 'blitz_5_3', category: 'blitz', name: '5 min + 3s', minutes: 5, increment: 3, label: '5+3' },

  // Rapid
  { id: 'rapid_10_0', category: 'rapid', name: '10 min', minutes: 10, increment: 0, label: '10+0' },
  { id: 'rapid_10_5', category: 'rapid', name: '10 min + 5s', minutes: 10, increment: 5, label: '10+5' },

  // Unlimited
  { id: 'unlimited', category: 'unlimited', name: 'Unlimited', minutes: 0, increment: 0, label: '∞', isUnlimited: true },
];

export const PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export const SOCKET_EVENTS = {
  // Client -> Server
  CREATE_LOBBY: 'create-lobby',
  JOIN_LOBBY: 'join-lobby',
  MAKE_MOVE: 'make-move',
  RESIGN: 'resign',
  OFFER_DRAW: 'offer-draw',
  ACCEPT_DRAW: 'accept-draw',
  DECLINE_DRAW: 'decline-draw',
  REQUEST_REMATCH: 'request-rematch',

  // Server -> Client
  LOBBY_CREATED: 'lobby-created',
  LOBBY_JOINED: 'lobby-joined',
  LOBBY_UPDATED: 'lobby-updated',
  GAME_STARTED: 'game-started',
  MOVE_MADE: 'move-made',
  CLOCK_UPDATED: 'clock-updated',
  GAME_OVER: 'game-over',
  DRAW_OFFERED: 'draw-offered',
  DRAW_DECLINED: 'draw-declined',
  REMATCH_REQUESTED: 'rematch-requested',
  REMATCH_STARTED: 'rematch-started',
  PLAYER_DISCONNECTED: 'player-disconnected',
  PLAYER_RECONNECTED: 'player-reconnected',
  RECONNECTED: 'reconnected',
  ERROR: 'error',
};

export const GAME_STATUS = {
  IDLE: 'idle',
  WAITING: 'waiting',
  PLAYING: 'playing',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
};

export const COLOR = {
  WHITE: 'white',
  BLACK: 'black',
  RANDOM: 'random',
};
