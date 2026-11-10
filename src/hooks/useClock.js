import { useState, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Utility: format milliseconds as "M:SS" or "H:MM:SS"
// ---------------------------------------------------------------------------
export function formatTime(ms) {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const LOW_TIME_THRESHOLD_MS = 30_000; // 30 seconds
const TICK_INTERVAL_MS = 100;

/**
 * Custom hook for chess clock display.
 *
 * @param {number}  whiteClock       - White's remaining time in ms (from server)
 * @param {number}  blackClock       - Black's remaining time in ms (from server)
 * @param {string}  activeColor      - 'w' | 'b'
 * @param {string}  gameStatus       - 'idle' | 'waiting' | 'playing' | 'completed'
 * @param {number|null} lastServerUpdate - Timestamp (Date.now()) of the last server update
 *
 * @returns {{ displayWhiteTime, displayBlackTime, isWhiteActive, isBlackActive, isWhiteLow, isBlackLow }}
 */
export function useClock(whiteClock, blackClock, activeColor, gameStatus, lastServerUpdate) {
  const [displayWhiteMs, setDisplayWhiteMs] = useState(whiteClock);
  const [displayBlackMs, setDisplayBlackMs] = useState(blackClock);

  // Keep latest props in a ref so the interval callback always sees fresh values
  const clockRef = useRef({ whiteClock, blackClock, activeColor, gameStatus, lastServerUpdate });
  useEffect(() => {
    clockRef.current = { whiteClock, blackClock, activeColor, gameStatus, lastServerUpdate };
  }, [whiteClock, blackClock, activeColor, gameStatus, lastServerUpdate]);

  // Reset displayed times whenever the server sends updated clock values
  useEffect(() => {
    setDisplayWhiteMs(whiteClock);
    setDisplayBlackMs(blackClock);
  }, [whiteClock, blackClock, lastServerUpdate]);

  // Tick the clock client-side every 100 ms while the game is active
  useEffect(() => {
    if (gameStatus !== 'playing') return;

    const intervalId = setInterval(() => {
      const { whiteClock: wc, blackClock: bc, activeColor: ac, lastServerUpdate: lsu } = clockRef.current;

      if (!lsu) return;

      // How many ms have elapsed since the last authoritative server update
      const elapsed = Date.now() - lsu;

      const whiteMs = ac === 'w' ? Math.max(0, wc - elapsed) : wc;
      const blackMs = ac === 'b' ? Math.max(0, bc - elapsed) : bc;

      setDisplayWhiteMs(whiteMs);
      setDisplayBlackMs(blackMs);
    }, TICK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [gameStatus]);

  const isWhiteActive = gameStatus === 'playing' && activeColor === 'w';
  const isBlackActive = gameStatus === 'playing' && activeColor === 'b';

  return {
    displayWhiteTime: formatTime(displayWhiteMs),
    displayBlackTime: formatTime(displayBlackMs),
    displayWhiteMs,
    displayBlackMs,
    isWhiteActive,
    isBlackActive,
    isWhiteLow: displayWhiteMs < LOW_TIME_THRESHOLD_MS && displayWhiteMs > 0,
    isBlackLow: displayBlackMs < LOW_TIME_THRESHOLD_MS && displayBlackMs > 0,
  };
}

export default useClock;
