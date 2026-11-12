import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import ChessSquare from './ChessSquare';
import ChessPiece from './ChessPiece';
import PromotionDialog from './PromotionDialog';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

// ── Arrow colors (cycle with Shift/Alt held) ────────────────────────────────
const ARROW_COLORS = {
  default: { stroke: '#F6A623', fill: '#F6A623', opacity: 0.85 }, // orange (Lichess default)
  alt:     { stroke: '#3BB44A', fill: '#3BB44A', opacity: 0.85 }, // green
  shift:   { stroke: '#4B8FC4', fill: '#4B8FC4', opacity: 0.85 }, // blue
  ctrl:    { stroke: '#E04040', fill: '#E04040', opacity: 0.85 }, // red
};

/**
 * Returns the color config for an arrow based on modifier keys held during draw.
 */
function getArrowColor(modifiers = {}) {
  if (modifiers.ctrl)  return ARROW_COLORS.ctrl;
  if (modifiers.shift) return ARROW_COLORS.shift;
  if (modifiers.alt)   return ARROW_COLORS.alt;
  return ARROW_COLORS.default;
}

/**
 * Converts a square name (e.g. "e4") to [fileIndex 0-7, rankIndex 0-7]
 * in a standard (white-at-bottom) orientation.
 */
function squareToCoords(square, isBoardFlipped) {
  const file = square.charCodeAt(0) - 97; // 'a'=0 … 'h'=7
  const rank = parseInt(square[1], 10) - 1; // '1'=0 … '8'=7

  const col = isBoardFlipped ? 7 - file : file;
  const row = isBoardFlipped ? rank : 7 - rank;

  return { col, row };
}

/**
 * Returns the center pixel position of a square (normalized 0-1 relative to board size).
 */
function squareCenter(square, isBoardFlipped) {
  const { col, row } = squareToCoords(square, isBoardFlipped);
  return {
    x: (col + 0.5) / 8,
    y: (row + 0.5) / 8,
  };
}

/**
 * Renders a single arrow between two squares on an SVG viewBox 0 0 8 8.
 */
function ArrowSVG({ from, to, color, isBoardFlipped }) {
  const f = squareCenter(from, isBoardFlipped);
  const t = squareCenter(to, isBoardFlipped);

  const isSameSquare = from === to;

  // Sizes (all in viewBox units where 1 unit = 1 square)
  const shaftWidth = 0.14;
  const headLength = 0.3;
  const headWidth  = 0.26;
  const circleRadius = 0.42; // Seukuran kotak (radius 0.42 unit dalam 1 unit per petak)

  if (isSameSquare) {
    // Render lingkaran penanda petak yang pas seukuran kotak bidak
    return (
      <circle
        cx={f.x * 8}
        cy={f.y * 8}
        r={circleRadius}
        fill="none"
        stroke={color.stroke}
        strokeWidth={0.07}
        opacity={color.opacity}
      />
    );
  }

  // Vector from center of from-square to center of to-square
  const dx = (t.x - f.x) * 8;
  const dy = (t.y - f.y) * 8;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;

  // Shorten arrow at target so it doesn't cover the target square center
  const tipX = t.x * 8 - ux * 0.08;
  const tipY = t.y * 8 - uy * 0.08;

  // Arrow base (shorten from source a bit so it doesn't cover the piece)
  const baseX = f.x * 8 + ux * 0.38;
  const baseY = f.y * 8 + uy * 0.38;

  // Head base
  const headBaseX = tipX - ux * headLength;
  const headBaseY = tipY - uy * headLength;

  // Perpendicular unit vector
  const px = -uy;
  const py = ux;

  // Shaft rectangle corners
  const s = shaftWidth / 2;
  const h = headWidth / 2;

  const points = [
    // Shaft left start
    `${baseX + px * s},${baseY + py * s}`,
    // Shaft left at head base
    `${headBaseX + px * s},${headBaseY + py * s}`,
    // Head left wing
    `${headBaseX + px * h},${headBaseY + py * h}`,
    // Tip
    `${tipX},${tipY}`,
    // Head right wing
    `${headBaseX - px * h},${headBaseY - py * h}`,
    // Shaft right at head base
    `${headBaseX - px * s},${headBaseY - py * s}`,
    // Shaft right start
    `${baseX - px * s},${baseY - py * s}`,
  ].join(' ');

  return (
    <polygon
      points={points}
      fill={color.fill}
      opacity={color.opacity}
      style={{ pointerEvents: 'none' }}
    />
  );
}

