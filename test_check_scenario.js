import pkg from 'socket.io-client';
import { Chess } from 'chess.js';
const { io } = pkg;

const SERVER_URL = 'https://byonedek-server-production.up.railway.app';

async function testCheckScenario() {
  const socketWhite = io(SERVER_URL, { transports: ['websocket'] });
  const socketBlack = io(SERVER_URL, { transports: ['websocket'] });

  await new Promise(r => socketWhite.on('connect', r));
  await new Promise(r => socketBlack.on('connect', r));

  const lobbyData = await new Promise((resolve) => {
    socketWhite.emit('create-lobby', {
      nickname: 'WhitePlayer',
      color: 'white',
      timeControl: { minutes: 5, increment: 0, category: 'Blitz' },
    }, resolve);
  });

  await new Promise((resolve) => {
    socketBlack.emit('join-lobby', {
      lobbyId: lobbyData.lobbyId,
      nickname: 'BlackPlayer',
    }, resolve);
  });

  const [startWhite] = await Promise.all([
    new Promise(r => socketWhite.once('game-started', r)),
    new Promise(r => socketBlack.once('game-started', r)),
  ]);

  const gameId = startWhite.gameId;
  const lobbyId = lobbyData.lobbyId;

  // Moves to reach the position in the user screenshot:
  // 1. e4 Nc6
  // 2. Bc4 Nh6
  // 3. Qf3 Rb8
  // 4. Qxf7+ (White Queen takes f7, checking Black King!)
  const moves = [
    { socket: socketWhite, move: { from: 'e2', to: 'e4' }, desc: '1. e4' },
    { socket: socketBlack, move: { from: 'b8', to: 'c6' }, desc: '1... Nc6' },
    { socket: socketWhite, move: { from: 'f1', to: 'c4' }, desc: '2. Bc4' },
    { socket: socketBlack, move: { from: 'g8', to: 'h6' }, desc: '2... Nh6' },
    { socket: socketWhite, move: { from: 'd1', to: 'f3' }, desc: '3. Qf3' },
    { socket: socketBlack, move: { from: 'a8', to: 'b8' }, desc: '3... Rb8' },
    { socket: socketWhite, move: { from: 'f3', to: 'f7' }, desc: '4. Qxf7+ (CHECK!)' },
  ];

  for (const step of moves) {
    console.log(`Executing ${step.desc}...`);
    step.socket.emit('make-move', { gameId, lobbyId, move: step.move });
    const res = await new Promise(r => step.socket.once('move-made', r));
    console.log(`  FEN: ${res.fen}`);
  }

  // Now Black tries to move!
  // Can Black move a pawn? (e.g. d7d6 - ILLEGAL because Black is in check!)
  console.log('\nTesting illegal move while in check (d7d6)...');
  socketBlack.emit('make-move', { gameId, lobbyId, move: { from: 'd7', to: 'd6' } });
  const errorPromise = new Promise(r => socketBlack.once('error', r));
  const timeoutPromise = new Promise(r => setTimeout(() => r(null), 1000));
  const err = await Promise.race([errorPromise, timeoutPromise]);
  console.log('  Result of illegal move:', err ? `Rejected with: ${err.message}` : 'No error');

  // Can Black move the Knight to capture the Queen (h6f7 - LEGAL!)
  console.log('\nTesting legal move while in check (h6f7: Knight takes Queen!)...');
  socketBlack.emit('make-move', { gameId, lobbyId, move: { from: 'h6', to: 'f7' } });
  const moveMadePromise = new Promise(r => socketBlack.once('move-made', r));
  const timeout2 = new Promise(r => setTimeout(() => r(null), 2000));
  const legalRes = await Promise.race([moveMadePromise, timeout2]);
  if (legalRes) {
    console.log('  LEGAL MOVE SUCCEEDED! FEN:', legalRes.fen);
  } else {
    console.error('  LEGAL MOVE FAILED OR TIMED OUT!');
  }

  socketWhite.disconnect();
  socketBlack.disconnect();
  process.exit(0);
}

testCheckScenario().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
