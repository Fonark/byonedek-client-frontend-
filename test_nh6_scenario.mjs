/**
 * Live test: Nh6 check scenario — Qf7+ should NOT end game
 * Tests that after Qf7+ with Nh6 on board, game continues (Nxf7 is legal)
 * Run: node test_nh6_scenario.mjs (from chess-app/client dir)
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { io } = require('socket.io-client');

const SERVER = 'https://byonedek-server-production.up.railway.app';
const sock = (id) => io(SERVER, { transports: ['websocket'], timeout: 15000, reconnection: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('=== LIVE TEST: Nh6 Check Scenario ===');
  console.log('Scenario: 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nh6 4.Qxf7+ Nxf7 (game continues)\n');

  const white = sock(); const black = sock();
  let lobbyId, gameId;
  let gameOverFired = false;
  let movesAfterCheck = 0;

  white.on('game-over', (d) => { gameOverFired = true; console.log('[!] game-over fired (should NOT happen):', d.result); });
  black.on('game-over', (d) => { gameOverFired = true; console.log('[!] game-over fired (should NOT happen):', d.result); });

  try {
    // Create lobby
    await new Promise((res, rej) => {
      white.emit('create-lobby', { nickname: 'W', color: 'white', timeControl: { isUnlimited: true } });
      white.once('lobby-created', d => { lobbyId = d.lobbyId; gameId = d.gameId; res(); });
      setTimeout(() => rej(new Error('timeout create')), 10000);
    });

    // Join
    await new Promise((res, rej) => {
      black.emit('join-lobby', { lobbyId, nickname: 'B' });
      black.once('lobby-joined', () => res());
      setTimeout(() => rej(new Error('timeout join')), 10000);
    });

    await new Promise((res, rej) => {
      white.once('game-started', d => { gameId = d.gameId || gameId; res(); });
      setTimeout(() => rej(new Error('timeout game-started')), 10000);
    });
    await wait(300);

    // Helper: make a move and wait for move-made
    const makeMove = async (player, move, label) => {
      await new Promise((res, rej) => {
        player.emit('make-move', { gameId, lobbyId, move });
        white.once('move-made', (data) => {
          if (data.result?.winner) console.log(`  [!] move-made carries result: ${JSON.stringify(data.result)}`);
          res(data);
        });
        setTimeout(() => rej(new Error(`timeout ${label}`)), 8000);
      });
      console.log(`  ✅ ${label}`);
      await wait(200);
    };

    // Play: 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nh6
    await makeMove(white, { from: 'e2', to: 'e4' }, '1. e4');
    await makeMove(black, { from: 'e7', to: 'e5' }, '1... e5');
    await makeMove(white, { from: 'd1', to: 'h5' }, '2. Qh5');
    await makeMove(black, { from: 'b8', to: 'c6' }, '2... Nc6');
    await makeMove(white, { from: 'f1', to: 'c4' }, '3. Bc4');
    await makeMove(black, { from: 'g8', to: 'h6' }, '3... Nh6'); // ← key move!

    console.log('\n  Making Qxf7+ (check but NOT checkmate)...');
    const moveMadeData = await new Promise((res, rej) => {
      white.emit('make-move', { gameId, lobbyId, move: { from: 'h5', to: 'f7' } });
      white.once('move-made', (d) => res(d));
      setTimeout(() => rej(new Error('timeout Qxf7')), 8000);
    });

    console.log('  move-made received:');
    console.log('    gameStatus:', moveMadeData.gameStatus || moveMadeData.game?.gameStatus);
    console.log('    result:', moveMadeData.result);

    await wait(500); // give time for any erroneous game-over event

    const gameEndedEarly = gameOverFired;

    // Now black plays Nxf7 (should work if game hasn't ended)
    if (!gameEndedEarly) {
      console.log('\n  Black plays Nxf7 (capturing the queen)...');
      let nxf7Success = false;
      try {
        await makeMove(black, { from: 'h6', to: 'f7' }, '4... Nxf7');
        nxf7Success = true;
        movesAfterCheck++;
      } catch(e) {
        console.log('  ❌ Nxf7 failed:', e.message);
      }

      await wait(300);

      // Continue game: 5.d4
      if (nxf7Success && !gameOverFired) {
        await makeMove(white, { from: 'd2', to: 'd4' }, '5. d4');
        movesAfterCheck++;
      }
    }

    await wait(300);

    console.log('\n=== RESULTS ===');
    console.log('game-over fired incorrectly:', gameEndedEarly ? '❌ YES (BUG!)' : '✅ NO (correct)');
    console.log('moves played after Qf7+ check:', movesAfterCheck, movesAfterCheck > 0 ? '✅' : '❌');

    if (!gameEndedEarly && movesAfterCheck > 0) {
      console.log('\n🎉 TEST PASSED: Qf7+ with Nh6 correctly treated as check (not checkmate). Game continued.');
    } else if (gameEndedEarly) {
      console.log('\n❌ TEST FAILED: Game ended incorrectly after Qf7+ (false checkmate)');
    } else {
      console.log('\n⚠️  Could not play Nxf7 after check. Possible issue.');
    }

  } catch(e) {
    console.error('ERROR:', e.message);
  } finally {
    white.disconnect(); black.disconnect();
    process.exit(0);
  }
}

run();
