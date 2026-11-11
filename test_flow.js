import { io } from 'socket.io-client';

const SERVER_URL = 'https://byonedek-server-production.up.railway.app';

console.log('Connecting to', SERVER_URL);

async function run() {
  const socketWhite = io(SERVER_URL, { transports: ['websocket'] });
  const socketBlack = io(SERVER_URL, { transports: ['websocket'] });

  await new Promise(r => socketWhite.on('connect', r));
  console.log('White socket connected:', socketWhite.id);
  await new Promise(r => socketBlack.on('connect', r));
  console.log('Black socket connected:', socketBlack.id);

  // White creates lobby
  const lobbyData = await new Promise((resolve) => {
    socketWhite.emit('create-lobby', {
      nickname: 'WhitePlayer',
      color: 'white',
      timeControl: { minutes: 5, increment: 0, category: 'Blitz' },
    }, resolve);
  });
  console.log('Lobby created:', lobbyData.lobbyId);

  // Black joins lobby
  const joinData = await new Promise((resolve) => {
    socketBlack.emit('join-lobby', {
      lobbyId: lobbyData.lobbyId,
      nickname: 'BlackPlayer',
    }, resolve);
  });
  console.log('Black joined:', joinData);

  // Listen for game-started
  const [startWhite, startBlack] = await Promise.all([
    new Promise(r => socketWhite.once('game-started', r)),
    new Promise(r => socketBlack.once('game-started', r)),
  ]);
  console.log('Game started received by both.');
  console.log('Start data gameStatus:', startWhite.gameStatus);

  // White makes move 1: e2e4
  console.log('\n--- White moves e2e4 ---');
  socketWhite.emit('make-move', {
    gameId: startWhite.gameId,
    lobbyId: lobbyData.lobbyId,
    move: { from: 'e2', to: 'e4' },
  });

  const [move1White, move1Black] = await Promise.all([
    new Promise(r => socketWhite.once('move-made', r)),
    new Promise(r => socketBlack.once('move-made', r)),
  ]);
  console.log('Move 1 received by Black:');
  console.log('  FEN:', move1Black.fen);
  console.log('  activeColor:', move1Black.activeColor);
  console.log('  game.gameStatus:', move1Black.game?.gameStatus);
  console.log('  status.isGameOver:', move1Black.status?.isGameOver);

  // Now Black makes move 1: e7e5
  console.log('\n--- Black moves e7e5 ---');
  socketBlack.emit('make-move', {
    gameId: startWhite.gameId,
    lobbyId: lobbyData.lobbyId,
    move: { from: 'e7', to: 'e5' },
  });

  const [move2White, move2Black] = await Promise.all([
    new Promise(r => socketWhite.once('move-made', r)),
    new Promise(r => socketBlack.once('move-made', r)),
  ]);
  console.log('Move 2 received by White:');
  console.log('  FEN:', move2White.fen);
  console.log('  activeColor:', move2White.activeColor);

  console.log('\nSUCCESS! Both White and Black made moves successfully over Railway server!');
  socketWhite.disconnect();
  socketBlack.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
