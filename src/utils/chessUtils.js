/**
 * chessUtils.js
 * Utility functions for the ChessMate chess application.
 */

// ---------------------------------------------------------------------------
// Piece value table (used for material calculations)
// ---------------------------------------------------------------------------
const PIECE_VALUE_MAP = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

// ---------------------------------------------------------------------------
// formatTime
// Formats a duration in milliseconds to a human-readable clock string.
//
// @param {number}  ms         — Duration in milliseconds
// @param {boolean} showTenths — When true, shows one decimal (tenths of a second)
//                               for sub-10-second times
// @returns {string} — e.g. "03:45" or "9.3"
// ---------------------------------------------------------------------------
export function formatTime(ms, showTenths = false) {
  if (ms < 0) ms = 0

  const totalSeconds = ms / 1000

  // Show tenths when time is under 10 seconds and caller opts in
  if (showTenths && totalSeconds < 10) {
    return totalSeconds.toFixed(1)
  }

  const totalSecondsInt = Math.ceil(totalSeconds)
  const minutes = Math.floor(totalSecondsInt / 60)
  const seconds = totalSecondsInt % 60

  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')

  return `${mm}:${ss}`
}

// ---------------------------------------------------------------------------
// getPieceSymbol
// Returns the Unicode chess piece character for a given piece descriptor.
//
// @param {Object|string} piece — Either a chess.js piece object { type, color }
//                                or a two-character string like 'wp', 'bQ', etc.
// @returns {string} — Unicode piece character, e.g. '♔'
// ---------------------------------------------------------------------------
const UNICODE_PIECES = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
}

export function getPieceSymbol(piece) {
  if (!piece) return ''

  let color, type

  if (typeof piece === 'string') {
    // Accept strings like 'wp', 'bQ', 'wR', etc.
    color = piece[0].toLowerCase()
    type  = piece[1].toUpperCase()
  } else {
    // chess.js piece object: { type: 'k', color: 'w' }
    color = piece.color.toLowerCase()
    type  = piece.type.toUpperCase()
  }

  const key = `${color}${type}`
  return UNICODE_PIECES[key] ?? ''
}

// ---------------------------------------------------------------------------
// getSquareColor
// Returns the board color of a square by its algebraic name.
//
// @param {string} square — Algebraic square name, e.g. 'e4', 'a1'
// @returns {'light'|'dark'}
// ---------------------------------------------------------------------------
export function getSquareColor(square) {
  if (!square || square.length < 2) return 'light'
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0) // 0-7
  const rank = parseInt(square[1], 10) - 1               // 0-7
  return (file + rank) % 2 === 0 ? 'dark' : 'light'
}

// ---------------------------------------------------------------------------
// squareToCoords
// Converts an algebraic square name to a {row, col} grid coordinate.
// Row 0 is the top of the board as rendered; col 0 is the left.
// When flipped (black at bottom), the board is rotated 180°.
//
// @param {string}  square  — e.g. 'e4'
// @param {boolean} flipped — true when the board is shown from Black's perspective
// @returns {{ row: number, col: number }}
// ---------------------------------------------------------------------------
export function squareToCoords(square, flipped = false) {
  if (!square || square.length < 2) return { row: 0, col: 0 }

  const file = square.charCodeAt(0) - 'a'.charCodeAt(0) // 0 (a) … 7 (h)
  const rank = parseInt(square[1], 10) - 1               // 0 (rank 1) … 7 (rank 8)

  if (flipped) {
    // Black's perspective: a8 is top-left
    return { row: rank, col: 7 - file }
  } else {
    // White's perspective: a1 is bottom-left → row 7, col 0
    return { row: 7 - rank, col: file }
  }
}

// ---------------------------------------------------------------------------
// coordsToSquare
// Converts a {row, col} grid coordinate back to an algebraic square name.
//
// @param {number}  row     — 0-indexed row (top of rendered board = 0)
// @param {number}  col     — 0-indexed column (left of rendered board = 0)
// @param {boolean} flipped — true when the board is shown from Black's perspective
// @returns {string} — algebraic square, e.g. 'e4'
// ---------------------------------------------------------------------------
export function coordsToSquare(row, col, flipped = false) {
  let file, rank

  if (flipped) {
    file = 7 - col
    rank = row
  } else {
    file = col
    rank = 7 - row
  }

  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null

  const fileLetter = String.fromCharCode('a'.charCodeAt(0) + file)
  const rankNumber = rank + 1
  return `${fileLetter}${rankNumber}`
}

// ---------------------------------------------------------------------------
// parseFenPieces
// Internal helper: extracts piece counts from the board part of a FEN string.
//
// @param {string} fen
// @returns {{ w: Object, b: Object }} — count maps keyed by piece type (lowercase)
// ---------------------------------------------------------------------------
function parseFenPieces(fen) {
  if (!fen) return { w: {}, b: {} }

  const boardPart = fen.split(' ')[0]
  const counts = { w: {}, b: {} }

  for (const ch of boardPart) {
    if (ch === '/' || /\d/.test(ch)) continue

    const color = ch === ch.toUpperCase() ? 'w' : 'b'
    const type  = ch.toLowerCase()

    if (!counts[color][type]) counts[color][type] = 0
    counts[color][type]++
  }

  return counts
}

// Starting material per side (excluding kings)
const STARTING_COUNTS = { p: 8, n: 2, b: 2, r: 2, q: 1 }

// ---------------------------------------------------------------------------
// getMaterialDifference
// Calculates the material point advantage for each side from a FEN string.
// A positive value means White is ahead; negative means Black is ahead.
//
// @param {string} fen — Full or board-only FEN string
// @returns {{ white: number, black: number, diff: number }}
//          diff > 0 → White ahead; diff < 0 → Black ahead
// ---------------------------------------------------------------------------
export function getMaterialDifference(fen) {
  const { w, b } = parseFenPieces(fen)

  let whiteMaterial = 0
  let blackMaterial = 0

  for (const type of ['p', 'n', 'b', 'r', 'q']) {
    whiteMaterial += (w[type] ?? 0) * PIECE_VALUE_MAP[type]
    blackMaterial += (b[type] ?? 0) * PIECE_VALUE_MAP[type]
  }

  return {
    white: whiteMaterial,
    black: blackMaterial,
    diff:  whiteMaterial - blackMaterial,
  }
}

// ---------------------------------------------------------------------------
// getCapturedPieces
// Returns the list of pieces that have been captured FROM the given color
// (i.e., pieces of that color that are no longer on the board compared
// to the starting position).
//
// @param {string} fen   — Current FEN string
// @param {'w'|'b'} color — Color whose lost pieces to report
// @returns {string[]} — Array of piece type characters (lowercase), e.g. ['p','p','n']
// ---------------------------------------------------------------------------
export function getCapturedPieces(fen, color) {
  const { w, b } = parseFenPieces(fen)
  const current  = color === 'w' ? w : b
  const captured = []

  for (const [type, startCount] of Object.entries(STARTING_COUNTS)) {
    const remaining = current[type] ?? 0
    const lost      = startCount - remaining

    for (let i = 0; i < lost; i++) {
      captured.push(type)
    }
  }

  // Sort by descending piece value for display (queens first, pawns last)
  captured.sort((a, b) => PIECE_VALUE_MAP[b] - PIECE_VALUE_MAP[a])

  return captured
}
