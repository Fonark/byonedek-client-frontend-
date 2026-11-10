import React, { useState, useRef, useCallback } from "react";
import { LogIn, X, AlertCircle, Loader2, Link2 } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract lobby ID from either a bare ID string or a full invite URL.
 * Supported URL patterns:
 *   https://example.com/join/ABC123
 *   https://example.com/lobby/ABC123
 *   https://example.com/game/ABC123
 *   https://example.com/?lobby=ABC123
 *   https://example.com/?id=ABC123
 *   https://example.com/?game=ABC123
 */
const extractLobbyId = (input) => {
  const trimmed = input.trim();
  if (!trimmed) return "";

  // Try to parse as URL
  let url;
  try {
    // If it doesn't have a protocol, try with https:// prefix to help parse
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    url = new URL(withProtocol);
  } catch {
    // Not a URL — treat as raw ID
    return trimmed;
  }

  // Check common path patterns: /join/ID, /lobby/ID, /game/ID
  const pathMatch = url.pathname.match(/\/(?:join|lobby|game)\/([A-Za-z0-9_-]+)\/?$/i);
  if (pathMatch) return pathMatch[1];

  // Check query params: ?lobby=ID, ?id=ID, ?game=ID
  for (const param of ["lobby", "id", "game", "lobbyId", "lobbyid"]) {
    const val = url.searchParams.get(param);
    if (val) return val;
  }

  // Last segment of pathname as fallback
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length > 0) return segments[segments.length - 1];

  return trimmed;
};

const ERROR_MESSAGES = {
  NOT_FOUND: "Lobby not found. Check the ID and try again.",
  FULL: "This lobby is already full.",
  STARTED: "This game has already started.",
  EXPIRED: "This lobby has expired.",
  INVALID_ID: "Please enter a valid Game ID or invite link.",
  NETWORK: "Connection error. Please check your internet and try again.",
  DEFAULT: "Something went wrong. Please try again.",
};

const friendlyError = (err) => {
  if (!err) return ERROR_MESSAGES.DEFAULT;
  if (typeof err === "string") {
    const upper = err.toUpperCase();
    return ERROR_MESSAGES[upper] ?? err;
  }
  if (err.code) return ERROR_MESSAGES[err.code.toUpperCase()] ?? err.message ?? ERROR_MESSAGES.DEFAULT;
  if (err.message) return err.message;
  return ERROR_MESSAGES.DEFAULT;
};

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * JoinGame — lets a user enter a lobby ID or paste an invite URL.
 *
 * Props:
 *   onJoin(lobbyId: string) => Promise<void>
 *     Called with the extracted lobby ID when the form is submitted.
 *     Should throw an error (with an optional `code` property) on failure.
 */
const JoinGame = ({ onJoin }) => {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef(null);

  // Derived: the actual lobby ID that would be submitted
  const derivedId = extractLobbyId(inputValue);
  const isUrl = (() => {
    try {
      const withProto = /^https?:\/\//i.test(inputValue.trim())
        ? inputValue.trim()
        : `https://${inputValue.trim()}`;
      new URL(withProto);
      return inputValue.trim().includes(".");
    } catch {
      return false;
    }
  })();

  const handleChange = (e) => {
    setInputValue(e.target.value);
    if (error) setError("");
  };

  const handleClear = () => {
    setInputValue("");
    setError("");
    inputRef.current?.focus();
  };

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      const id = extractLobbyId(inputValue);

      if (!id || id.length < 2) {
        setError(ERROR_MESSAGES.INVALID_ID);
        inputRef.current?.focus();
        return;
      }

      setLoading(true);
      setError("");
      try {
        await onJoin(id);
      } catch (err) {
        setError(friendlyError(err));
      } finally {
        setLoading(false);
      }
    },
    [inputValue, onJoin]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) handleSubmit();
  };

  const hasInput = inputValue.trim().length > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} noValidate>
        {/* Label */}
        <label
          htmlFor="join-game-input"
          className="block text-sm font-medium text-[#b0aca8] mb-2"
        >
          Join a Private Game
        </label>

        {/* Input row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            {/* Leading icon */}
            <span
              className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-150 pointer-events-none
                ${inputFocused ? "text-[#81b64c]" : "text-[#5a5855]"}`}
            >
              <Link2 size={16} />
            </span>

            <input
              ref={inputRef}
              id="join-game-input"
              type="text"
              value={inputValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Enter Game ID or paste invite link"
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
              className={`w-full bg-[#262421] rounded-lg pl-9 pr-9 py-2.5 text-sm text-[#f0ede8]
                placeholder-[#5a5855] outline-none border-2 transition-colors duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
                ${error
                  ? "border-red-500 focus:border-red-400"
                  : inputFocused
                  ? "border-[#81b64c]"
                  : "border-[#4a4845] hover:border-[#6b6966]"
                }`}
            />

            {/* Clear button */}
            {hasInput && !loading && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5a5855]
                  hover:text-[#b0aca8] transition-colors p-0.5 rounded"
                aria-label="Clear input"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Join button */}
          <button
            type="submit"
            disabled={loading || !hasInput}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold
              border transition-all duration-150 whitespace-nowrap active:scale-[0.97]
              ${loading || !hasInput
                ? "bg-[#81b64c]/30 border-[#81b64c]/30 text-white/40 cursor-not-allowed"
                : "bg-[#81b64c] hover:bg-[#8fc954] border-[#81b64c] text-white shadow-md hover:shadow-[#81b64c]/30"
              }`}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Joining…</span>
              </>
            ) : (
              <>
                <LogIn size={15} />
                <span>Join</span>
              </>
            )}
          </button>
        </div>

        {/* URL detection hint */}
        {isUrl && hasInput && !error && (
          <p className="mt-1.5 text-xs text-[#81b64c] flex items-center gap-1">
            <Link2 size={11} />
            Invite link detected — ID:&nbsp;
            <span className="font-mono font-semibold">{derivedId}</span>
          </p>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-2 flex items-start gap-1.5 text-sm text-red-400 animate-pulse-once">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>
    </div>
  );
};

export default JoinGame;