/**
 * ChessBoard renders the 8x8 interactive chessboard with:
 * - Fluid hold & drag-and-drop (Lichess/Chess.com style)
 * - Click-to-select and click-to-move
 * - Right-click drag to draw arrows / highlight squares (Lichess/Chess.com style)
 *   • No modifier  → Orange arrow
 *   • Shift held   → Blue arrow
 *   • Alt held     → Green arrow
 *   • Ctrl held    → Red arrow
 *   Right-click on the same square = circle highlight
 *   Left-click anywhere clears all arrows
 */
const ChessBoard = ({
  fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  playerColor = 'white',
  isBoardFlipped = false,
  lastMove = null,
  isInCheck = false,
  moveCount = 0,
  onMove,
  disabled = false,
}) => {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [hoverSquare, setHoverSquare] = useState(null);

  // localFen: state internal board untuk optimistic render.
  // Update LANGSUNG saat user gerak bidak tanpa nunggu server.
  const [localFen, setLocalFen] = useState(fen);
  const [localLastMove, setLocalLastMove] = useState(lastMove);

  // ── Smooth piece slide animation (Lichess style) ───────────────────────────
  // animatingMove: { from: 'e2', to: 'e4' } | null
  const [animatingMove, setAnimatingMove] = useState(null);
  const animTimerRef = useRef(null);

  const triggerPieceAnimation = useCallback((from, to) => {
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    setAnimatingMove({ from, to });
    animTimerRef.current = setTimeout(() => {
      setAnimatingMove(null);
    }, 220);
  }, []);

  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, []);

  // Sync localFen saat parent kirim fen baru (server confirm atau lawan gerak)
  useEffect(() => {
    setLocalFen(fen);
  }, [fen]);

  // Animate opponent moves when received from parent props (only on forward moves)
  const prevLastMoveRef = useRef(lastMove);
  const prevMoveCountRef = useRef(moveCount);
  useEffect(() => {
    if (lastMove && moveCount > prevMoveCountRef.current) {
      const isNewMove =
        !prevLastMoveRef.current ||
        prevLastMoveRef.current.from !== lastMove.from ||
        prevLastMoveRef.current.to !== lastMove.to;

      if (isNewMove) {
        const isLocalOptimistic =
          localLastMove &&
          localLastMove.from === lastMove.from &&
          localLastMove.to === lastMove.to;

        // Animate opponent move if it wasn't already animated locally
        if (!isLocalOptimistic) {
          triggerPieceAnimation(lastMove.from, lastMove.to);
        }
      }
    }
    prevLastMoveRef.current = lastMove;
    prevMoveCountRef.current = moveCount;
    setLocalLastMove(lastMove);
  }, [lastMove, localLastMove, moveCount, triggerPieceAnimation]);

  // ── Arrow state ────────────────────────────────────────────────────────────
  // arrows: Array<{ from, to, color }>
  const [arrows, setArrows] = useState([]);
  // arrowDraw: null | { fromSquare, currentSquare, modifiers }
  const [arrowDraw, setArrowDraw] = useState(null);
  const arrowDrawRef = useRef(null);

  const boardRef = useRef(null);
  const dragStateRef = useRef(null);
  const selectedSquareRef = useRef(null);
  const legalMovesRef = useRef([]);

  useEffect(() => {
    selectedSquareRef.current = selectedSquare;
  }, [selectedSquare]);

  useEffect(() => {
    legalMovesRef.current = legalMoves;
  }, [legalMoves]);

  // Parse board
  const chess = useMemo(() => {
    try { return new Chess(localFen); }
    catch { return new Chess(); }
  }, [localFen]);

  const isMyTurn = useMemo(() => {
    if (disabled || !playerColor) return false;
    return (chess.turn() === 'w' ? 'white' : 'black') === playerColor;
  }, [chess, playerColor, disabled]);

  const checkSquare = useMemo(() => {
    if (!isInCheck && !chess.inCheck()) return null;
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
  }, [chess, isInCheck]);

  const displayedFiles = useMemo(
    () => (isBoardFlipped ? [...FILES].reverse() : FILES),
    [isBoardFlipped]
  );
  const displayedRanks = useMemo(
    () => (isBoardFlipped ? [...RANKS].reverse() : RANKS),
    [isBoardFlipped]
  );

  // ── Move execution ─────────────────────────────────────────────────────────
  const executeMove = useCallback(
    (fromSquare, toSquare, isDrag = false) => {
      const movingPiece = chess.get(fromSquare);
      const isPromotion =
        movingPiece &&
        movingPiece.type === 'p' &&
        ((movingPiece.color === 'w' && toSquare[1] === '8') ||
          (movingPiece.color === 'b' && toSquare[1] === '1'));

      if (isPromotion) {
        setPendingPromotion({ from: fromSquare, to: toSquare });
        return;
      }

      // Trigger smooth glide animation for click-to-move (drag-and-drop moves instantly on release)
      if (!isDrag) {
        triggerPieceAnimation(fromSquare, toSquare);
      }

      // Optimistic move: langsung perbarui board lokal (0ms delay)
      try {
        const moveClone = new Chess(localFen);
        const res = moveClone.move({ from: fromSquare, to: toSquare });
        if (res) {
          setLocalFen(moveClone.fen());
          setLocalLastMove({ from: fromSquare, to: toSquare });
        }
      } catch {
        // Abaikan error parsing lokal
      }

      if (onMove) onMove({ from: fromSquare, to: toSquare });
      setSelectedSquare(null);
      setLegalMoves([]);
    },
    [chess, localFen, onMove, triggerPieceAnimation]
  );

  // ── LEFT Pointer Down: piece selection / move ──────────────────────────────
  const handlePointerDown = (e, square, pieceCode) => {
    if (e.button !== undefined && e.button !== 0) return;
    // Clear all arrows on any left-click
    setArrows([]);
    setArrowDraw(null);
    arrowDrawRef.current = null;

    if (disabled || !isMyTurn || pendingPromotion) return;

    const currentSelected = selectedSquareRef.current;
    const currentLegalMoves = legalMovesRef.current;

    if (currentSelected && currentLegalMoves.includes(square)) {
      executeMove(currentSelected, square, false);
      return;
    }

    const pieceOnSquare = chess.get(square);
    const isOwnPiece =
      pieceOnSquare &&
      ((playerColor === 'white' && pieceOnSquare.color === 'w') ||
        (playerColor === 'black' && pieceOnSquare.color === 'b'));

    if (isOwnPiece) {
      const moves = chess.moves({ square, verbose: true });
      const destinations = moves.map((m) => m.to);
      setSelectedSquare(square);
      setLegalMoves(destinations);

      const squareRect = e.currentTarget.getBoundingClientRect();
      const initialDrag = {
        from: square,
        piece: pieceCode,
        startX: e.clientX,
        startY: e.clientY,
        x: e.clientX,
        y: e.clientY,
        isDragging: false,
        size: squareRect.width,
      };
      dragStateRef.current = initialDrag;
      setDragState(initialDrag);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
      dragStateRef.current = null;
      setDragState(null);
    }
  };

  // ── RIGHT Pointer Down: start arrow draw ───────────────────────────────────
  const handleContextMenuDown = useCallback((e, square) => {
    e.preventDefault();
    const modifiers = {
      shift: e.shiftKey,
      alt: e.altKey,
      ctrl: e.ctrlKey || e.metaKey,
    };
    const draw = { fromSquare: square, currentSquare: square, modifiers };
    arrowDrawRef.current = draw;
    setArrowDraw(draw);
  }, []);

  // ── RIGHT Pointer Up / contextmenu: finish arrow ───────────────────────────
  const finalizeArrow = useCallback((toSquare) => {
    const draw = arrowDrawRef.current;
    if (!draw) return;

    const { fromSquare, modifiers } = draw;
    const color = getArrowColor(modifiers);

    arrowDrawRef.current = null;
    setArrowDraw(null);

    setArrows((prev) => {
      const key = `${fromSquare}-${toSquare}`;
      // Toggle: if same arrow already exists, remove it
      const idx = prev.findIndex((a) => `${a.from}-${a.to}` === key);
      if (idx !== -1) {
        return prev.filter((_, i) => i !== idx);
      }
      return [...prev, { from: fromSquare, to: toSquare, color }];
    });
  }, []);

  // ── Global pointer event listeners ────────────────────────────────────────
  useEffect(() => {
    // Helper: get square under a pointer position
    const getSquareAt = (clientX, clientY) => {
      const elem = document.elementFromPoint(clientX, clientY);
      return elem?.closest('[data-square]')?.getAttribute('data-square') || null;
    };

    const onPointerMove = (e) => {
      // LEFT drag — piece dragging
      const drag = dragStateRef.current;
      if (drag) {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        const dist = Math.hypot(dx, dy);
        const isDraggingNow = drag.isDragging || dist > 4;
        const updated = { ...drag, x: e.clientX, y: e.clientY, isDragging: isDraggingNow };
        dragStateRef.current = updated;
        setDragState(updated);
        if (isDraggingNow) {
          setHoverSquare(getSquareAt(e.clientX, e.clientY));
        }
      }

      // RIGHT drag — update arrowDraw current square
      const ad = arrowDrawRef.current;
      if (ad) {
        const sq = getSquareAt(e.clientX, e.clientY);
        if (sq && sq !== ad.currentSquare) {
          const updated = { ...ad, currentSquare: sq };
          arrowDrawRef.current = updated;
          setArrowDraw(updated);
        }
      }
    };

    const onPointerUp = (e) => {
      // LEFT pointer up — finish piece move
      if (e.button === 0) {
        const drag = dragStateRef.current;
        if (!drag) return;

        const wasDragging = drag.isDragging;
        const fromSquare = drag.from;
        const targetSquare = getSquareAt(e.clientX, e.clientY);

        dragStateRef.current = null;
        setDragState(null);
        setHoverSquare(null);

        if (wasDragging) {
          if (targetSquare && targetSquare !== fromSquare) {
            const currentMoves = chess.moves({ square: fromSquare, verbose: true });
            const isLegal = currentMoves.some((m) => m.to === targetSquare);
            if (isLegal) {
              executeMove(fromSquare, targetSquare, true);
              return;
            }
          }
          if (targetSquare !== fromSquare) {
            setSelectedSquare(null);
            setLegalMoves([]);
          }
        }
      }

      // RIGHT pointer up — finish arrow draw
      if (e.button === 2) {
        const sq = getSquareAt(e.clientX, e.clientY);
        if (sq) finalizeArrow(sq);
        else {
          arrowDrawRef.current = null;
          setArrowDraw(null);
        }
      }
    };

    // Prevent default context menu on the board
    const onContextMenu = (e) => {
      if (boardRef.current && boardRef.current.contains(e.target)) {
        e.preventDefault();
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('contextmenu', onContextMenu);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('contextmenu', onContextMenu);
    };
  }, [chess, executeMove, finalizeArrow]);

  // ── Promotion handlers ─────────────────────────────────────────────────────
  const handlePromotionSelect = (promotionPiece) => {
    if (pendingPromotion) {
      triggerPieceAnimation(pendingPromotion.from, pendingPromotion.to);
      try {
        const moveClone = new Chess(localFen);
        const res = moveClone.move({
          from: pendingPromotion.from,
          to: pendingPromotion.to,
          promotion: promotionPiece,
        });
        if (res) {
          setLocalFen(moveClone.fen());
          setLocalLastMove({ from: pendingPromotion.from, to: pendingPromotion.to });
        }
      } catch {
        // Abaikan
      }

      if (onMove) {
        onMove({ from: pendingPromotion.from, to: pendingPromotion.to, promotion: promotionPiece });
      }
    }
    setPendingPromotion(null);
    setSelectedSquare(null);
    setLegalMoves([]);
  };

  const handlePromotionClose = () => {
    setPendingPromotion(null);
    setSelectedSquare(null);
    setLegalMoves([]);
  };

  // ── Arrow highlight squares ────────────────────────────────────────────────
  // Squares that are endpoints of arrows get a colored tint on the square
  const arrowHighlightSquares = useMemo(() => {
    const map = {};
    arrows.forEach((a) => {
      if (!map[a.from]) map[a.from] = a.color;
      if (!map[a.to])   map[a.to]   = a.color;
    });
    return map;
  }, [arrows]);

  // Current in-progress arrow (while right-button held)
  const previewArrow = arrowDraw && arrowDraw.fromSquare !== arrowDraw.currentSquare
    ? { from: arrowDraw.fromSquare, to: arrowDraw.currentSquare, color: { ...getArrowColor(arrowDraw.modifiers), opacity: 0.6 } }
    : null;

  // Circle highlight for same-square right-click
  const previewCircle = arrowDraw && arrowDraw.fromSquare === arrowDraw.currentSquare
    ? { from: arrowDraw.fromSquare, to: arrowDraw.fromSquare, color: { ...getArrowColor(arrowDraw.modifiers), opacity: 0.6 } }
    : null;

  return (
    <div
      ref={boardRef}
      className="relative w-full max-w-[620px] aspect-square select-none touch-none shadow-2xl rounded-sm overflow-hidden border-2 border-[#3c3934]"
    >
      {/* 8x8 Chessboard Grid */}
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {displayedRanks.map((rank, rankIndex) =>
          displayedFiles.map((file, fileIndex) => {
            const square = `${file}${rank}`;
            const fileNum = FILES.indexOf(file);
            const rankNum = parseInt(rank, 10);
            const isLight = (fileNum + rankNum) % 2 !== 0;

            const pieceObj = chess.get(square);
            const pieceCode = pieceObj ? `${pieceObj.color}${pieceObj.type.toUpperCase()}` : null;

            const isSelected = selectedSquare === square;
            const isLegalMove = legalMoves.includes(square);
            const activeLastMove = localLastMove || lastMove;
            const isSquareLastMove = activeLastMove && (activeLastMove.from === square || activeLastMove.to === square);
            const isKingInCheck = checkSquare === square;
            const isHovered = hoverSquare === square;
            const isDraggingSource = dragState && dragState.isDragging && dragState.from === square;
            const arrowHighlight = arrowHighlightSquares[square] || null;

            const showRankLabel = fileIndex === 0;
            const showFileLabel = rankIndex === 7;

            return (
              <ChessSquare
                key={square}
                square={square}
                piece={pieceCode}
                isLight={isLight}
                isSelected={isSelected}
                isLegalMove={isLegalMove}
                isLastMove={isSquareLastMove}
                isInCheck={isKingInCheck}
                isHovered={isHovered}
                isDraggingSource={isDraggingSource}
                arrowHighlight={arrowHighlight}
                animationSource={animatingMove && animatingMove.to === square ? animatingMove.from : null}
                isBoardFlipped={isBoardFlipped}
                showRankLabel={showRankLabel}
                showFileLabel={showFileLabel}
                onPointerDown={handlePointerDown}
                onRightPointerDown={handleContextMenuDown}
              />
            );
          })
        )}
      </div>

      {/* ── SVG Arrow Overlay ──────────────────────────────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 8 8"
        xmlns="http://www.w3.org/2000/svg"
        style={{ zIndex: 20 }}
      >
        {/* Committed arrows */}
        {arrows.map((a, i) => (
          <ArrowSVG
            key={i}
            from={a.from}
            to={a.to}
            color={a.color}
            isBoardFlipped={isBoardFlipped}
          />
        ))}

        {/* Preview circle (same-square right-click drag) */}
        {previewCircle && (
          <ArrowSVG
            from={previewCircle.from}
            to={previewCircle.to}
            color={previewCircle.color}
            isBoardFlipped={isBoardFlipped}
          />
        )}

        {/* Preview arrow (right-click drag in progress) */}
        {previewArrow && (
          <ArrowSVG
            from={previewArrow.from}
            to={previewArrow.to}
            color={previewArrow.color}
            isBoardFlipped={isBoardFlipped}
          />
        )}
      </svg>

      {/* Floating Drag Piece */}
      {dragState && dragState.isDragging && (
        <div
          className="fixed pointer-events-none z-50 select-none touch-none"
          style={{
            left: 0,
            top: 0,
            width: dragState.size,
            height: dragState.size,
            transform: `translate3d(${dragState.x - dragState.size / 2}px, ${
              dragState.y - dragState.size / 2
            }px, 0) scale(1.12)`,
            filter: 'drop-shadow(0 12px 18px rgba(0, 0, 0, 0.45))',
            transition: 'none',
          }}
        >
          <ChessPiece piece={dragState.piece} size={dragState.size} />
        </div>
      )}

      {/* Pawn Promotion Dialog */}
      {pendingPromotion && (
        <PromotionDialog
          color={playerColor}
          onSelect={handlePromotionSelect}
          onClose={handlePromotionClose}
        />
      )}
    </div>
  );
};

export default ChessBoard;
