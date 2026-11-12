import React from 'react';
import ChessPiece from './ChessPiece';

// Board light/dark square colours matching Lichess / app palette
const LIGHT_BG = '#F0D9B5';
const DARK_BG  = '#B58863';

function squareToCoords(sq, isBoardFlipped) {
  const file = sq.charCodeAt(0) - 97; // 'a'=0 … 'h'=7
  const rank = parseInt(sq[1], 10) - 1; // '1'=0 … '8'=7
  const col = isBoardFlipped ? 7 - file : file;
  const row = isBoardFlipped ? rank : 7 - rank;
  return { col, row };
}

const ChessSquare = ({
  square,
  piece,
  isLight,
  isSelected = false,
  isLegalMove = false,
  isLastMove = false,
  isInCheck = false,
  isHovered = false,
  isDraggingSource = false,
  arrowHighlight = null,   // { stroke, fill, opacity } | null — for right-click arrow tint
  animationSource = null,  // string e.g. "e2" when animating from a square
  isBoardFlipped = false,
  showRankLabel = false,
  showFileLabel = false,
  onPointerDown,
  onRightPointerDown,      // (e, square) => void  — called on right mouse button down
}) => {
  const baseBg = isLight ? LIGHT_BG : DARK_BG;
  const labelColour = isLight ? DARK_BG : LIGHT_BG;

  // Smooth piece slide transition when moving by click or opponent move (Lichess style)
  const slideStyle = animationSource ? (() => {
    const coordsFrom = squareToCoords(animationSource, isBoardFlipped);
    const coordsTo = squareToCoords(square, isBoardFlipped);
    const deltaX = (coordsFrom.col - coordsTo.col) * 100;
    const deltaY = (coordsFrom.row - coordsTo.row) * 100;
    return {
      '--slide-from-x': `${deltaX}%`,
      '--slide-from-y': `${deltaY}%`,
    };
  })() : null;

  // Legal-move indicator
  const legalMoveIndicator = isLegalMove ? (
    piece ? (
      /* capture ring */
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          margin: 'auto',
          width: '84%',
          height: '84%',
          border: '5px solid rgba(0, 0, 0, 0.22)',
          borderRadius: '50%',
          zIndex: 6,
        }}
      />
    ) : (
      /* empty square dot */
      <div
        className="pointer-events-none rounded-full"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '28%',
          height: '28%',
          background: 'rgba(0, 0, 0, 0.22)',
          zIndex: 6,
        }}
      />
    )
  ) : null;

  return (
    <div
      data-square={square}
      onPointerDown={(e) => {
        if (e.button === 2) {
          // Right button — start arrow draw
          e.preventDefault();
          if (onRightPointerDown) onRightPointerDown(e, square);
        } else {
          // Left button — piece move
          if (onPointerDown) onPointerDown(e, square, piece);
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
      className="relative flex items-center justify-center w-full h-full aspect-square select-none touch-none"
      style={{
        backgroundColor: baseBg,
        cursor: piece ? 'grab' : isLegalMove ? 'pointer' : 'default',
      }}
    >
      {/* 1. Last move highlight (kuning seperti di Lichess / Chess.com) */}
      {isLastMove && (
        <div
          className="absolute inset-0 pointer-events-none transition-colors duration-150"
          style={{
            backgroundColor: 'rgba(247, 247, 105, 0.55)', // Warm visible yellow
            zIndex: 1,
          }}
        />
      )}

      {/* 2. Selected square highlight (hijau saat bidak dipilih) */}
      {isSelected && (
        <div
          className="absolute inset-0 pointer-events-none transition-colors duration-150"
          style={{
            backgroundColor: 'rgba(20, 85, 30, 0.45)',
            zIndex: 2,
          }}
        />
      )}

      {/* 3. Hovered legal move highlight */}
      {isHovered && isLegalMove && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: 'rgba(129, 182, 76, 0.55)',
            zIndex: 3,
          }}
        />
      )}

      {/* 4. King in check highlight (merah menyala pada petak raja yang kena skak seperti di Lichess / Chess.com) */}
      {isInCheck && (
        <div
          className="absolute inset-0 pointer-events-none animate-pulse"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255, 0, 0, 0.95) 0%, rgba(231, 0, 0, 0.75) 45%, rgba(169, 0, 0, 0.35) 75%, transparent 100%), rgba(220, 20, 20, 0.6)',
            boxShadow: 'inset 0 0 14px rgba(255, 0, 0, 0.85)',
            zIndex: 4,
          }}
        />
      )}

      {/* 5. Arrow highlight tint (semi-transparent color overlay from right-click arrows) */}
      {arrowHighlight && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: arrowHighlight.fill,
            opacity: 0.3,
            zIndex: 5,
          }}
        />
      )}

      {/* 6. Legal-move indicator */}
      {legalMoveIndicator}

      {/* 7. Coordinate labels */}
      {showRankLabel && (
        <span
          className="absolute top-0.5 left-1 text-[10px] md:text-xs font-bold leading-none select-none pointer-events-none"
          style={{ color: labelColour, zIndex: 7 }}
        >
          {square[1]}
        </span>
      )}
      {showFileLabel && (
        <span
          className="absolute bottom-0.5 right-1 text-[10px] md:text-xs font-bold leading-none select-none pointer-events-none"
          style={{ color: labelColour, zIndex: 7 }}
        >
          {square[0]}
        </span>
      )}

      {/* 8. Chess piece */}
      {piece && (
        <div
          className={`w-[88%] h-[88%] flex items-center justify-center pointer-events-none transition-opacity ${
            slideStyle ? 'piece-slide' : ''
          } ${
            isDraggingSource ? 'opacity-20' : 'opacity-100'
          }`}
          style={{
            zIndex: slideStyle ? 15 : 8,
            ...slideStyle,
          }}
        >
          <ChessPiece piece={piece} size="100%" />
        </div>
      )}
    </div>
  );
};

export default ChessSquare;
