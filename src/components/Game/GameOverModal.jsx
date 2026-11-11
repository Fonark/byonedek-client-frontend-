import React, { useEffect, useState } from "react";
import {
  Trophy,
  Clock,
  Minus,
  RefreshCw,
  Home,
  AlertTriangle,
} from "lucide-react";

const Handshake = ({ size = 20, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m11 17 2 2a1 1 0 0 0 1.4 0l4.3-4.3a1 1 0 0 0 0-1.4l-2.6-2.6a1 1 0 0 0-1.4 0l-1.3 1.3" />
    <path d="m13 7.1 2.3-2.3a1 1 0 0 1 1.4 0l4.3 4.3a1 1 0 0 1 0 1.4L18.4 13" />
    <path d="m3 14 5-5a1 1 0 0 1 1.4 0l2.3 2.3" />
    <path d="m7 18 2.3 2.3a1 1 0 0 0 1.4 0l1.3-1.3" />
    <path d="m2 10 3-3" />
  </svg>
);

/**
 * Maps game-end condition strings to human-readable text and an icon.
 */
const CONDITION_MAP = {
  checkmate:        { label: "by Checkmate",        Icon: Trophy },
  resignation:      { label: "by Resignation",      Icon: AlertTriangle },
  timeout:          { label: "on Time",              Icon: Clock },
  stalemate:        { label: "by Stalemate",         Icon: Minus },
  'draw-agreement': { label: "by Agreement",         Icon: Handshake },
  draw_agreed:      { label: "by Agreement",         Icon: Handshake },
  draw:             { label: "Draw",                Icon: Minus },
  insufficient:     { label: "Insufficient Material", Icon: Minus },
  repetition:       { label: "by Repetition",        Icon: Minus },
  threefold:        { label: "by Threefold Repetition", Icon: Minus },
  fifty_move:       { label: "by 50-Move Rule",      Icon: Minus },
  'fifty-move':     { label: "by 50-Move Rule",      Icon: Minus },
};

/**
 * GameOverModal component
 * Props:
 *   result        - { winner: "white"|"black"|"draw", condition: string }
 *   playerColor   - "white" | "black"  (the viewing player's color)
 *   onRematch     - () => void | null (pass null to hide button)
 *   onReturnHome  - () => void
 */
const GameOverModal = ({
  result = { winner: "draw", condition: "stalemate" },
  playerColor = "white",
  onRematch = null,
  onReturnHome,
}) => {
  const [visible, setVisible] = useState(false);

  // Trigger fade-in after mount
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  if (!result || !result.winner) {
    return null;
  }

  const { winner, condition } = result;
  const conditionInfo = CONDITION_MAP[condition] ?? { label: condition, Icon: Trophy };
  const { label: conditionLabel, Icon: ConditionIcon } = conditionInfo;

  // ── Determine headline ───────────────────────────────────────────────────
  let headline = "";
  let headlineColor = "text-white";
  let isPlayerWin = false;
  let isPlayerLoss = false;

  if (winner === "draw") {
    headline = "Draw!";
    headlineColor = "text-yellow-300";
  } else if (winner === "white") {
    headline = "White Wins!";
    if (playerColor === "white") {
      headlineColor = "text-[#81B64C]";
      isPlayerWin = true;
    } else {
      headlineColor = "text-red-400";
      isPlayerLoss = true;
    }
  } else if (winner === "black") {
    headline = "Black Wins!";
    if (playerColor === "black") {
      headlineColor = "text-[#81B64C]";
      isPlayerWin = true;
    } else {
      headlineColor = "text-red-400";
      isPlayerLoss = true;
    }
  } else {
    return null;
  }

  const subtext = isPlayerWin
    ? "You won 🎉"
    : isPlayerLoss
      ? "Better luck next time"
      : "Good game!";

  return (
    /* Full-screen overlay */
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        bg-black/70 backdrop-blur-sm
        transition-opacity duration-500
        ${visible ? "opacity-100" : "opacity-0"}
      `}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
    >
      {/* Modal card */}
      <div
        className={`
          relative bg-[#302E2B] rounded-2xl shadow-2xl p-8
          flex flex-col items-center gap-5
          w-full max-w-sm mx-4
          transition-transform duration-500
          ${visible ? "scale-100" : "scale-90"}
        `}
      >
        {/* Icon */}
        <div
          className={`
            w-16 h-16 rounded-full flex items-center justify-center
            ${winner === "draw"
              ? "bg-yellow-900/40 text-yellow-300"
              : isPlayerWin
                ? "bg-[#81B64C]/20 text-[#81B64C]"
                : "bg-red-900/30 text-red-400"
            }
          `}
        >
          <ConditionIcon size={32} strokeWidth={1.5} />
        </div>

        {/* Headline */}
        <div className="text-center">
          <h2
            id="game-over-title"
            className={`text-3xl font-extrabold tracking-tight ${headlineColor}`}
          >
            {headline}
          </h2>
          <p className="text-[#A8A8A8] text-sm mt-1">{conditionLabel}</p>
        </div>

        {/* Subtext */}
        <p className="text-white/70 text-sm">{subtext}</p>

        {/* Divider */}
        <div className="w-full border-t border-[#262421]" />

        {/* Action buttons */}
        <div className="flex flex-col w-full gap-3">
          {onRematch !== null && (
            <button
              onClick={onRematch}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#81B64C] hover:bg-[#6fa33d] text-[#161512] font-bold text-sm transition-colors duration-150"
              aria-label="Rematch"
            >
              <RefreshCw size={16} />
              Rematch
            </button>
          )}
          <button
            onClick={onReturnHome}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#262421] hover:bg-[#3d3a36] text-[#A8A8A8] hover:text-white font-medium text-sm transition-colors duration-150 border border-[#3d3a36]"
            aria-label="Return to home"
          >
            <Home size={16} />
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
