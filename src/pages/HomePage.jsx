import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  LogIn,
  Zap,
  Lock,
  UserCheck,
  X,
  Copy,
  Check,
  ChevronDown,
  Clock,
  Shuffle,
  Crown,
  Circle,
  Loader2,
  Swords,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';

// ─── Time controls ────────────────────────────────────────────────────────────
const TIME_CONTROLS = [
  // Bullet
  { label: '1+0', minutes: 1, increment: 0, category: 'Bullet' },
  { label: '1+1', minutes: 1, increment: 1, category: 'Bullet' },
  { label: '2+1', minutes: 2, increment: 1, category: 'Bullet' },
  // Blitz
  { label: '3+0', minutes: 3, increment: 0, category: 'Blitz' },
  { label: '3+2', minutes: 3, increment: 2, category: 'Blitz' },
  { label: '5+0', minutes: 5, increment: 0, category: 'Blitz' },
  { label: '5+3', minutes: 5, increment: 3, category: 'Blitz' },
  // Rapid
  { label: '10+0', minutes: 10, increment: 0, category: 'Rapid' },
  { label: '10+5', minutes: 10, increment: 5, category: 'Rapid' },
  { label: '15+10', minutes: 15, increment: 10, category: 'Rapid' },
  { label: '30+0', minutes: 30, increment: 0, category: 'Rapid' },
  // Unlimited
  { label: 'Unlimited', minutes: 0, increment: 0, category: 'Unlimited' },
];

const CATEGORIES = ['Bullet', 'Blitz', 'Rapid', 'Unlimited'];

const CATEGORY_ICONS = {
  Bullet: '⚡',
  Blitz: '🔥',
  Rapid: '⏱️',
  Unlimited: '∞',
};

