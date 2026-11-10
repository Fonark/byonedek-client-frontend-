import React, { useState, useEffect, useCallback } from "react";
import {
  Copy,
  Share2,
  CheckCheck,
  X,
  Wifi,
  WifiOff,
  Clock,
  Hash,
} from "lucide-react";

// ── SVG Chess King Icons ──────────────────────────────────────────────────────

const WhiteKingIcon = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.5 11.63V6M20 8h5" strokeWidth="2" />
      <path
        d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"
        fill="#fff"
        strokeLinecap="butt"
      />
      <path
        d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V17s-5.5-13.5-11-5c-3 6 5 10 5 10V37z"
        fill="#fff"
      />
      <path d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0" />
    </g>
  </svg>
);

const BlackKingIcon = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
    <g fill="#000" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.5 11.63V6M20 8h5" stroke="#fff" strokeWidth="2" />
      <path
        d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"
        strokeLinecap="butt"
      />
      <path
        d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V17s-5.5-13.5-11-5c-3 6 5 10 5 10V37z"
      />
      <path d="M12.5 30c5.5-3 14.5-3 20 0M12.5 33.5c5.5-3 14.5-3 20 0M12.5 37c5.5-3 14.5-3 20 0" stroke="#fff" />
    </g>
  </svg>
);

// ── Animated dots component ───────────────────────────────────────────────────

const AnimatedDots = () => {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % 4), 480);
    return () => clearInterval(id);
  }, []);
  return <span className="inline-block w-6 text-left">{".".repeat(frame)}</span>;
};

// ── Animated chess board loading indicator ────────────────────────────────────

const ChessBoardLoader = () => {
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => (p + 1) % 64), 60);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
      {Array.from({ length: 36 }).map((_, i) => {
        const row = Math.floor(i / 6);
        const col = i % 6;
        const isLight = (row + col) % 2 === 0;
        const dist = Math.abs(i - pulse);
        const brightness = Math.max(0, 1 - dist / 10);
        return (
          <div
            key={i}
            className="rounded-sm transition-all duration-75"
            style={{
              width: 10,
              height: 10,
              backgroundColor: isLight
                ? `rgba(129, 182, 76, ${0.25 + brightness * 0.65})`
                : `rgba(74, 72, 69, ${0.5 + brightness * 0.5})`,
            }}
          />
        );
      })}
    </div>
  );
};

// ── Helper: format time control label ────────────────────────────────────────

const formatTimeControl = (tc) => {
  if (!tc) return "Unknown";
  if (tc.label) return tc.label;
  if (tc.minutes == null) return "Unlimited";
  return `${tc.minutes}+${tc.increment ?? 0}`;
};

// ── Main Component ────────────────────────────────────────────────────────────

