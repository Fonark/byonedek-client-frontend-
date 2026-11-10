import React from "react";

/**
 * Maps piece type letters to their Unicode chess symbols.
 */
const PIECE_SYMBOLS = {
  p: "♟", // pawn   (black symbol used for both for size consistency)
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
  k: "♚",
};

// Order pieces by value for display
const PIECE_ORDER = ["q", "r", "b", "n", "p"];

/**
 * PlayerPanel component
 * Props:
 *   nickname          - player's display name
 *   color             - "white" | "black"
 *   isCurrentPlayer   - boolean, true when this is the logged-in user
 *   capturedPieces    - array of piece type strings e.g. ["p","p","n","b"]
 *   materialAdvantage - number (positive = this player is ahead)
 */
const PlayerPanel = ({
  nickname = "Player",
  color = "white",
  isCurrentPlayer = false,
  capturedPieces = [],
  materialAdvantage = 0,
}) => {
  // Sort captured pieces by value for display
  const sortedCaptures = [...capturedPieces].sort(
    (a, b) => PIECE_ORDER.indexOf(a.toLowerCase()) - PIECE_ORDER.indexOf(b.toLowerCase())
  );

  // Group captures by type for compact rendering
  const groupedCaptures = sortedCaptures.reduce((acc, piece) => {
    const key = piece.toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#262421] min-w-0">
      {/* King icon representing player color */}
      <div
        className={`
          flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xl
          border-2 transition-colors duration-200
          ${color === "white"
            ? "bg-white border-gray-300 text-[#161512]"
            : "bg-[#1a1a1a] border-gray-600 text-white"
          }
        `}
        aria-label={`${color} player`}
      >
        ♚
      </div>

      {/* Center: name + captured pieces */}
      <div className="flex flex-col min-w-0 flex-1">
        {/* Name row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-semibold text-sm truncate leading-tight">
            {nickname}
          </span>

          {isCurrentPlayer && (
            <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#161512] bg-[#81B64C] px-1.5 py-0.5 rounded">
              You
            </span>
          )}
        </div>

        {/* Captured pieces row */}
        {sortedCaptures.length > 0 && (
          <div className="flex items-center gap-0.5 mt-0.5 flex-wrap">
            {PIECE_ORDER.map((type) => {
              const count = groupedCaptures[type];
              if (!count) return null;
              return Array.from({ length: count }).map((_, i) => (
                <span
                  key={`${type}-${i}`}
                  className="text-[#A8A8A8] text-xs leading-none"
                  aria-label={type}
                >
                  {PIECE_SYMBOLS[type]}
                </span>
              ));
            })}
          </div>
        )}
      </div>

      {/* Material advantage badge */}
      {materialAdvantage > 0 && (
        <div
          className="flex-shrink-0 text-[#81B64C] font-bold text-sm tabular-nums"
          aria-label={`Material advantage: +${materialAdvantage}`}
        >
          +{materialAdvantage}
        </div>
      )}
    </div>
  );
};

export default PlayerPanel;
