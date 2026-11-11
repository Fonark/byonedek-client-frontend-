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
 * Clock ticks smoothly di client setiap 100ms, snap ke nilai server saat ada update.
 */
export function useClock(whiteClock, blackClock, activeColor, gameStatus, lastServerUpdate) {
  const [displayWhiteMs, setDisplayWhiteMs] = useState(whiteClock ?? 0);
  const [displayBlackMs, setDisplayBlackMs] = useState(blackClock ?? 0);

  // Refs selalu sinkron dengan nilai terbaru — aman dipakai di dalam interval
  const activeColorRef = useRef(activeColor);
  const gameStatusRef  = useRef(gameStatus);

  useEffect(() => { activeColorRef.current = activeColor; }, [activeColor]);
  useEffect(() => { gameStatusRef.current  = gameStatus;  }, [gameStatus]);

  // Snap ke nilai server setiap kali server kirim update (move-made, game-started, dll)
  useEffect(() => {
    if (whiteClock != null) setDisplayWhiteMs(whiteClock);
    if (blackClock != null) setDisplayBlackMs(blackClock);
  }, [whiteClock, blackClock, lastServerUpdate]);

  // Satu interval yang jalan terus — kurangi 100ms setiap tick dari giliran aktif.
  // Tidak perlu restart interval, cukup baca ref yang selalu sinkron.
  useEffect(() => {
    const id = setInterval(() => {
      if (gameStatusRef.current !== 'playing') return;
      const ac = activeColorRef.current;
      if (ac === 'w') {
        setDisplayWhiteMs(prev => Math.max(0, prev - TICK_INTERVAL_MS));
      } else if (ac === 'b') {
        setDisplayBlackMs(prev => Math.max(0, prev - TICK_INTERVAL_MS));
      }
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []); // sengaja tanpa deps — interval hidup selama komponen mount

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
