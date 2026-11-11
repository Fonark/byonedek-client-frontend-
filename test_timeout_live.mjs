/**
 * Live timeout test: Player clock runs out → game-over modal should show
 * Run from chess-app/client dir: node test_timeout_live.mjs
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
  console.log('=== LIVE TIMEOUT TEST (5-second game) ===');
  console.log(`Server: ${SERVER}\n`);

  const white = createSocket();
  const black = createSocket();
  
  let lobbyId, gameId;
  let whiteGameOver = null;
  let blackGameOver = null;

  white.on('game-over', (data) => {
    whiteGameOver = data;
    const r = data.result || { winner: data.winner, condition: data.condition };
    console.log(`[WHITE] 🔔 game-over! winner=${r.winner}, condition=${r.condition}`);
  });

  black.on('game-over', (data) => {
    blackGameOver = data;
    const r = data.result || { winner: data.winner, condition: data.condition };
    console.log(`[BLACK] 🔔 game-over! winner=${r.winner}, condition=${r.condition}`);
  });

  white.on('clock-updated', (data) => {
    // Uncomment to debug clocks:
    // console.log(`[CLOCK] white=${data.whiteRemainingTime}ms black=${data.blackRemainingTime}ms active=${data.activeColor}`);
  });

  try {
    // Create lobby with 5-second time control (0.08 minutes ~ 5 seconds)
    console.log('Step 1: Creating lobby (5-second time control)...');
    await new Promise((resolve, reject) => {
      white.emit('create-lobby', {
        nickname: 'TimeoutWhite',
        color: 'white',
        timeControl: { minutes: 0.1, increment: 0, isUnlimited: false }, // ~6 seconds
      });
      white.once('lobby-created', (data) => {
        lobbyId = data.lobbyId;
        gameId = data.gameId;
        console.log(`  ✅ Lobby: ${lobbyId}`);
        resolve();
      });
      setTimeout(() => reject(new Error('Timeout creating lobby')), 10000);
    });

    console.log('Step 2: Black joins...');
    await new Promise((resolve, reject) => {
      black.emit('join-lobby', { lobbyId, nickname: 'TimeoutBlack' });
      black.once('lobby-joined', () => {
        console.log('  ✅ Black joined');
        resolve();
      });
      setTimeout(() => reject(new Error('Timeout joining')), 10000);
    });

    await new Promise((resolve, reject) => {
      white.once('game-started', (data) => {
        gameId = data.gameId || gameId;
        const wTime = data.game?.whiteRemainingTime || data.whiteClock;
        console.log(`  ✅ Game started! White clock: ${wTime}ms`);
        resolve();
      });
      setTimeout(() => reject(new Error('Timeout game-started')), 10000);
    });

    // Make one move each so clocks start
    console.log('Step 3: Making 2 moves to activate clocks...');
    await new Promise((resolve, reject) => {
      white.emit('make-move', { gameId, lobbyId, move: { from: 'e2', to: 'e4' } });
      white.once('move-made', () => resolve());
      setTimeout(() => reject(new Error('Timeout move 1')), 8000);
    });
    console.log('  ✅ White: e4');
    
    await wait(300);
    
    await new Promise((resolve, reject) => {
      black.emit('make-move', { gameId, lobbyId, move: { from: 'e7', to: 'e5' } });
      white.once('move-made', () => resolve());
      setTimeout(() => reject(new Error('Timeout move 2')), 8000);
    });
    console.log('  ✅ Black: e5');

    // Now White must move but we wait for timeout
    console.log('Step 4: Waiting for White to timeout (~6 seconds)...');
    
    // Wait for game-over (server will fire timeout timer)
    await new Promise((resolve) => {
      const checkDone = () => {
        if (whiteGameOver && blackGameOver) resolve();
      };
      white.on('game-over', checkDone);
      black.on('game-over', checkDone);
      
      // Max wait 20 seconds
      setTimeout(resolve, 20000);
    });

    console.log('\n=== TIMEOUT TEST RESULTS ===');
    
    if (whiteGameOver) {
      const r = whiteGameOver.result || { winner: whiteGameOver.winner, condition: whiteGameOver.condition };
      console.log(`White game-over: winner=${r.winner}, condition=${r.condition}`);
      console.log(`  ✅ White received game-over: ${r.condition === 'timeout' && r.winner === 'black' ? 'CORRECT' : '❌ WRONG'}`);
    } else {
      console.log('  ❌ White did NOT receive game-over!');
    }
    
    if (blackGameOver) {
      const r = blackGameOver.result || { winner: blackGameOver.winner, condition: blackGameOver.condition };
      console.log(`Black game-over: winner=${r.winner}, condition=${r.condition}`);
      console.log(`  ✅ Black received game-over: ${r.condition === 'timeout' && r.winner === 'black' ? 'CORRECT' : '❌ WRONG'}`);
    } else {
      console.log('  ❌ Black did NOT receive game-over!');
    }

    const passed = whiteGameOver && blackGameOver &&
      (whiteGameOver.result?.winner === 'black' || whiteGameOver.winner === 'black') &&
      (blackGameOver.result?.winner === 'black' || blackGameOver.winner === 'black');

    console.log(passed ? '\n🎉 TIMEOUT TEST PASSED!' : '\n⚠️  TIMEOUT TEST: Check results above.');

  } catch (err) {
    console.error('\n❌ TEST ERROR:', err.message);
  } finally {
    white.disconnect();
    black.disconnect();
    process.exit(0);
  }
}

runTest();
