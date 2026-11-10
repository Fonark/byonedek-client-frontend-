import React from "react";

/**
 * ChessClock component
 * Props:
 *   timeMs          - remaining time in milliseconds
 *   isActive        - whether this clock is currently ticking
 *   color           - "white" | "black"
 *   playerName      - string to display
 *   isLow           - boolean, true when time < 30 seconds
 */
const ChessClock = ({ timeMs = 0, isActive = false, color = "white", playerName = "Player", isLow = false }) => {
  const formatTime = (ms) => {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (ms < 10000) {
      // Show tenths of a second
      const tenths = Math.floor((ms % 1000) / 100);
      return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  return (
    <div
      className={`
        flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-300 select-none
        ${isActive
          ? "bg-[#3d3a36] shadow-[0_0_12px_rgba(129,182,76,0.35)]"
          : "bg-[#262421]"
        }
        ${isLow ? "animate-pulse" : ""}
      `}
    >
      {/* Left: color dot + player name */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Color indicator dot */}
        <span
          className={`
            flex-shrink-0 w-4 h-4 rounded-full border-2
            ${color === "white"
              ? "bg-white border-gray-400"
              : "bg-[#1a1a1a] border-gray-500"
            }
          `}
          aria-label={`${color} player`}
        />

        {/* Player name */}
        <span
          className={`
            text-sm font-medium truncate
            ${isActive ? "text-white" : "text-[#A8A8A8]"}
          `}
        >
          {playerName}
        </span>
      </div>

      {/* Right: time display */}
      <div
        className={`
          font-mono font-bold tabular-nums tracking-tight flex-shrink-0 ml-3
          ${isLow
            ? "text-red-400"
            : isActive
              ? "text-white text-2xl"
              : "text-[#A8A8A8] text-2xl"
          }
          ${isLow ? "text-2xl" : ""}
        `}
        aria-live={isActive ? "polite" : "off"}
        aria-atomic="true"
      >
        {formatTime(timeMs)}
      </div>
    </div>
  );
};

export default ChessClock;
