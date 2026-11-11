import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Chess } from 'chess.js';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';
import { useClock } from '../hooks/useClock';
import { useSound } from '../hooks/useSound';
import ChessBoard from '../components/Board/ChessBoard';
import ChessClock from '../components/Clock/ChessClock';
import PlayerPanel from '../components/Game/PlayerPanel';
import GameSidebar from '../components/Game/GameSidebar';
import GameOverModal from '../components/Game/GameOverModal';
import WaitingRoom from '../components/Lobby/WaitingRoom';
import ConnectionStatus from '../components/UI/ConnectionStatus';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Toast from '../components/UI/Toast';
import { getMaterialDifference, getCapturedPieces } from '../utils/chessUtils';

const GamePage = () => {
  const { lobbyId } = useParams();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const {
    gameId,
    playerColor,
    playerNickname,
    opponentNickname,
    reconnectToken,
    gameStatus,
    fen,
    moveHistory,
    whiteClock,
    blackClock,
    activeColor,
    lastMove,
    isInCheck,
    gameResult,
    drawOffer,
    rematchRequest,
    isBoardFlipped,
    opponentConnected,
    lastServerUpdate,
    flipBoard,
    resetGame,
    lobbyId: contextLobbyId,
    dispatch,
  } = useGame();

  // If opening a different lobby than what's currently in context, reset previous game
  useEffect(() => {
    if (contextLobbyId && contextLobbyId !== lobbyId) {
      resetGame();
    }
  }, [lobbyId, contextLobbyId, resetGame]);

  const handleReturnHome = useCallback(() => {
    resetGame();
    navigate('/');
  }, [resetGame, navigate]);

  const { playMove, playCapture, playCheck, playGameStart, playGameOver } = useSound();

  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('info');
  const [hasJoined, setHasJoined] = useState(false);

  // If new guest opening invite link without session, prompt for nickname
  const [showJoinModal, setShowJoinModal] = useState(() => {
    const storedLobby = sessionStorage.getItem('chess_current_lobby_id');
    const storedNick = sessionStorage.getItem('chess_nickname');
    return Boolean(lobbyId && (storedLobby !== lobbyId || !storedNick));
  });
  const [guestNickname, setGuestNickname] = useState('');

  const isGameActive = gameStatus === 'playing' || gameStatus === 'active';

  const handleTimeoutClaim = useCallback((losingColor) => {
    if (socket && isGameActive) {
      socket.emit('claim-timeout', { gameId, lobbyId, losingColor });
    }
  }, [socket, isGameActive, gameId, lobbyId]);

  // Chess clock calculations
  const {
    displayWhiteTime,
    displayBlackTime,
    displayWhiteMs,
    displayBlackMs,
    isWhiteActive,
    isBlackActive,
    isWhiteLow,
    isBlackLow,
  } = useClock(whiteClock, blackClock, activeColor, isGameActive ? 'playing' : gameStatus, lastServerUpdate, handleTimeoutClaim);

  // Material & captured pieces
  const whiteCaptured = useMemo(() => getCapturedPieces(fen, 'w'), [fen]);
  const blackCaptured = useMemo(() => getCapturedPieces(fen, 'b'), [fen]);
  const materialAdvantage = useMemo(() => {
    try {
      return getMaterialDifference(fen)?.diff ?? 0;
    } catch {
      return 0;
    }
  }, [fen]);

  const handleGuestJoin = (e) => {
    e.preventDefault();
    const finalNick = guestNickname.trim() || 'Guest';
    sessionStorage.setItem('chess_nickname', finalNick);
    sessionStorage.setItem('chess_current_lobby_id', lobbyId);

    if (socket && isConnected) {
      socket.emit('join-lobby', {
        lobbyId,
        nickname: finalNick,
      });
      setHasJoined(true);
    }
    setShowJoinModal(false);
  };

  const showToast = useCallback((msg, type = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Join or reconnect to lobby on mount
  useEffect(() => {
    if (!socket || !isConnected || hasJoined || showJoinModal) return;

    // Only pass reconnectToken if this browser previously joined THIS specific lobby
    const storedLobby = sessionStorage.getItem('chess_current_lobby_id');
    const token = storedLobby === lobbyId
      ? (reconnectToken || sessionStorage.getItem('chess_reconnect_token'))
      : null;

    const storedNick = sessionStorage.getItem('chess_nickname') || 'Player';

    socket.emit('join-lobby', {
      lobbyId,
      nickname: storedNick,
      reconnectToken: token,
    });

    sessionStorage.setItem('chess_current_lobby_id', lobbyId);
    setHasJoined(true);
  }, [socket, isConnected, lobbyId, reconnectToken, hasJoined, showJoinModal]);

  // Sound triggers on moves/events
  useEffect(() => {
    if (!lastMove) return;
    if (isInCheck) {
      playCheck();
    } else {
      playMove();
    }
  }, [lastMove, isInCheck, playCheck, playMove]);

  useEffect(() => {
    if (gameStatus === 'playing') {
      playGameStart();
    }
  }, [gameStatus, playGameStart]);

  useEffect(() => {
    if (gameResult) {
      playGameOver();
    }
  }, [gameResult, playGameOver]);

  // Make move handler — OPTIMISTIC UI
  // Bidak langsung pindah di layar, baru kirim ke server
  const handleMove = useCallback(
    (moveData) => {
      if (!socket || !isGameActive) return;

      // 1. Hitung FEN baru secara lokal (optimistic)
      try {
        const chess = new Chess(fen);
        const result = chess.move({
          from: moveData.from,
          to: moveData.to,
          promotion: moveData.promotion || 'q',
        });
        if (result) {
          const isCheckmate = chess.isCheckmate();
          const isStalemate = chess.isStalemate();
          let localResult = undefined;
          if (isCheckmate) {
            const winner = chess.turn() === 'w' ? 'black' : 'white';
            localResult = { winner, condition: 'checkmate' };
          } else if (isStalemate) {
            localResult = { winner: 'draw', condition: 'stalemate' };
          }

          // Update board SEKARANG tanpa nunggu server
          dispatch({
            type: 'APPLY_MOVE',
            payload: {
              fen: chess.fen(),
              move: { from: result.from, to: result.to, san: result.san, promotion: result.promotion },
              moveHistory: undefined, // akan diisi server
              whiteClock: undefined,
              blackClock: undefined,
              activeColor: chess.turn(),
              result: localResult,
            },
          });
        }
      } catch {
        // Kalau gagal hitung lokal, tetap kirim ke server saja
      }

      // 2. Kirim ke server (server akan konfirmasi / broadcast ke lawan)
      socket.emit('make-move', {
        gameId,
        lobbyId,
        move: moveData,
      });
    },
    [socket, gameId, lobbyId, isGameActive, fen, dispatch]
  );

  // Resign handler
  const handleResign = useCallback(() => {
    if (!socket || !isGameActive) return;
    socket.emit('resign', { gameId, lobbyId });
  }, [socket, gameId, lobbyId, isGameActive]);

  // Offer draw handler
  const handleOfferDraw = useCallback(() => {
    if (!socket || !isGameActive) return;
    socket.emit('offer-draw', { gameId, lobbyId });
    showToast('Draw offer sent to opponent', 'info');
  }, [socket, gameId, lobbyId, isGameActive, showToast]);

  // Accept draw handler
  const handleAcceptDraw = useCallback(() => {
    if (!socket) return;
    socket.emit('accept-draw', { gameId, lobbyId });
  }, [socket, gameId, lobbyId]);

  // Decline draw handler
  const handleDeclineDraw = useCallback(() => {
    if (!socket) return;
    socket.emit('decline-draw', { gameId, lobbyId });
    showToast('Draw offer declined', 'info');
  }, [socket, gameId, lobbyId, showToast]);

  // Rematch request handler
  const handleRematch = useCallback(() => {
    if (!socket) return;
    socket.emit('request-rematch', { gameId, lobbyId });
    showToast('Rematch requested', 'info');
  }, [socket, gameId, lobbyId, showToast]);

  const inviteUrl = useMemo(() => {
    return `${window.location.origin}/game/${lobbyId}`;
  }, [lobbyId]);

  // Opponent & self attributes
  const isWhite = playerColor === 'white';
  const opponentColor = isWhite ? 'black' : 'white';

  const myTime = isWhite ? displayWhiteTime : displayBlackTime;
  const opponentTime = isWhite ? displayBlackTime : displayWhiteTime;
  const isMyActive = isWhite ? isWhiteActive : isBlackActive;
  const isOpponentActive = isWhite ? isBlackActive : isWhiteActive;
  const isMyLow = isWhite ? isWhiteLow : isBlackLow;
  const isOpponentLow = isWhite ? isBlackLow : isWhiteLow;

  const myCaptured = isWhite ? whiteCaptured : blackCaptured;
  const opponentCaptured = isWhite ? blackCaptured : whiteCaptured;
  const myAdvantage = isWhite ? materialAdvantage : -materialAdvantage;
  const opponentAdvantage = -myAdvantage;

  // Guest Join Modal Prompt (only for guests who don't have a color assigned yet)
  if (showJoinModal && !playerColor) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
        <div className="relative w-full max-w-md rounded-2xl border border-[#403E3A] p-7 shadow-2xl bg-[#302E2B] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#262421] border border-[#403E3A] flex items-center justify-center text-3xl shadow-lg">
            ♟️
          </div>
          <h2 className="text-2xl font-black text-white mb-1.5 tracking-tight">Join Chess Match</h2>
          <p className="text-xs text-[#A8A8A8] mb-6">
            You've been invited to play chess in room <strong className="text-white font-mono bg-[#262421] px-2 py-0.5 rounded border border-[#403E3A]">{lobbyId}</strong>
          </p>

          <form onSubmit={handleGuestJoin} className="space-y-4">
            <div className="text-left">
              <label className="block text-xs font-semibold text-[#A8A8A8] mb-1.5 uppercase tracking-wider">
                Your Nickname
              </label>
              <input
                type="text"
                required
                autoFocus
                maxLength={20}
                value={guestNickname}
                onChange={(e) => setGuestNickname(e.target.value)}
                placeholder="e.g. Magnus, Gary, Ariya..."
                className="w-full px-4 py-3 rounded-xl bg-[#262421] border border-[#403E3A] text-white placeholder-[#706E6A] focus:outline-none focus:border-[#81B64C] focus:ring-1 focus:ring-[#81B64C] text-sm font-medium transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-5 rounded-xl bg-[#81B64C] hover:bg-[#81B64C]/90 text-black font-black text-sm shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>Join Match & Play</span>
              <span>→</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Waiting State
  if (gameStatus === 'waiting' || gameStatus === 'idle') {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
        <WaitingRoom
          lobbyId={lobbyId}
          playerColor={playerColor || 'white'}
          timeControl="Standard"
          inviteUrl={inviteUrl}
          onCancel={() => navigate('/')}
        />
        {toastMessage && (
          <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />
        )}
      </div>
    );
  }

  // Draw offer status for sidebar
  const drawOfferStatus = drawOffer
    ? drawOffer === playerColor
      ? 'sent'
      : 'received'
    : null;

  // Rematch status for sidebar
  const rematchStatus = rematchRequest
    ? rematchRequest === playerColor
      ? 'sent'
      : 'received'
    : null;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col justify-between p-2 md:p-6 max-w-7xl mx-auto">
      {/* Top Connection Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#302E2B]/60 mb-3">
        <ConnectionStatus
          isConnected={isConnected}
          opponentConnected={opponentConnected}
        />
        <div className="text-xs text-[#A8A8A8] flex items-center gap-2">
          <span>Lobby: <strong className="text-white font-mono">{lobbyId}</strong></span>
        </div>
      </div>

      {/* Main Game Arena */}
      <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start justify-center flex-1">
        {/* Left / Center: Board & Clocks */}
        <div className="flex flex-col items-center w-full max-w-[620px]">
          {/* Opponent Section (Top) */}
          <div className="w-full flex items-center justify-between gap-3 mb-2">
            <PlayerPanel
              nickname={opponentNickname || 'Opponent'}
              color={opponentColor}
              isCurrentPlayer={false}
              capturedPieces={opponentCaptured}
              materialAdvantage={opponentAdvantage}
            />
            <div className="w-40 shrink-0">
              <ChessClock
                timeMs={isWhite ? displayBlackMs : displayWhiteMs}
                isActive={isOpponentActive}
                color={opponentColor}
                playerName={opponentNickname || 'Opponent'}
                isLow={isOpponentLow}
              />
            </div>
          </div>

          {/* Chess Board */}
          <ChessBoard
            fen={fen}
            playerColor={playerColor}
            isBoardFlipped={isBoardFlipped}
            lastMove={lastMove}
            isInCheck={isInCheck}
            onMove={handleMove}
            disabled={!isGameActive}
          />

          {/* Player Section (Bottom) */}
          <div className="w-full flex items-center justify-between gap-3 mt-2">
            <PlayerPanel
              nickname={playerNickname || 'You'}
              color={playerColor || 'white'}
              isCurrentPlayer={true}
              capturedPieces={myCaptured}
              materialAdvantage={myAdvantage}
            />
            <div className="w-40 shrink-0">
              <ChessClock
                timeMs={isWhite ? displayWhiteMs : displayBlackMs}
                isActive={isMyActive}
                color={playerColor || 'white'}
                playerName={playerNickname || 'You'}
                isLow={isMyLow}
              />
            </div>
          </div>
        </div>

        {/* Right: Sidebar / Controls */}
        <div className="w-full lg:w-96 flex flex-col h-full max-h-[680px]">
          <GameSidebar
            lobbyId={lobbyId}
            gameId={gameId}
            moveHistory={moveHistory}
            gameStatus={gameStatus === 'playing' ? 'playing' : 'over'}
            timeControl="Live"
            onResign={handleResign}
            onOfferDraw={handleOfferDraw}
            onFlipBoard={flipBoard}
            drawOffer={drawOfferStatus}
            playerColor={playerColor}
            onAcceptDraw={handleAcceptDraw}
            onDeclineDraw={handleDeclineDraw}
            onRematch={handleRematch}
            rematchRequest={rematchStatus}
            onAcceptRematch={handleRematch}
          />
        </div>
      </div>

      {/* Game Over Modal */}
      {gameResult && (gameResult.winner || gameResult.condition) && (
        <GameOverModal
          result={gameResult}
          playerColor={playerColor}
          onRematch={handleRematch}
          onReturnHome={handleReturnHome}
        />
      )}

      {/* Global Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
};

export default GamePage;
