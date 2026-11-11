/**
 * Live multiplayer test: Full game with checkmate
 * Tests checkmate → game-over modal flow on Railway server
 * Run from chess-app/client dir: node test_checkmate_live.js
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { io } = require('socket.io-client');

const SERVER = 'https://byonedek-server-production.up.railway.app';

function createSocket() {
  return io(SERVER, { 
    transports: ['websocket'],
    timeout: 15000,
    reconnection: false,
  });
}

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runTest() {
  console.log('=== LIVE CHECKMATE TEST ===');
  console.log(`Server: ${SERVER}\n`);

  const white = createSocket();
  const black = createSocket();
  
  let lobbyId, gameId;
  let whiteGameOver = null;
  let blackGameOver = null;

  // Listen for game-over events
  white.on('game-over', (data) => {
    whiteGameOver = data;
    console.log('[WHITE] game-over received:', JSON.stringify(data.result || { winner: data.winner, condition: data.condition }));
  });

  black.on('game-over', (data) => {
    blackGameOver = data;
    console.log('[BLACK] game-over received:', JSON.stringify(data.result || { winner: data.winner, condition: data.condition }));
  });

  // Also listen to move-made to check if result is in top level
  white.on('move-made', (data) => {
    if (data.result && data.result.winner) {
      console.log('[WHITE] move-made has result:', JSON.stringify(data.result));
    }
    if (data.gameStatus === 'completed') {
      console.log('[WHITE] move-made gameStatus=completed');
    }
  });

  black.on('move-made', (data) => {
    if (data.result && data.result.winner) {
      console.log('[BLACK] move-made has result:', JSON.stringify(data.result));
    }
    if (data.gameStatus === 'completed') {
      console.log('[BLACK] move-made gameStatus=completed');
    }
  });

  try {
    // Step 1: White creates lobby
    console.log('Step 1: Creating lobby...');
    await new Promise((resolve, reject) => {
      white.emit('create-lobby', {
        nickname: 'TestWhite',
        color: 'white',
        timeControl: { minutes: 5, increment: 0, isUnlimited: false },
      });
      white.once('lobby-created', (data) => {
        lobbyId = data.lobbyId;
        gameId = data.gameId;
        console.log(`  ✅ Lobby created: ${lobbyId}`);
        resolve();
      });
      setTimeout(() => reject(new Error('Timeout creating lobby')), 10000);
    });

    // Step 2: Black joins
    console.log('Step 2: Black joining...');
    await new Promise((resolve, reject) => {
      black.emit('join-lobby', { lobbyId, nickname: 'TestBlack' });
      black.once('lobby-joined', (data) => {
        console.log(`  ✅ Black joined as ${data.color}`);
        resolve();
      });
      setTimeout(() => reject(new Error('Timeout joining lobby')), 10000);
    });

    // Step 3: Wait for game-started
    console.log('Step 3: Waiting for game-started...');
    await new Promise((resolve, reject) => {
      white.once('game-started', (data) => {
        gameId = data.gameId || gameId;
        console.log(`  ✅ Game started! GameID: ${gameId}, Status: ${data.game?.gameStatus}`);
        resolve();
      });
      setTimeout(() => reject(new Error('Timeout waiting for game-started')), 10000);
    });

    await wait(500);

    // Step 4: Play Scholar's Mate (4 moves for white, 3 for black)
    console.log("Step 4: Playing Scholar's Mate...");
    
    const moves = [
      { player: white, color: 'white', move: { from: 'e2', to: 'e4' }, label: '1. e4' },
      { player: black, color: 'black', move: { from: 'e7', to: 'e5' }, label: '1... e5' },
      { player: white, color: 'white', move: { from: 'd1', to: 'h5' }, label: '2. Qh5' },
      { player: black, color: 'black', move: { from: 'b8', to: 'c6' }, label: '2... Nc6' },
      { player: white, color: 'white', move: { from: 'f1', to: 'c4' }, label: '3. Bc4' },
      { player: black, color: 'black', move: { from: 'g8', to: 'f6' }, label: '3... Nf6' },
    ];

    for (const m of moves) {
      await new Promise((resolve, reject) => {
        m.player.emit('make-move', { gameId, lobbyId, move: m.move });
        // Both players receive move-made
        const handler = () => resolve();
        white.once('move-made', handler);
        setTimeout(() => { white.off('move-made', handler); reject(new Error(`Timeout on ${m.label}`)); }, 8000);
      });
      console.log(`  ✅ ${m.label}`);
      await wait(300);
    }

    // Final move: Qxf7# (checkmate!)
    console.log('Step 5: Playing Qxf7# (checkmate)...');
    await new Promise((resolve, reject) => {
      white.emit('make-move', { gameId, lobbyId, move: { from: 'h5', to: 'f7' } });
      // Wait for game-over event
      const checkGameOver = () => {
        if (whiteGameOver && blackGameOver) resolve();
      };
      white.on('game-over', checkGameOver);
      black.on('game-over', checkGameOver);
      // Also resolve if move-made carries result
      white.once('move-made', (data) => {
        if (data.result?.winner || data.gameStatus === 'completed') {
          setTimeout(() => resolve(), 500); // give time for game-over to arrive
        }
      });
      setTimeout(() => resolve(), 5000); // fallback
    });

    console.log('\n=== RESULTS ===');
    console.log('White received game-over:', whiteGameOver ? JSON.stringify({ winner: whiteGameOver.result?.winner || whiteGameOver.winner, condition: whiteGameOver.result?.condition || whiteGameOver.condition }) : 'NOT RECEIVED');
    console.log('Black received game-over:', blackGameOver ? JSON.stringify({ winner: blackGameOver.result?.winner || blackGameOver.winner, condition: blackGameOver.result?.condition || blackGameOver.condition }) : 'NOT RECEIVED');

    const whiteOk = whiteGameOver && (whiteGameOver.result?.winner === 'white' || whiteGameOver.winner === 'white');
    const blackOk = blackGameOver && (blackGameOver.result?.winner === 'white' || blackGameOver.winner === 'white');

    console.log('\nWhite sees correct winner:', whiteOk ? '✅' : '❌');
    console.log('Black sees correct winner:', blackOk ? '✅' : '❌');

    if (whiteOk && blackOk) {
      console.log('\n🎉 CHECKMATE TEST PASSED! Both players receive game-over with correct winner.');
    } else {
      console.log('\n⚠️  CHECKMATE TEST: Some players did not receive expected game-over event.');
    }

  } catch (err) {
    console.error('\n❌ TEST ERROR:', err.message);
  } finally {
    white.disconnect();
    black.disconnect();
    process.exit(0);
  }
}

runTest();