const WaitingRoom = ({ lobbyId, playerColor, timeControl, inviteUrl, onCancel }) => {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState("");
  const [connected, setConnected] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  // Simulate connection heartbeat (replace with real socket status prop if available)
  useEffect(() => {
    const id = setInterval(() => {
      setConnected((prev) => prev); // keep existing; real implementation reads socket state
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Elapsed time counter
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const formatElapsed = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0
      ? `${m}m ${s.toString().padStart(2, "0")}s`
      : `${s}s`;
  };

  // ── Copy link ───────────────────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: select & copy via execCommand
      const ta = document.createElement("textarea");
      ta.value = inviteUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [inviteUrl]);

  // ── Share ───────────────────────────────────────────────────────────────────

  const handleShare = useCallback(async () => {
    setShareError("");
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my Chess game!",
          text: `I'm waiting for you! Join my private chess game.`,
          url: inviteUrl,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          setShareError("Share failed. Link copied instead.");
          handleCopy();
        }
      }
    } else {
      // Fallback: copy to clipboard
      handleCopy();
      setShareError("Share not supported on this browser — link copied!");
    }
  }, [inviteUrl, handleCopy]);

  const colorLabel =
    playerColor === "white" ? "White" : playerColor === "black" ? "Black" : "Random";

  const ColorIcon =
    playerColor === "white" ? (
      <WhiteKingIcon size={28} />
    ) : playerColor === "black" ? (
      <BlackKingIcon size={28} />
    ) : (
      <div className="flex gap-1">
        <WhiteKingIcon size={22} />
        <BlackKingIcon size={22} />
      </div>
    );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #1a1917 0%, #262421 60%, #1a1917 100%)" }}
    >
      <div className="w-full max-w-md space-y-4">

        {/* Header Card */}
        <div
          className="rounded-xl p-6 shadow-2xl border border-[#4a4845]/60 text-center space-y-4"
          style={{ background: "#302E2B" }}
        >
          {/* Connection indicator */}
          <div className="flex justify-end">
            <span
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full
                ${connected
                  ? "bg-green-900/40 text-green-400 border border-green-700/40"
                  : "bg-red-900/40 text-red-400 border border-red-700/40"
                }`}
            >
              {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
              {connected ? "Connected" : "Reconnecting…"}
            </span>
          </div>

          {/* Chess board loader */}
          <div className="flex justify-center">
            <ChessBoardLoader />
          </div>

          {/* Waiting text */}
          <div>
            <h1 className="text-xl font-bold text-[#f0ede8]">
              Waiting for opponent<AnimatedDots />
            </h1>
            <p className="text-[#6b6966] text-sm mt-1">
              Waiting for <span className="text-[#8c8885]">{formatElapsed(elapsed)}</span>
            </p>
          </div>

          {/* Game info chips */}
          <div className="flex flex-wrap justify-center gap-3 pt-1">
            {/* Color */}
            <div className="flex items-center gap-2 bg-[#262421] rounded-lg px-3 py-2 border border-[#4a4845]">
              {ColorIcon}
              <div className="text-left">
                <p className="text-xs text-[#6b6966]">Your color</p>
                <p className="text-sm font-semibold text-[#f0ede8]">{colorLabel}</p>
              </div>
            </div>

            {/* Time control */}
            <div className="flex items-center gap-2 bg-[#262421] rounded-lg px-3 py-2 border border-[#4a4845]">
              <Clock size={20} className="text-[#81b64c]" />
              <div className="text-left">
                <p className="text-xs text-[#6b6966]">Time control</p>
                <p className="text-sm font-semibold text-[#f0ede8]">{formatTimeControl(timeControl)}</p>
              </div>
            </div>

            {/* Lobby ID */}
            <div className="flex items-center gap-2 bg-[#262421] rounded-lg px-3 py-2 border border-[#4a4845]">
              <Hash size={18} className="text-[#8c8885]" />
              <div className="text-left">
                <p className="text-xs text-[#6b6966]">Lobby ID</p>
                <p className="text-sm font-semibold text-[#f0ede8] font-mono tracking-wider">{lobbyId}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invite Card */}
        <div
          className="rounded-xl p-5 shadow-xl border border-[#4a4845]/60 space-y-4"
          style={{ background: "#302E2B" }}
        >
          <div>
            <h2 className="text-base font-bold text-[#f0ede8] mb-0.5">Invite your friend</h2>
            <p className="text-xs text-[#6b6966]">Share this link to let someone join your game</p>
          </div>

          {/* URL display box */}
          <div
            className="flex items-center gap-2 bg-[#262421] border border-[#4a4845] rounded-lg px-3 py-2.5 cursor-text select-all"
            onClick={handleCopy}
            title="Click to copy"
          >
            <span className="flex-1 text-sm text-[#81b64c] font-mono break-all leading-snug">
              {inviteUrl}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(); }}
              className={`flex-shrink-0 p-1.5 rounded transition-all duration-150
                ${copied ? "text-green-400" : "text-[#8c8885] hover:text-[#f0ede8]"}`}
              aria-label="Copy link"
            >
              {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold
                border transition-all duration-150 active:scale-[0.97]
                ${copied
                  ? "bg-green-700/30 border-green-600/50 text-green-400"
                  : "bg-[#262421] border-[#4a4845] text-[#f0ede8] hover:border-[#81b64c] hover:text-[#81b64c]"
                }`}
            >
              {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold
                bg-[#81b64c] hover:bg-[#8fc954] text-white border border-[#81b64c]
                transition-all duration-150 active:scale-[0.97] shadow-md"
            >
              <Share2 size={16} />
              Share
            </button>
          </div>

          {/* Share error / hint */}
          {shareError && (
            <p className="text-xs text-amber-400 text-center animate-pulse">{shareError}</p>
          )}

          {/* QR hint */}
          <p className="text-xs text-[#5a5855] text-center">
            💡 You can also share the Lobby ID&nbsp;
            <span className="font-mono text-[#6b6966]">{lobbyId}</span>
            &nbsp;directly — your friend can enter it on the home page.
          </p>
        </div>

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium
            text-[#8c8885] border border-[#4a4845]/60 hover:border-red-600/50 hover:text-red-400
            hover:bg-red-900/10 transition-all duration-150 active:scale-[0.98]"
          style={{ background: "#302E2B" }}
        >
          <X size={15} />
          Cancel &amp; Leave Lobby
        </button>
      </div>
    </div>
  );
};

export default WaitingRoom;
