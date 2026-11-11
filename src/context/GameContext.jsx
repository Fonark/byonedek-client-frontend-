import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  useRef,
} from 'react';
import { Chess } from 'chess.js';
import { useSocket } from './SocketContext.jsx';

const GameContext = createContext(null);

const RECONNECT_TOKEN_KEY = 'chess_reconnect_token';

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------
const initialState = {
  lobbyId: null,
  gameId: null,
  playerColor: null,       // 'white' | 'black' | null
  playerNickname: null,
  opponentNickname: null,
  reconnectToken: sessionStorage.getItem(RECONNECT_TOKEN_KEY) || null,
  gameStatus: 'idle',      // 'idle' | 'waiting' | 'playing' | 'completed'
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  moveHistory: [],
  whiteClock: 0,
  blackClock: 0,
  activeColor: 'w',
  selectedSquare: null,
  legalMoves: [],
  lastMove: null,          // { from, to }
  isInCheck: false,
  gameResult: null,        // { winner, condition }
  drawOffer: null,         // null | 'white' | 'black'
  rematchRequest: null,    // null | 'white' | 'black'
  boardFlipped: false,
  isBoardFlipped: false,
  opponentConnected: true,
  lastServerUpdate: null,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_LOBBY':
    case 'SET_LOBBY_INFO': {
      const { lobbyId, gameId, playerColor, color, playerNickname, nickname, reconnectToken, status } = action.payload || {};
      const resolvedColor = playerColor || color;
      const resolvedNickname = playerNickname || nickname;
      if (reconnectToken) {
        sessionStorage.setItem(RECONNECT_TOKEN_KEY, reconnectToken);
      }
      return {
        ...state,
        lobbyId: lobbyId ?? state.lobbyId,
        gameId: gameId ?? state.gameId,
        playerColor: resolvedColor ?? state.playerColor,
        playerNickname: resolvedNickname ?? state.playerNickname,
        reconnectToken: reconnectToken ?? state.reconnectToken,
        gameStatus: status ?? state.gameStatus,
        isBoardFlipped: (resolvedColor ?? state.playerColor) === 'black',
      };
    }

    case 'SET_PLAYER_NICKNAME':
      return { ...state, playerNickname: action.payload };

    case 'SET_OPPONENT_NICKNAME':
      return { ...state, opponentNickname: action.payload };

    case 'SET_GAME_STARTED': {
      const {
        fen,
        whiteClock,
        blackClock,
        activeColor,
        whitePlayer,
        blackPlayer,
        whiteNickname,
        blackNickname,
      } = action.payload;

      let chess;
      try {
        chess = new Chess(fen);
      } catch {
        chess = new Chess();
      }

      const myColor = state.playerColor;
      const whiteNick = whiteNickname || whitePlayer?.nickname;
      const blackNick = blackNickname || blackPlayer?.nickname;

      let myNick = state.playerNickname;
      let oppNick = state.opponentNickname;

      if (myColor === 'white') {
        if (whiteNick) myNick = whiteNick;
        if (blackNick) oppNick = blackNick;
      } else if (myColor === 'black') {
        if (blackNick) myNick = blackNick;
        if (whiteNick) oppNick = whiteNick;
      }

      return {
        ...state,
        gameStatus: 'playing',
        playerNickname: myNick,
        opponentNickname: oppNick,
        gameResult: null,
        drawOffer: null,
        rematchRequest: null,
        fen,
        activeColor: activeColor ?? chess.turn(),
        whiteClock: whiteClock ?? state.whiteClock,
        blackClock: blackClock ?? state.blackClock,
        moveHistory: [],
        lastMove: null,
        isInCheck: chess.inCheck(),
        lastServerUpdate: Date.now(),
      };
    }

    case 'APPLY_MOVE': {
      const { fen, move, moveHistory, whiteClock, blackClock, activeColor, result, gameStatus } = action.payload;
      const chess = new Chess(fen);
      const isCheckmate = chess.isCheckmate();
      const isStalemate = chess.isStalemate();
      const isDraw = chess.isDraw();

      let gameResult = state.gameResult;
      let nextGameStatus = gameStatus || state.gameStatus;

      if (result && result.winner) {
        gameResult = result;
        nextGameStatus = 'completed';
      } else if (isCheckmate) {
        const winner = chess.turn() === 'w' ? 'black' : 'white';
        gameResult = { winner, condition: 'checkmate' };
        nextGameStatus = 'completed';
      } else if (isStalemate) {
        gameResult = { winner: 'draw', condition: 'stalemate' };
        nextGameStatus = 'completed';
      } else if (isDraw) {
        gameResult = { winner: 'draw', condition: 'draw' };
        nextGameStatus = 'completed';
      }

      return {
        ...state,
        fen,
        moveHistory: moveHistory ?? [...state.moveHistory, move],
        lastMove: move ? { from: move.from, to: move.to } : state.lastMove,
        activeColor: activeColor ?? chess.turn(),
        whiteClock: whiteClock ?? state.whiteClock,
        blackClock: blackClock ?? state.blackClock,
        isInCheck: chess.inCheck(),
        selectedSquare: null,
        legalMoves: [],
        gameResult,
        gameStatus: nextGameStatus,
        lastServerUpdate: Date.now(),
      };
    }

    case 'UPDATE_CLOCK':
      return {
        ...state,
        whiteClock: action.payload.whiteClock ?? state.whiteClock,
        blackClock: action.payload.blackClock ?? state.blackClock,
        activeColor: action.payload.activeColor ?? state.activeColor,
        lastServerUpdate: Date.now(),
      };

    case 'SELECT_SQUARE':
      return {
        ...state,
        selectedSquare: action.payload.square,
        legalMoves: action.payload.legalMoves,
      };

    case 'CLEAR_SELECTION':
      return { ...state, selectedSquare: null, legalMoves: [] };

    case 'FLIP_BOARD':
      return { ...state, isBoardFlipped: !state.isBoardFlipped };

    case 'SET_GAME_OVER':
      return {
        ...state,
        gameStatus: 'completed',
        gameResult: action.payload,
        selectedSquare: null,
        legalMoves: [],
      };

    case 'SET_DRAW_OFFER':
      return { ...state, drawOffer: action.payload };

    case 'SET_REMATCH_REQUEST':
      return { ...state, rematchRequest: action.payload };

    case 'SET_OPPONENT_CONNECTED':
      return { ...state, opponentConnected: action.payload };

    case 'RESTORE_STATE': {
      const payload = action.payload || {};
      const gameObj = payload.game || {};
      const lobbyObj = payload.lobby || {};
      const fen = payload.fen || gameObj.fen || state.fen;
      let chess;
      try {
        chess = new Chess(fen);
      } catch {
        chess = new Chess();
      }
      const playerColor = payload.playerColor || payload.color || state.playerColor;
      const rawLobbyStatus = lobbyObj.status || payload.status;
      const rawGameStatus = gameObj.gameStatus || payload.gameStatus;

      // Determine effective game status:
      // - If lobby is 'waiting' or 'abandoned', the game is not active — show waiting screen
      // - If game is 'active' or lobby is 'playing'/'ready', show the game
      // - If game is 'completed' or lobby is 'completed', show completed state
      let gameStatus;
      if (rawGameStatus === 'completed' || rawLobbyStatus === 'completed') {
        gameStatus = 'completed';
      } else if (rawLobbyStatus === 'waiting' || rawLobbyStatus === 'abandoned') {
        gameStatus = 'waiting';
      } else if (rawGameStatus === 'active' || rawLobbyStatus === 'playing') {
        gameStatus = 'playing';
      } else if (rawLobbyStatus === 'ready') {
        gameStatus = 'waiting';
      } else {
        gameStatus = state.gameStatus;
      }

      if (payload.reconnectToken) {
        sessionStorage.setItem(RECONNECT_TOKEN_KEY, payload.reconnectToken);
      }

      // Restore game result if the game is completed
      const rawResult = gameObj.result || payload.result || payload.gameResult;
      const validResult = (rawResult && (rawResult.winner || rawResult.condition) && gameStatus === 'completed')
        ? rawResult
        : null;

      // Nicknames
      const whiteNick = payload.whitePlayer?.nickname || lobbyObj.whitePlayer?.nickname;
      const blackNick = payload.blackPlayer?.nickname || lobbyObj.blackPlayer?.nickname;
      let myNick = payload.playerNickname || state.playerNickname;
      let oppNick = state.opponentNickname;
      if (playerColor === 'white') {
        if (whiteNick) myNick = whiteNick;
        if (blackNick) oppNick = blackNick;
      } else if (playerColor === 'black') {
        if (blackNick) myNick = blackNick;
        if (whiteNick) oppNick = whiteNick;
      }

      return {
        ...state,
        lobbyId: payload.lobbyId || state.lobbyId,
        gameId: payload.gameId || state.gameId,
        playerColor,
        playerNickname: myNick,
        opponentNickname: oppNick,
        gameStatus,
        gameResult: validResult,
        fen,
        moveHistory: gameObj.moveHistory || payload.moveHistory || state.moveHistory,
        whiteClock: gameObj.whiteRemainingTime ?? payload.whiteClock ?? state.whiteClock,
        blackClock: gameObj.blackRemainingTime ?? payload.blackClock ?? state.blackClock,
        activeColor: gameObj.activeColor || payload.activeColor || chess.turn(),
        isInCheck: chess.inCheck(),
        isBoardFlipped: playerColor === 'black',
        lastServerUpdate: Date.now(),
      };
    }

    case 'RESET_GAME': {
      sessionStorage.removeItem(RECONNECT_TOKEN_KEY);
      return {
        ...initialState,
        playerNickname: state.playerNickname, // keep nickname across resets
        reconnectToken: null,
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { socket } = useSocket();
  const chessRef = useRef(new Chess());

  // Keep chessRef in sync with fen
  useEffect(() => {
    try {
      chessRef.current.load(state.fen);
    } catch {
      // invalid fen – ignore
    }
  }, [state.fen]);

  // ---------------------------------------------------------------------------
  // Socket event listeners
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    const onLobbyCreated = (data) => {
      const lobbyData = data.lobby || data;
      dispatch({
        type: 'SET_LOBBY_INFO',
        payload: {
          lobbyId: data.lobbyId || lobbyData.lobbyId,
          gameId: data.gameId || lobbyData.gameId,
          playerColor: data.color || data.playerColor,
          playerNickname: data.nickname || data.playerNickname,
          reconnectToken: data.reconnectToken,
          status: 'waiting',
        },
      });
    };

    const onLobbyJoined = (data) => {
      const lobbyData = data.lobby || data;
      const myColor = data.color || data.playerColor;
      dispatch({
        type: 'SET_LOBBY_INFO',
        payload: {
          lobbyId: data.lobbyId || lobbyData.lobbyId,
          gameId: data.gameId || lobbyData.gameId,
          playerColor: myColor,
          playerNickname: data.nickname || data.playerNickname,
          reconnectToken: data.reconnectToken,
          status: lobbyData.status || data.status || 'waiting',
        },
      });
      const oppNick = data.opponentNickname || (myColor === 'white' ? lobbyData.blackPlayer?.nickname : lobbyData.whitePlayer?.nickname);
      if (oppNick) {
        dispatch({ type: 'SET_OPPONENT_NICKNAME', payload: oppNick });
      }
    };

    const onLobbyUpdated = (data) => {
      const lobbyData = data.lobby || data;
      if (data.opponentNickname !== undefined) {
        dispatch({ type: 'SET_OPPONENT_NICKNAME', payload: data.opponentNickname });
      }
      if (lobbyData.status) {
        dispatch({
          type: 'SET_LOBBY_INFO',
          payload: {
            lobbyId: lobbyData.lobbyId,
            status: lobbyData.status,
            gameId: lobbyData.gameId,
          },
        });
      }
    };

    const onGameStarted = (data) => {
      const gameObj = data.game || {};
      const lobbyObj = data.lobby || {};
      const whiteNick = data.whiteNickname || lobbyObj.whitePlayer?.nickname || data.whitePlayer?.nickname;
      const blackNick = data.blackNickname || lobbyObj.blackPlayer?.nickname || data.blackPlayer?.nickname;

      const fen = data.fen || gameObj.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const whiteClock = data.whiteClock ?? data.whiteRemainingTime ?? gameObj.whiteRemainingTime ?? 0;
      const blackClock = data.blackClock ?? data.blackRemainingTime ?? gameObj.blackRemainingTime ?? 0;
      const activeColor = data.activeColor || gameObj.activeColor || 'w';

      dispatch({
        type: 'SET_GAME_STARTED',
        payload: {
          fen,
          whiteClock,
          blackClock,
          activeColor,
          whiteNickname: whiteNick,
          blackNickname: blackNick,
          whitePlayer: lobbyObj.whitePlayer || data.whitePlayer,
          blackPlayer: lobbyObj.blackPlayer || data.blackPlayer,
        },
      });
    };

    const onMoveMade = (data) => {
      const gameObj = data.game || {};
      const fen = data.fen || gameObj.fen;
      const res = data.result || gameObj.result;
      dispatch({
        type: 'APPLY_MOVE',
        payload: {
          fen,
          move: data.move,
          moveHistory: data.moveHistory || gameObj.moveHistory,
          whiteClock: data.whiteClock ?? data.whiteRemainingTime ?? gameObj.whiteRemainingTime,
          blackClock: data.blackClock ?? data.blackRemainingTime ?? gameObj.blackRemainingTime,
          activeColor: data.activeColor || gameObj.activeColor,
          result: res,
          gameStatus: gameObj.gameStatus,
        },
      });

      if (res && res.winner) {
        dispatch({ type: 'SET_GAME_OVER', payload: res });
      }
    };

    const onClockUpdated = (data) => {
      dispatch({
        type: 'UPDATE_CLOCK',
        payload: {
          whiteClock: data.whiteClock ?? data.whiteRemainingTime,
          blackClock: data.blackClock ?? data.blackRemainingTime,
          activeColor: data.activeColor,
        },
      });
    };

    const onGameOver = (data) => {
      const res = data.result || { winner: data.winner, condition: data.condition };
      // Guard: only dispatch game-over if there's a real winner or draw condition
      if (!res || (!res.winner && !res.condition)) {
        console.warn('[GameContext] onGameOver: ignoring event with no winner/condition', data);
        return;
      }
      dispatch({
        type: 'SET_GAME_OVER',
        payload: res,
      });
    };

    const onDrawOffered = (data) => {
      dispatch({ type: 'SET_DRAW_OFFER', payload: data.offeredBy });
    };

    const onDrawDeclined = () => {
      dispatch({ type: 'SET_DRAW_OFFER', payload: null });
    };

    const onRematchRequested = (data) => {
      dispatch({ type: 'SET_REMATCH_REQUEST', payload: data.requestedBy });
    };

    const onRematchStarted = (data) => {
      const gameObj = data.game || {};
      const lobbyObj = data.lobby || {};
      // playerColor comes as dedicated field from the per-socket emit
      const newColor = data.playerColor || data.color;
      const whiteNick = data.whiteNickname || lobbyObj.whitePlayer?.nickname;
      const blackNick = data.blackNickname || lobbyObj.blackPlayer?.nickname;

      dispatch({
        type: 'SET_LOBBY_INFO',
        payload: {
          lobbyId: lobbyObj.lobbyId || data.lobbyId,
          gameId: gameObj.gameId || data.gameId,
          playerColor: newColor,
          reconnectToken: data.reconnectToken,
          status: 'waiting',
        },
      });
      dispatch({
        type: 'SET_GAME_STARTED',
        payload: {
          fen: gameObj.fen || data.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          whiteClock: gameObj.whiteRemainingTime ?? data.whiteClock,
          blackClock: gameObj.blackRemainingTime ?? data.blackClock,
          activeColor: gameObj.activeColor || data.activeColor || 'w',
          whiteNickname: whiteNick,
          blackNickname: blackNick,
          whitePlayer: lobbyObj.whitePlayer || data.whitePlayer,
          blackPlayer: lobbyObj.blackPlayer || data.blackPlayer,
        },
      });
      dispatch({ type: 'SET_REMATCH_REQUEST', payload: null });
      dispatch({ type: 'SET_DRAW_OFFER', payload: null });
    };

    const onPlayerDisconnected = () => {
      dispatch({ type: 'SET_OPPONENT_CONNECTED', payload: false });
    };

    const onPlayerReconnected = () => {
      dispatch({ type: 'SET_OPPONENT_CONNECTED', payload: true });
    };

    const onReconnected = (data) => {
      dispatch({ type: 'RESTORE_STATE', payload: data });
    };

    const onError = (data) => {
      console.error('[GameContext] Socket error:', data);
    };

    socket.on('lobby-created', onLobbyCreated);
    socket.on('lobby-joined', onLobbyJoined);
    socket.on('lobby-updated', onLobbyUpdated);
    socket.on('game-started', onGameStarted);
    socket.on('move-made', onMoveMade);
    socket.on('clock-updated', onClockUpdated);
    socket.on('game-over', onGameOver);
    socket.on('draw-offered', onDrawOffered);
    socket.on('draw-declined', onDrawDeclined);
    socket.on('rematch-requested', onRematchRequested);
    socket.on('rematch-started', onRematchStarted);
    socket.on('player-disconnected', onPlayerDisconnected);
    socket.on('player-reconnected', onPlayerReconnected);
    socket.on('reconnected', onReconnected);
    socket.on('error', onError);

    return () => {
      socket.off('lobby-created', onLobbyCreated);
      socket.off('lobby-joined', onLobbyJoined);
      socket.off('lobby-updated', onLobbyUpdated);
      socket.off('game-started', onGameStarted);
      socket.off('move-made', onMoveMade);
      socket.off('clock-updated', onClockUpdated);
      socket.off('game-over', onGameOver);
      socket.off('draw-offered', onDrawOffered);
      socket.off('draw-declined', onDrawDeclined);
      socket.off('rematch-requested', onRematchRequested);
      socket.off('rematch-started', onRematchStarted);
      socket.off('player-disconnected', onPlayerDisconnected);
      socket.off('player-reconnected', onPlayerReconnected);
      socket.off('reconnected', onReconnected);
      socket.off('error', onError);
    };
  }, [socket]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const setLobbyInfo = useCallback((info) => {
    dispatch({ type: 'SET_LOBBY_INFO', payload: info });
  }, []);

  const setGameStarted = useCallback((info) => {
    dispatch({ type: 'SET_GAME_STARTED', payload: info });
  }, []);

  const applyMove = useCallback((moveData) => {
    dispatch({ type: 'APPLY_MOVE', payload: moveData });
  }, []);

  const updateClock = useCallback((clockData) => {
    dispatch({ type: 'UPDATE_CLOCK', payload: clockData });
  }, []);

  const selectSquare = useCallback((square) => {
    if (!square) {
      dispatch({ type: 'CLEAR_SELECTION' });
      return;
    }
    const chess = chessRef.current;
    const moves = chess.moves({ square, verbose: true });
    const legalMoves = moves.map((m) => m.to);
    dispatch({ type: 'SELECT_SQUARE', payload: { square, legalMoves } });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const flipBoard = useCallback(() => {
    dispatch({ type: 'FLIP_BOARD' });
  }, []);

  const setGameOver = useCallback((result) => {
    dispatch({ type: 'SET_GAME_OVER', payload: result });
  }, []);

  const setDrawOffer = useCallback((offeredBy) => {
    dispatch({ type: 'SET_DRAW_OFFER', payload: offeredBy });
  }, []);

  const setRematchRequest = useCallback((requestedBy) => {
    dispatch({ type: 'SET_REMATCH_REQUEST', payload: requestedBy });
  }, []);

  const setOpponentConnected = useCallback((connected) => {
    dispatch({ type: 'SET_OPPONENT_CONNECTED', payload: connected });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
  }, []);

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------
  const value = {
    // State
    ...state,
    dispatch,
    // Actions
    setLobbyInfo,
    setGameStarted,
    applyMove,
    updateClock,
    selectSquare,
    clearSelection,
    flipBoard,
    setGameOver,
    setDrawOffer,
    setRematchRequest,
    setOpponentConnected,
    resetGame,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
