import React from 'react';
import ChessPiece from './ChessPiece';

/**
 * PromotionDialog allows player to select which piece to promote their pawn to:
 * Queen, Rook, Bishop, or Knight.
 */
const PromotionDialog = ({ color = 'white', onSelect, onClose }) => {
  const isWhite = color === 'white';
  const prefix = isWhite ? 'w' : 'b';

  const pieces = [
    { type: 'q', name: 'Queen', code: `${prefix}Q` },
    { type: 'r', name: 'Rook', code: `${prefix}R` },
    { type: 'b', name: 'Bishop', code: `${prefix}B` },
    { type: 'n', name: 'Knight', code: `${prefix}N` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#302E2B] border border-[#403E3A] rounded-xl p-5 shadow-2xl max-w-sm w-full mx-4 text-center">
        <h3 className="text-lg font-bold text-white mb-2">Promote Pawn</h3>
        <p className="text-xs text-[#A8A8A8] mb-4">Choose a piece to promote your pawn:</p>

        <div className="grid grid-cols-4 gap-3 mb-4">
          {pieces.map((p) => (
            <button
              key={p.type}
              onClick={() => onSelect(p.type)}
              className="flex flex-col items-center justify-center p-3 rounded-lg bg-[#262421] hover:bg-[#81B64C]/20 hover:border-[#81B64C] border border-[#403E3A] transition-all duration-150 group"
              title={p.name}
            >
              <div className="w-14 h-14 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ChessPiece piece={p.code} size={52} />
              </div>
              <span className="text-xs text-[#A8A8A8] mt-1 group-hover:text-white font-medium">
                {p.name}
              </span>
            </button>
          ))}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-[#A8A8A8] hover:text-white underline transition-colors"
          >
            Cancel move
          </button>
        )}
      </div>
    </div>
  );
};

export default PromotionDialog;
