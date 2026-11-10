import React, { useState, useEffect } from "react";
import { Shuffle, X, Clock, ChevronRight } from "lucide-react";

// ── SVG Chess King Icons ──────────────────────────────────────────────────────

const WhiteKingIcon = ({ size = 28 }) => (
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

const BlackKingIcon = ({ size = 28 }) => (
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

// ── Time control data ─────────────────────────────────────────────────────────

const TIME_CATEGORIES = ["Bullet", "Blitz", "Rapid", "Unlimited", "Custom"];

const TIME_OPTIONS = {
  Bullet: [
    { label: "1+0", minutes: 1, increment: 0 },
    { label: "1+1", minutes: 1, increment: 1 },
    { label: "1+2", minutes: 1, increment: 2 },
  ],
  Blitz: [
    { label: "3+0", minutes: 3, increment: 0 },
    { label: "3+2", minutes: 3, increment: 2 },
    { label: "3+3", minutes: 3, increment: 3 },
    { label: "5+0", minutes: 5, increment: 0 },
    { label: "5+3", minutes: 5, increment: 3 },
  ],
  Rapid: [
    { label: "10+0", minutes: 10, increment: 0 },
    { label: "10+5", minutes: 10, increment: 5 },
  ],
  Unlimited: [{ label: "No time limit", minutes: null, increment: null }],
  Custom: [],
};

// ── Main Component ────────────────────────────────────────────────────────────

const CreateLobbyModal = ({ isOpen, onClose, onCreateLobby }) => {
  const [nickname, setNickname] = useState("");
  const [color, setColor] = useState("random");
  const [timeCategory, setTimeCategory] = useState("Blitz");
  const [selectedTime, setSelectedTime] = useState({ label: "5+0", minutes: 5, increment: 0 });
  const [customMinutes, setCustomMinutes] = useState(10);
  const [customIncrement, setCustomIncrement] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [visible, setVisible] = useState(false);

  // Entrance animation
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setNickname("");
      setColor("random");
      setTimeCategory("Blitz");
      setSelectedTime({ label: "5+0", minutes: 5, increment: 0 });
      setCustomMinutes(10);
      setCustomIncrement(0);
      setErrors({});
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = () => {
    const newErrors = {};
    if (nickname.length > 20) {
      newErrors.nickname = "Nickname must be 20 characters or fewer.";
    }
    if (timeCategory === "Custom") {
      const mins = Number(customMinutes);
      const inc = Number(customIncrement);
      if (!Number.isInteger(mins) || mins < 1 || mins > 180) {
        newErrors.customMinutes = "Minutes must be between 1 and 180.";
      }
      if (!Number.isInteger(inc) || inc < 0 || inc > 60) {
        newErrors.customIncrement = "Increment must be between 0 and 60.";
      }
    }
    return newErrors;
  };

  // ── Category change ─────────────────────────────────────────────────────────

  const handleCategoryChange = (cat) => {
    setTimeCategory(cat);
    if (cat !== "Custom" && cat !== "Unlimited") {
      setSelectedTime(TIME_OPTIONS[cat][0]);
    } else if (cat === "Unlimited") {
      setSelectedTime(TIME_OPTIONS.Unlimited[0]);
    } else {
      setSelectedTime(null);
    }
    setErrors({});
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    let timeControl;
    if (timeCategory === "Custom") {
      timeControl = {
        label: `${customMinutes}+${customIncrement}`,
        minutes: Number(customMinutes),
        increment: Number(customIncrement),
        category: "Custom",
      };
    } else if (timeCategory === "Unlimited") {
      timeControl = { label: "Unlimited", minutes: null, increment: null, category: "Unlimited" };
    } else {
      timeControl = { ...selectedTime, category: timeCategory };
    }

    setLoading(true);
    try {
      await onCreateLobby({
        nickname: nickname.trim() || null,
        color,
        timeControl,
      });
    } catch {
      setLoading(false);
    }
  };

  // ── Color button helper ─────────────────────────────────────────────────────

  const colorBtn = (value, label, Icon) => {
    const active = color === value;
    return (
      <button
        type="button"
        onClick={() => setColor(value)}
        className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg border-2 transition-all duration-150 cursor-pointer select-none
          ${active
            ? "border-[#81b64c] bg-[#81b64c]/15 shadow-[0_0_0_2px_#81b64c40]"
            : "border-[#4a4845] bg-[#262421] hover:border-[#6b6966]"
          }`}
        aria-pressed={active}
      >
        {Icon}
        <span className={`text-xs font-medium ${active ? "text-[#81b64c]" : "text-[#b0aca8]"}`}>{label}</span>
      </button>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ backgroundColor: "rgba(0,0,0,0.72)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-lobby-title"
    >
      <div
        className={`relative w-full max-w-md rounded-xl shadow-2xl transition-all duration-200 ${
          visible ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-4 opacity-0"
        }`}
        style={{ background: "#302E2B" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#4a4845]">
          <h2 id="create-lobby-title" className="text-lg font-bold text-[#f0ede8] tracking-wide">
            Create Private Game
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-[#8c8885] hover:text-[#f0ede8] transition-colors disabled:opacity-40 p-1 rounded"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-5" noValidate>

          {/* Nickname */}
          <div>
            <label className="block text-sm font-medium text-[#b0aca8] mb-1.5">
              Nickname <span className="text-[#6b6966] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (errors.nickname) setErrors((prev) => ({ ...prev, nickname: null }));
              }}
              maxLength={21}
              placeholder="Enter your nickname"
              disabled={loading}
              className={`w-full bg-[#262421] border rounded-lg px-3 py-2 text-[#f0ede8] placeholder-[#5a5855] text-sm outline-none
                transition-colors focus:border-[#81b64c] disabled:opacity-50
                ${errors.nickname ? "border-red-500" : "border-[#4a4845]"}`}
            />
            <div className="flex justify-between mt-1">
              {errors.nickname
                ? <p className="text-xs text-red-400">{errors.nickname}</p>
                : <span />}
              <span className={`text-xs ml-auto ${nickname.length > 20 ? "text-red-400" : "text-[#6b6966]"}`}>
                {nickname.length}/20
              </span>
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-[#b0aca8] mb-2">Play as</label>
            <div className="flex gap-3">
              {colorBtn("white", "White", <WhiteKingIcon size={28} />)}
              {colorBtn(
                "random",
                "Random",
                <Shuffle size={22} className="text-[#b0aca8]" />
              )}
              {colorBtn("black", "Black", <BlackKingIcon size={28} />)}
            </div>
          </div>

          {/* Time Control */}
          <div>
            <label className="block text-sm font-medium text-[#b0aca8] mb-2 flex items-center gap-1.5">
              <Clock size={14} /> Time Control
            </label>

            {/* Category tabs */}
            <div className="flex gap-1 bg-[#262421] rounded-lg p-1 mb-3 flex-wrap">
              {TIME_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  disabled={loading}
                  className={`flex-1 min-w-[52px] text-xs font-medium py-1.5 px-2 rounded-md transition-all duration-150 cursor-pointer
                    ${timeCategory === cat
                      ? "bg-[#81b64c] text-white shadow"
                      : "text-[#8c8885] hover:text-[#f0ede8]"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Time chips */}
            {timeCategory !== "Custom" && (
              <div className="flex flex-wrap gap-2">
                {TIME_OPTIONS[timeCategory].map((opt) => {
                  const active = selectedTime?.label === opt.label;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      disabled={loading}
                      onClick={() => setSelectedTime(opt)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150 cursor-pointer
                        ${active
                          ? "border-[#81b64c] bg-[#81b64c]/20 text-[#81b64c]"
                          : "border-[#4a4845] bg-[#262421] text-[#b0aca8] hover:border-[#6b6966] hover:text-[#f0ede8]"
                        }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom inputs */}
            {timeCategory === "Custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#8c8885] mb-1">Minutes per side</label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={customMinutes}
                    onChange={(e) => {
                      setCustomMinutes(e.target.value);
                      setErrors((prev) => ({ ...prev, customMinutes: null }));
                    }}
                    disabled={loading}
                    className={`w-full bg-[#262421] border rounded-lg px-3 py-2 text-[#f0ede8] text-sm outline-none
                      transition-colors focus:border-[#81b64c] disabled:opacity-50
                      ${errors.customMinutes ? "border-red-500" : "border-[#4a4845]"}`}
                  />
                  {errors.customMinutes && (
                    <p className="text-xs text-red-400 mt-1">{errors.customMinutes}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-[#8c8885] mb-1">Increment (seconds)</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={customIncrement}
                    onChange={(e) => {
                      setCustomIncrement(e.target.value);
                      setErrors((prev) => ({ ...prev, customIncrement: null }));
                    }}
                    disabled={loading}
                    className={`w-full bg-[#262421] border rounded-lg px-3 py-2 text-[#f0ede8] text-sm outline-none
                      transition-colors focus:border-[#81b64c] disabled:opacity-50
                      ${errors.customIncrement ? "border-red-500" : "border-[#4a4845]"}`}
                  />
                  {errors.customIncrement && (
                    <p className="text-xs text-red-400 mt-1">{errors.customIncrement}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all duration-150
                ${loading
                  ? "bg-[#81b64c]/50 text-white/50 cursor-not-allowed"
                  : "bg-[#81b64c] hover:bg-[#8fc954] text-white shadow-md hover:shadow-[#81b64c]/30 hover:shadow-lg active:scale-[0.98]"
                }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Creating…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  Create Game <ChevronRight size={16} />
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full py-2 rounded-lg text-sm font-medium text-[#8c8885] hover:text-[#f0ede8]
                bg-transparent hover:bg-[#4a4845]/40 transition-all duration-150 disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLobbyModal;
