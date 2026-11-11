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
 * Clock ticks smoothly di client, disync saat server kirim update.
 *
 * @param {number}  whiteClock       - White's remaining time in ms (from server)
 * @param {number}  blackClock       - Black's remaining time in ms (from server)
 * @param {string}  activeColor      - 'w' | 'b'
 * @param {string}  gameStatus       - 'idle' | 'waiting' | 'playing' | 'completed'
 * @param {number|null} lastServerUpdate - Timestamp (Date.now()) of the last server update
 */
export function useClock(whiteClock, blackClock, activeColor, gameStatus, lastServerUpdate) {
  // displayMs adalah state internal yang terus bergerak setiap 100ms
  const [displayWhiteMs, setDisplayWhiteMs] = useState(whiteClock);
  const [displayBlackMs, setDisplayBlackMs] = useState(blackClock);

  // Ref internal clock — ini yang dipakai interval untuk hitung mundur
  // Disimpan sebagai "baseMs" (nilai saat mulai tick) + "startedAt" (waktu mulai tick)
  const internalRef = useRef({
    whiteBase: whiteClock,
    blackBase: blackClock,
    activeColor,
    startedAt: Date.now(),
    gameStatus,
  });

  // Setiap kali server kirim data baru (move-made, clock-updated, game-started)
  // → reset base clock ke nilai server dan catat waktu sekarang sebagai titik awal
  useEffect(() => {
    if (whiteClock == null || blackClock == null) return;
    internalRef.current = {
      whiteBase: whiteClock,
      blackBase: blackClock,
      activeColor,
      startedAt: Date.now(),
      gameStatus,
    };
    // Langsung tampilkan nilai server (snap to authoritative value)
    setDisplayWhiteMs(whiteClock);
    setDisplayBlackMs(blackClock);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whiteClock, blackClock, lastServerUpdate, activeColor]);

  // Interval yang berjalan terus setiap 100ms saat game playing
  // Menggunakan internalRef supaya selalu pakai nilai terbaru
  useEffect(() => {
    if (gameStatus !== 'playing') return;

    const intervalId = setInterval(() => {
      const { whiteBase, blackBase, activeColor: ac, startedAt, gameStatus: gs } = internalRef.current;
      if (gs !== 'playing') return;

      const elapsed = Date.now() - startedAt;

      const newWhite = ac === 'w' ? Math.max(0, whiteBase - elapsed) : whiteBase;
      const newBlack = ac === 'b' ? Math.max(0, blackBase - elapsed) : blackBase;

      setDisplayWhiteMs(newWhite);
      setDisplayBlackMs(newBlack);
    }, TICK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [gameStatus]);

  // Update ref gameStatus tanpa restart interval
  useEffect(() => {
    internalRef.current.gameStatus = gameStatus;
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
