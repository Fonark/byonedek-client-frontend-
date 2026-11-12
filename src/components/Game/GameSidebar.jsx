import React, { useState } from "react";
import {
  Copy,
  Check,
  Flag,
  RotateCcw,
  RefreshCw,
  Clock,
  Hash,
  Undo2,
  X,
} from "lucide-react";
import MoveHistory from "./MoveHistory";

const Handshake = ({ size = 16, className = "" }) => (
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
 * GameSidebar component
 * Props:
 *   lobbyId          - string lobby identifier
 *   gameId           - string game identifier
 *   moveHistory      - array of { san, color }
 *   gameStatus       - "playing" | "over"
 *   timeControl      - string e.g. "5+3"
 *   onResign         - () => void
 *   onOfferDraw      - () => void
 *   onFlipBoard      - () => void
 *   onCopyLink       - () => void  (optional override; component also handles internally)
 *   drawOffer        - null | "sent" | "received"
 *   playerColor      - "white" | "black"
 *   onAcceptDraw     - () => void
 *   onDeclineDraw    - () => void
 *   onRematch        - () => void
 *   rematchRequest   - null | "sent" | "received"
 *   onAcceptRematch  - () => void
 */
const GameSidebar = ({
  lobbyId = "",
  gameId = "",
  moveHistory = [],
  gameStatus = "playing",
  timeControl = "—",
  onResign,
  onOfferDraw,
  onFlipBoard,
  onCopyLink,
  drawOffer = null,
  playerColor = "white",
  onAcceptDraw,
  onDeclineDraw,
  onOfferTakeback,
  onAcceptTakeback,
  onDeclineTakeback,
  takebackOffer = null,
  canTakeback = false,
  onRematch,
  rematchRequest = null,
  onAcceptRematch,
}) => {
  const [copied, setCopied] = useState(false);
  const [resignConfirm, setResignConfirm] = useState(false);

  const currentMoveIndex = moveHistory.length - 1;

  // ── Copy invitation link ──────────────────────────────────────────────────
  const handleCopyLink = async () => {
    const url = `${window.location.origin}/game/${lobbyId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopyLink?.();
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Resign with confirmation ──────────────────────────────────────────────
  const handleResignClick = () => {
    if (resignConfirm) {
      onResign?.();
      setResignConfirm(false);
    } else {
      setResignConfirm(true);
      setTimeout(() => setResignConfirm(false), 3000);
    }
  };

  return (
    <aside className="flex flex-col h-full bg-[#302E2B] rounded-xl overflow-hidden shadow-xl min-w-[220px] max-w-xs w-full">

      {/* ── Move history ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 p-3">
        <MoveHistory moves={moveHistory} currentMoveIndex={currentMoveIndex} />
      </div>

      {/* ── Divider ────────────────────────────────────────────────────────── */}
      <div className="border-t border-[#262421]" />

      {/* ── Game info ──────────────────────────────────────────────────────── */}
      <div className="px-3 py-2 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-[#A8A8A8]">
          <Clock size={12} className="flex-shrink-0" />
          <span>{timeControl}</span>
        </div>
        {lobbyId && (
          <div className="flex items-center gap-2 text-xs text-[#A8A8A8]">
            <Hash size={12} className="flex-shrink-0" />
            <span className="font-mono truncate">{lobbyId}</span>
          </div>
        )}
      </div>

      {/* ── Invite link button ─────────────────────────────────────────────── */}
      {lobbyId && gameStatus === "playing" && (
        <div className="px-3 pb-2">
          <button
            onClick={handleCopyLink}
            className={`
              w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium
              transition-all duration-200
              ${copied
                ? "bg-[#81B64C] text-[#161512]"
                : "bg-[#262421] hover:bg-[#3d3a36] text-[#A8A8A8] hover:text-white border border-[#3d3a36]"
              }
            `}
            aria-label="Copy invitation link"
          >
            {copied ? (
              <>
                <Check size={14} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy Invite Link</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Draw offer UI ──────────────────────────────────────────────────── */}
      {gameStatus === "playing" && drawOffer === "received" && (
        <div className="mx-3 mb-2 p-2 rounded-lg bg-[#262421] border border-[#81B64C]/40">
          <p className="text-xs text-[#A8A8A8] mb-2 text-center">
            Opponent offers a draw
          </p>
          <div className="flex gap-2">
            <button
              onClick={onAcceptDraw}
              className="flex-1 py-1.5 rounded bg-[#81B64C] hover:bg-[#6fa33d] text-[#161512] text-xs font-bold transition-colors duration-150"
            >
              Accept
            </button>
            <button
              onClick={onDeclineDraw}
              className="flex-1 py-1.5 rounded bg-[#3d3a36] hover:bg-[#4a4744] text-white text-xs font-medium transition-colors duration-150"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {gameStatus === "playing" && drawOffer === "sent" && (
        <div className="mx-3 mb-2 p-2 rounded-lg bg-[#262421] border border-[#3d3a36]">
          <p className="text-xs text-[#A8A8A8] text-center">
            Draw offer sent — waiting…
          </p>
        </div>
      )}

      {/* ── Takeback offer UI (Lichess style) ──────────────────────────────── */}
      {gameStatus === "playing" && takebackOffer === "received" && (
        <div className="mx-3 mb-2 p-2 rounded-lg bg-[#262421] border border-[#81B64C]/40">
          <p className="text-xs text-[#A8A8A8] mb-2 text-center">
            Opponent proposes a takeback
          </p>
          <div className="flex gap-2">
            <button
              onClick={onAcceptTakeback}
              className="flex-1 py-1.5 rounded bg-[#81B64C] hover:bg-[#6fa33d] text-[#161512] text-xs font-bold transition-colors duration-150 flex items-center justify-center gap-1"
            >
              <Check size={13} />
              Accept
            </button>
            <button
              onClick={onDeclineTakeback}
              className="flex-1 py-1.5 rounded bg-[#3d3a36] hover:bg-[#4a4744] text-white text-xs font-medium transition-colors duration-150 flex items-center justify-center gap-1"
            >
              <X size={13} />
              Decline
            </button>
          </div>
        </div>
      )}

      {gameStatus === "playing" && takebackOffer === "sent" && (
        <div className="mx-3 mb-2 p-2 rounded-lg bg-[#262421] border border-[#3d3a36]">
          <p className="text-xs text-[#A8A8A8] text-center">
            Takeback offer sent — waiting…
          </p>
        </div>
      )}

      {/* ── Rematch UI ─────────────────────────────────────────────────────── */}
      {gameStatus === "over" && rematchRequest === "received" && (
        <div className="mx-3 mb-2 p-2 rounded-lg bg-[#262421] border border-[#81B64C]/40">
          <p className="text-xs text-[#A8A8A8] mb-2 text-center">
            Opponent wants a rematch
          </p>
          <div className="flex gap-2">
            <button
              onClick={onAcceptRematch}
              className="flex-1 py-1.5 rounded bg-[#81B64C] hover:bg-[#6fa33d] text-[#161512] text-xs font-bold transition-colors duration-150"
            >
              Accept
            </button>
          </div>
        </div>
      )}

      {gameStatus === "over" && rematchRequest === "sent" && (
        <div className="mx-3 mb-2 p-2 rounded-lg bg-[#262421] border border-[#3d3a36]">
          <p className="text-xs text-[#A8A8A8] text-center">
            Rematch requested — waiting…
          </p>
        </div>
      )}

      {/* ── Game controls ──────────────────────────────────────────────────── */}
      <div className="px-3 pb-3 flex flex-col gap-2">
        {/* Flip board (always available) */}
        <button
          onClick={onFlipBoard}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#262421] hover:bg-[#3d3a36] text-[#A8A8A8] hover:text-white text-sm font-medium transition-all duration-150 border border-[#3d3a36]"
          aria-label="Flip board"
        >
          <RotateCcw size={14} />
          Flip Board
        </button>

        {gameStatus === "playing" && (
          <>
            {/* Takeback (Lichess style) */}
            {canTakeback && takebackOffer !== "sent" && (
              <button
                onClick={onOfferTakeback}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#262421] hover:bg-[#3d3a36] text-[#A8A8A8] hover:text-white text-sm font-medium transition-all duration-150 border border-[#3d3a36]"
                aria-label="Request takeback"
              >
                <Undo2 size={14} />
                Takeback
              </button>
            )}

            {/* Offer draw */}
            {drawOffer !== "sent" && (
              <button
                onClick={onOfferDraw}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#262421] hover:bg-[#3d3a36] text-[#A8A8A8] hover:text-white text-sm font-medium transition-all duration-150 border border-[#3d3a36]"
                aria-label="Offer draw"
              >
                <Handshake size={14} />
                Offer Draw
              </button>
            )}

            {/* Resign */}
            <button
              onClick={handleResignClick}
              className={`
                w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-150
                ${resignConfirm
                  ? "bg-red-700 hover:bg-red-600 text-white border border-red-500"
                  : "bg-[#262421] hover:bg-[#3d3a36] text-[#A8A8A8] hover:text-white border border-[#3d3a36]"
                }
              `}
              aria-label="Resign"
            >
              <Flag size={14} />
              {resignConfirm ? "Confirm Resign?" : "Resign"}
            </button>
          </>
        )}

        {gameStatus === "over" && rematchRequest === null && (
          <button
            onClick={onRematch}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#81B64C] hover:bg-[#6fa33d] text-[#161512] text-sm font-bold transition-all duration-150"
            aria-label="Request rematch"
          >
            <RefreshCw size={14} />
            Rematch
          </button>
        )}
      </div>
    </aside>
  );
};

export default GameSidebar;
