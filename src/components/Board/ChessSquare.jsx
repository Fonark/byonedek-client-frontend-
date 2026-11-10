import React from 'react';
import ChessPiece from './ChessPiece';

// Board light/dark square colours matching Lichess / app palette
const LIGHT_BG = '#F0D9B5';
const DARK_BG  = '#B58863';

// Highlight colours
const HIGHLIGHT = {
  selected:   'rgba(20, 85, 30, 0.5)',
  lastMove:   'rgba(205, 210, 106, 0.45)',
  check:      'rgba(220, 20, 20, 0.6)',
  hoverLegal: 'rgba(129, 182, 76, 0.55)',
};

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
  showRankLabel = false,
  showFileLabel = false,
  onPointerDown,
  onRightPointerDown,      // (e, square) => void  — called on right mouse button down
}) => {
  const baseBg = isLight ? LIGHT_BG : DARK_BG;
  const labelColour = isLight ? DARK_BG : LIGHT_BG;

  // Layered highlights (applied bottom → top via CSS gradient trick)
  const overlays = [];
  if (isInCheck) overlays.push(HIGHLIGHT.check);
  if (isSelected) overlays.push(HIGHLIGHT.selected);
  if (isLastMove) overlays.push(HIGHLIGHT.lastMove);
  if (isHovered && isLegalMove) overlays.push(HIGHLIGHT.hoverLegal);

  const background = overlays.length
    ? [...overlays, baseBg].join(', ')
    : baseBg;

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
        background,
        cursor: piece ? 'grab' : isLegalMove ? 'pointer' : 'default',
      }}
    >
      {/* Arrow highlight tint (semi-transparent color overlay from right-click arrows) */}
      {arrowHighlight && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: arrowHighlight.fill,
            opacity: 0.3,
            zIndex: 1,
          }}
        />
      )}

      {/* Coordinate labels */}
      {showRankLabel && (
        <span
          className="absolute top-0.5 left-1 text-[10px] md:text-xs font-bold leading-none select-none pointer-events-none"
          style={{ color: labelColour, zIndex: 2 }}
        >
          {square[1]}
        </span>
      )}
      {showFileLabel && (
        <span
          className="absolute bottom-0.5 right-1 text-[10px] md:text-xs font-bold leading-none select-none pointer-events-none"
          style={{ color: labelColour, zIndex: 2 }}
        >
          {square[0]}
        </span>
      )}

      {/* Legal-move indicator */}
      {legalMoveIndicator}

      {/* Chess piece */}
      {piece && (
        <div
          className={`w-[88%] h-[88%] flex items-center justify-center pointer-events-none transition-opacity ${
            isDraggingSource ? 'opacity-20' : 'opacity-100'
          }`}
          style={{ zIndex: 3 }}
        >
          <ChessPiece piece={piece} size="100%" />
        </div>
      )}
    </div>
  );
};

export default ChessSquare;