// ─── Lobby Creation Modal ─────────────────────────────────────────────────────
function CreateLobbyModal({ onClose }) {
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { dispatch } = useGame();

  const [nickname, setNickname] = useState('');
  const [color, setColor] = useState('random');
  const [selectedCategory, setSelectedCategory] = useState('Blitz');
  const [selectedTC, setSelectedTC] = useState(
    TIME_CONTROLS.find((tc) => tc.label === '5+0')
  );
  const [customMode, setCustomMode] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(10);
  const [customIncrement, setCustomIncrement] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categoryControls = TIME_CONTROLS.filter(
    (tc) => tc.category === selectedCategory
  );

  const handleCreate = () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname.');
      return;
    }
    if (!connected || !socket) {
      setError('Not connected to server. Please wait…');
      return;
    }

    setError('');
    setLoading(true);

    const timeControl = customMode
      ? {
          label: `${customMinutes}+${customIncrement}`,
          minutes: Number(customMinutes),
          increment: Number(customIncrement),
          category: 'Custom',
        }
      : selectedTC;

    socket.emit(
      'create-lobby',
      { nickname: nickname.trim(), color, timeControl },
      (response) => {
        setLoading(false);
        if (response?.error) {
          setError(response.error);
          return;
        }
        if (response?.lobbyId) {
          if (response.reconnectToken) {
            sessionStorage.setItem('reconnectToken', response.reconnectToken);
            sessionStorage.setItem('chess_reconnect_token', response.reconnectToken);
            sessionStorage.setItem('currentLobbyId', response.lobbyId);
            sessionStorage.setItem('chess_current_lobby_id', response.lobbyId);
          }
          if (nickname.trim()) {
            sessionStorage.setItem('chess_nickname', nickname.trim());
          }
          dispatch({ type: 'RESET_GAME' });
          dispatch({ type: 'SET_LOBBY', payload: response });
          navigate(`/game/${response.lobbyId}`);
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/10 shadow-2xl"
        style={{ backgroundColor: '#302E2B' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <Swords size={22} style={{ color: '#81B64C' }} />
            <h2 className="text-xl font-bold text-white">Create a Lobby</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Nickname */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Your Nickname
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Magnus"
              maxLength={20}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 outline-none transition-all focus:border-[#81B64C] focus:ring-1 focus:ring-[#81B64C]"
            />
          </div>

          {/* Color Selection */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Play as
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'white', label: 'White', icon: <Crown size={18} /> },
                { value: 'black', label: 'Black', icon: <Circle size={18} /> },
                {
                  value: 'random',
                  label: 'Random',
                  icon: <Shuffle size={18} />,
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setColor(opt.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-sm font-medium transition-all ${
                    color === opt.value
                      ? 'border-[#81B64C] bg-[#81B64C]/20 text-[#81B64C]'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Control */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                Time Control
              </label>
              <button
                onClick={() => setCustomMode(!customMode)}
                className={`text-xs font-medium transition-colors ${
                  customMode
                    ? 'text-[#81B64C]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {customMode ? '← Presets' : 'Custom →'}
              </button>
            </div>

            {customMode ? (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-gray-400">
                    Minutes
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-white outline-none focus:border-[#81B64C]"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-gray-400">
                    Increment (s)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={customIncrement}
                    onChange={(e) => setCustomIncrement(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-white outline-none focus:border-[#81B64C]"
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Category Tabs */}
                <div className="mb-2 flex gap-1 rounded-xl bg-black/30 p-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        const first = TIME_CONTROLS.find(
                          (tc) => tc.category === cat
                        );
                        if (first) setSelectedTC(first);
                      }}
                      className={`flex-1 rounded-lg py-1 text-xs font-medium transition-all ${
                        selectedCategory === cat
                          ? 'bg-[#81B64C] text-black'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {CATEGORY_ICONS[cat]} {cat}
                    </button>
                  ))}
                </div>

                {/* Controls Grid */}
                <div className="grid grid-cols-4 gap-1.5">
                  {categoryControls.map((tc) => (
                    <button
                      key={tc.label}
                      onClick={() => setSelectedTC(tc)}
                      className={`rounded-lg border py-2 text-sm font-semibold transition-all ${
                        selectedTC?.label === tc.label
                          ? 'border-[#81B64C] bg-[#81B64C]/20 text-[#81B64C]'
                          : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      {tc.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-base font-bold text-black transition-all hover:brightness-110 disabled:opacity-60"
            style={{ backgroundColor: '#81B64C' }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Creating…
              </>
            ) : (
              <>
                <Swords size={18} /> Create Lobby
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, description }) {
  return (
    <div
      className="flex flex-col items-center rounded-2xl border border-white/10 p-6 text-center backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(38,36,33,0.7)' }}
    >
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(129,182,76,0.15)' }}
      >
        {icon}
      </div>
      <h3 className="mb-2 font-bold text-white">{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: '#A8A8A8' }}>
        {description}
      </p>
    </div>
  );
}

// ─── HomePage ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();
  const { connected } = useSocket();
  const { dispatch } = useGame();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinId, setJoinId] = useState('');
  const [joinError, setJoinError] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [copied, setCopied] = useState(false);

  // Extract lobby ID from pasted URL
  const extractLobbyId = (input) => {
    try {
      const url = new URL(input);
      const parts = url.pathname.split('/');
      const gameIndex = parts.indexOf('game');
      if (gameIndex !== -1 && parts[gameIndex + 1]) {
        return parts[gameIndex + 1];
      }
    } catch {
      // not a URL — treat as raw ID
    }
    return input.trim();
  };

  const handleJoin = () => {
    const id = extractLobbyId(joinId);
    if (!id) {
      setJoinError('Please enter a lobby ID or paste an invite link.');
      return;
    }
    setJoinError('');
    dispatch({ type: 'RESET_GAME' });
    navigate(`/game/${id}`);
  };

  const handleJoinKeyDown = (e) => {
    if (e.key === 'Enter') handleJoin();
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#161512', color: '#FFFFFF' }}
    >
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-4 pb-24 pt-20 text-center">
        {/* Background glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-24 h-80 w-80 -translate-x-1/2 rounded-full blur-3xl"
          style={{ backgroundColor: 'rgba(129,182,76,0.08)' }}
        />

        {/* Chess pawn SVG decoration */}
        <div className="mb-6 flex items-center justify-center">
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="32" cy="16" r="10" fill="#81B64C" />
            <rect x="20" y="38" width="24" height="6" rx="3" fill="#81B64C" />
            <path d="M22 44 L16 58 H48 L42 44 Z" fill="#81B64C" />
            <rect x="24" y="26" width="16" height="12" rx="4" fill="#81B64C" />
          </svg>
        </div>

        <h1 className="mb-4 text-6xl font-black tracking-tight text-white">
          By One <span style={{ color: '#81B64C' }}>Dek</span>
        </h1>
        <p className="mb-10 max-w-md text-xl" style={{ color: '#A8A8A8' }}>
          By one bareng teman, di mana saja — tanpa ribet, langsung gas.
        </p>

        {/* Connection badge */}
        <div
          className={`mb-8 flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium ${
            connected
              ? 'bg-green-900/40 text-green-400'
              : 'bg-red-900/40 text-red-400'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? 'bg-green-400' : 'bg-red-400'
            } animate-pulse`}
          />
          {connected ? 'Connected to server' : 'Connecting to server…'}
        </div>
      </section>

      {/* ── Action Cards ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 pb-20">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Play with Friend */}
          <div
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 p-8 transition-all hover:border-[#81B64C]/50 hover:shadow-lg hover:shadow-[#81B64C]/10"
            style={{ backgroundColor: 'rgba(38,36,33,0.8)' }}
            onClick={() => setShowCreateModal(true)}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                background:
                  'radial-gradient(circle at top right, rgba(129,182,76,0.08) 0%, transparent 60%)',
              }}
            />
            <div
              className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: 'rgba(129,182,76,0.15)' }}
            >
              <Users size={28} style={{ color: '#81B64C' }} />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">
              Play with a Friend
            </h2>
            <p className="mb-6 text-sm leading-relaxed" style={{ color: '#A8A8A8' }}>
              Create a private lobby and share the link with your friend. Choose
              your time control and color.
            </p>
            <button
              className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110"
              style={{ backgroundColor: '#81B64C' }}
              onClick={(e) => {
                e.stopPropagation();
                setShowCreateModal(true);
              }}
            >
              <Users size={16} /> Create Lobby
            </button>
          </div>

          {/* Join a Game */}
          <div
            className="group relative overflow-hidden rounded-2xl border border-white/10 p-8 transition-all hover:border-white/20"
            style={{ backgroundColor: 'rgba(38,36,33,0.8)' }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                background:
                  'radial-gradient(circle at top right, rgba(255,255,255,0.03) 0%, transparent 60%)',
              }}
            />
            <div
              className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: 'rgba(168,168,168,0.1)' }}
            >
              <LogIn size={28} style={{ color: '#A8A8A8' }} />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-white">
              Join a Game
            </h2>
            <p className="mb-6 text-sm leading-relaxed" style={{ color: '#A8A8A8' }}>
              Have an invite link or lobby ID? Enter it below to join your
              friend's game instantly.
            </p>

            {!showJoinInput ? (
              <button
                className="flex items-center gap-2 rounded-xl border border-white/20 px-6 py-2.5 text-sm font-bold text-white transition-all hover:border-white/40 hover:bg-white/10"
                onClick={() => setShowJoinInput(true)}
              >
                <LogIn size={16} /> Enter Lobby ID
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={joinId}
                    onChange={(e) => {
                      setJoinId(e.target.value);
                      setJoinError('');
                    }}
                    onKeyDown={handleJoinKeyDown}
                    placeholder="Lobby ID or invite URL…"
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#81B64C]"
                  />
                  <button
                    onClick={handleJoin}
                    className="rounded-xl px-4 py-2.5 text-sm font-bold text-black transition-all hover:brightness-110"
                    style={{ backgroundColor: '#81B64C' }}
                  >
                    Join
                  </button>
                </div>
                {joinError && (
                  <p className="text-xs text-red-400">{joinError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 pb-24">
        <h2
          className="mb-8 text-center text-sm font-semibold uppercase tracking-widest"
          style={{ color: '#81B64C' }}
        >
          Why By One Dek?
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={<Zap size={22} style={{ color: '#81B64C' }} />}
            title="Real-time Play"
            description="Instant move sync over WebSockets — no lag, no delays."
          />
          <FeatureCard
            icon={<Lock size={22} style={{ color: '#81B64C' }} />}
            title="Private Lobbies"
            description="Your game, your rules. Share the link only with who you want."
          />
          <FeatureCard
            icon={<UserCheck size={22} style={{ color: '#81B64C' }} />}
            title="No Account Required"
            description="Jump straight in. Just pick a nickname and start playing."
          />
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer
        className="border-t border-white/5 py-6 text-center text-sm"
        style={{ color: '#A8A8A8' }}
      >
        By One Dek &copy; {new Date().getFullYear()} — Built for chess lovers
        everywhere.
      </footer>

      {/* ── Create Lobby Modal ─────────────────────────────────────────────────── */}
      {showCreateModal && (
        <CreateLobbyModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
