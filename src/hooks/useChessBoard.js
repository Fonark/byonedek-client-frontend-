import { useState, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';

/**
 * Custom hook for chessboard interaction logic.
 *
 * @param {string}   fen           - Current FEN string
 * @param {string}   playerColor   - 'white' | 'black' | null
 * @param {boolean}  isBoardFlipped - Whether the board is flipped
 * @param {Function} onMove        - Callback called with { from, to, promotion? }
 */
export function useChessBoard(fen, playerColor, isBoardFlipped, onMove) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoveSquares, setLegalMoveSquares] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPiece, setDragPiece] = useState(null); // { square, piece }

  // Reset selection whenever fen changes (e.g. after a move is applied)
  useEffect(() => {
    setSelectedSquare(null);
    setLegalMoveSquares([]);
  }, [fen]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Determine if the piece on a square belongs to the local player.
   */
  const isPieceOwnedByPlayer = useCallback(
    (chess, square) => {
      if (!playerColor) return false;
      const piece = chess.get(square);
      if (!piece) return false;
      const colorChar = playerColor === 'white' ? 'w' : 'b';
      return piece.color === colorChar;
    },
    [playerColor]
  );

  /**
   * Compute the squares that are legal move destinations from `square`.
   */
  const computeLegalMoves = useCallback((chess, square) => {
    const moves = chess.moves({ square, verbose: true });
    return moves.map((m) => m.to);
  }, []);

  /**
   * Returns true if it is currently the local player's turn.
   */
  const isPlayerTurn = useCallback(
    (chess) => {
      if (!playerColor) return false;
      const colorChar = playerColor === 'white' ? 'w' : 'b';
      return chess.turn() === colorChar;
    },
    [playerColor]
  );

  // ---------------------------------------------------------------------------
  // handleSquareClick
  // ---------------------------------------------------------------------------
  const handleSquareClick = useCallback(
    (square) => {
      let chess;
      try {
        chess = new Chess(fen);
      } catch {
        return;
      }

      if (!isPlayerTurn(chess)) return;

      // Case 1: No square currently selected
      if (!selectedSquare) {
        if (isPieceOwnedByPlayer(chess, square)) {
          const legal = computeLegalMoves(chess, square);
          setSelectedSquare(square);
          setLegalMoveSquares(legal);
        }
        return;
      }

      // Case 2: Clicking the already-selected square → deselect
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoveSquares([]);
        return;
      }

      // Case 3: Clicking another own piece → switch selection
      if (isPieceOwnedByPlayer(chess, square)) {
        const legal = computeLegalMoves(chess, square);
        setSelectedSquare(square);
        setLegalMoveSquares(legal);
        return;
      }

      // Case 4: Clicking a legal destination → make the move
      if (legalMoveSquares.includes(square)) {
        // Detect pawn promotion
        const movingPiece = chess.get(selectedSquare);
        const isPromotion =
          movingPiece &&
          movingPiece.type === 'p' &&
          ((movingPiece.color === 'w' && square[1] === '8') ||
            (movingPiece.color === 'b' && square[1] === '1'));

        onMove({
          from: selectedSquare,
          to: square,
          ...(isPromotion ? { promotion: 'q' } : {}),
        });

        setSelectedSquare(null);
        setLegalMoveSquares([]);
        return;
      }

      // Case 5: Clicking an illegal square → deselect
      setSelectedSquare(null);
      setLegalMoveSquares([]);
    },
    [fen, selectedSquare, legalMoveSquares, isPlayerTurn, isPieceOwnedByPlayer, computeLegalMoves, onMove]
  );

  // ---------------------------------------------------------------------------
  // Drag and drop
  // ---------------------------------------------------------------------------
  const handleDragStart = useCallback(
    (square, piece) => {
      let chess;
      try {
        chess = new Chess(fen);
      } catch {
        return;
      }

      if (!isPlayerTurn(chess)) return;
      if (!isPieceOwnedByPlayer(chess, square)) return;

      const legal = computeLegalMoves(chess, square);
      setDragPiece({ square, piece });
      setSelectedSquare(square);
      setLegalMoveSquares(legal);
      setIsDragging(true);
    },
    [fen, isPlayerTurn, isPieceOwnedByPlayer, computeLegalMoves]
  );

  const handleDrop = useCallback(
    (targetSquare) => {
      setIsDragging(false);

      if (!dragPiece) {
        setDragPiece(null);
        return;
      }

      const { square: fromSquare } = dragPiece;
      setDragPiece(null);

      if (!legalMoveSquares.includes(targetSquare)) {
        setSelectedSquare(null);
        setLegalMoveSquares([]);
        return;
      }

      let chess;
      try {
        chess = new Chess(fen);
      } catch {
        return;
      }

      const movingPiece = chess.get(fromSquare);
      const isPromotion =
        movingPiece &&
        movingPiece.type === 'p' &&
        ((movingPiece.color === 'w' && targetSquare[1] === '8') ||
          (movingPiece.color === 'b' && targetSquare[1] === '1'));

      onMove({
        from: fromSquare,
        to: targetSquare,
        ...(isPromotion ? { promotion: 'q' } : {}),
      });

      setSelectedSquare(null);
      setLegalMoveSquares([]);
    },
    [dragPiece, legalMoveSquares, fen, onMove]
  );

  // ---------------------------------------------------------------------------
  // Handle drag cancel (e.g. drop outside board)
  // ---------------------------------------------------------------------------
  const handleDragCancel = useCallback(() => {
    setIsDragging(false);
    setDragPiece(null);
    setSelectedSquare(null);
    setLegalMoveSquares([]);
  }, []);

  return {
    selectedSquare,
    legalMoveSquares,
    isDragging,
    dragPiece,
    handleSquareClick,
    handleDragStart,
    handleDrop,
    handleDragCancel,
  };
}

export default useChessBoard;
