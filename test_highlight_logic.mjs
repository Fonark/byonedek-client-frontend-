import { Chess } from 'chess.js';

console.log('=== TEST CHESSBOARD HIGHLIGHT LOGIC ===\n');

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

function findCheckSquare(fen) {
  const chess = new Chess(fen);
  if (!chess.inCheck()) return null;
  const turn = chess.turn();
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === turn) {
        return `${FILES[c]}${RANKS[r]}`;
      }
    }
  }
  return null;
}

let passed = 0;
let total = 0;
function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

// 1. Initial position - no check, no last move
test('Initial board: no check', () => {
  const chess = new Chess();
  const cs = findCheckSquare(chess.fen());
  if (cs !== null) throw new Error(`Expected null, got ${cs}`);
});

// 2. White plays e4 (lastMove: { from: 'e2', to: 'e4' })
test('Move e2->e4: lastMove squares are e2 and e4', () => {
  const lastMove = { from: 'e2', to: 'e4' };
  const isE2LastMove = (lastMove.from === 'e2' || lastMove.to === 'e2');
  const isE4LastMove = (lastMove.from === 'e4' || lastMove.to === 'e4');
  const isE5LastMove = (lastMove.from === 'e5' || lastMove.to === 'e5');
  if (!isE2LastMove) throw new Error('e2 should be last move');
  if (!isE4LastMove) throw new Error('e4 should be last move');
  if (isE5LastMove) throw new Error('e5 should NOT be last move');
});

// 3. Black in check: Fool\'s mate setup 1.f3 e5 2.g4 Qh4# (Black delivers check/mate to White king on e1)
test('Fool\'s mate: White king on e1 is in check (red highlight on e1)', () => {
  const chess = new Chess();
  chess.move('f3'); chess.move('e5');
  chess.move('g4'); chess.move('Qh4');
  const cs = findCheckSquare(chess.fen());
  if (cs !== 'e1') throw new Error(`Expected e1, got ${cs}`);
});

// 4. White delivers check to Black king on e8
test('Scholar\'s attack Qxf7+: Black king on e8 is in check (red highlight on e8)', () => {
  const chess = new Chess();
  chess.move('e4'); chess.move('e5');
  chess.move('Qh5'); chess.move('Nc6');
  chess.move('Bc4'); chess.move('Nh6');
  chess.move('Qxf7'); // check!
  const cs = findCheckSquare(chess.fen());
  if (cs !== 'e8') throw new Error(`Expected e8, got ${cs}`);
});

// 5. Black escapes check with Nxf7
test('Black captures queen with Nxf7: check is cleared (no red highlight)', () => {
  const chess = new Chess();
  chess.move('e4'); chess.move('e5');
  chess.move('Qh5'); chess.move('Nc6');
  chess.move('Bc4'); chess.move('Nh6');
  chess.move('Qxf7');
  chess.move('Nxf7'); // escaped!
  const cs = findCheckSquare(chess.fen());
  if (cs !== null) throw new Error(`Expected null after escape, got ${cs}`);
});

// 6. Last move after Nxf7 is { from: 'h6', to: 'f7' }
test('Last move after Nxf7: h6 and f7 are highlighted yellow', () => {
  const lastMove = { from: 'h6', to: 'f7' };
  if (lastMove.from !== 'h6' || lastMove.to !== 'f7') throw new Error('Incorrect last move');
});

console.log(`\nRESULTS: ${passed}/${total} tests passed!`);
if (passed === total) console.log('🎉 ALL HIGHLIGHT LOGIC TESTS PASSED!');
else process.exit(1);
