import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const SOUND_ENABLED_KEY = 'chess_sound_enabled';

const SoundContext = createContext(null);

// Web Audio API helpers
function getAudioContext(ref) {
  if (!ref.current) {
    try {
      ref.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      ref.current = null;
    }
  }
  return ref.current;
}

async function ensureAudioContextRunning(ctx) {
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      // ignore
    }
  }
}

function playTone(ctx, frequency, type, startTime, duration, gainPeak = 0.3) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gainPeak, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function playNoise(ctx, startTime, duration, gainPeak = 0.15) {
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1000;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gainPeak, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  source.start(startTime);
  source.stop(startTime + duration);
}

export function SoundProvider({ children }) {
  const audioCtxRef = useRef(null);

  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    return stored === null ? true : stored === 'true';
  });

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_ENABLED_KEY, String(next));
      return next;
    });
  }, []);

  const getCtx = useCallback(async () => {
    // Check both state and localStorage for instant mute
    if (!soundEnabled || localStorage.getItem(SOUND_ENABLED_KEY) === 'false') {
      return null;
    }
    const ctx = getAudioContext(audioCtxRef);
    if (!ctx) return null;
    await ensureAudioContextRunning(ctx);
    return ctx;
  }, [soundEnabled]);

  const playMove = useCallback(async () => {
    const ctx = await getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    playNoise(ctx, t, 0.06, 0.12);
    playTone(ctx, 800, 'sine', t, 0.06, 0.08);
  }, [getCtx]);

  const playCapture = useCallback(async () => {
    const ctx = await getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    playNoise(ctx, t, 0.1, 0.25);
    playTone(ctx, 400, 'square', t, 0.08, 0.1);
  }, [getCtx]);

  const playCheck = useCallback(async () => {
    const ctx = await getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    playTone(ctx, 880, 'sine', t, 0.12, 0.3);
    playTone(ctx, 1100, 'sine', t + 0.14, 0.1, 0.2);
  }, [getCtx]);

  const playGameStart = useCallback(async () => {
    const ctx = await getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((freq, i) => {
      playTone(ctx, freq, 'sine', t + i * 0.12, 0.3, 0.25);
    });
  }, [getCtx]);

  const playGameOver = useCallback(async () => {
    const ctx = await getCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [392.0, 329.63, 261.63, 196.0];
    notes.forEach((freq, i) => {
      playTone(ctx, freq, 'triangle', t + i * 0.2, 0.35, 0.3);
    });
  }, [getCtx]);

  return (
    <SoundContext.Provider
      value={{
        soundEnabled,
        toggleSound,
        playMove,
        playCapture,
        playCheck,
        playGameStart,
        playGameOver,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundContext() {
  const context = useContext(SoundContext);
  if (!context) {
    const isEnabled = localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';
    return {
      soundEnabled: isEnabled,
      toggleSound: () => {},
      playMove: () => {},
      playCapture: () => {},
      playCheck: () => {},
      playGameStart: () => {},
      playGameOver: () => {},
    };
  }
  return context;
}
