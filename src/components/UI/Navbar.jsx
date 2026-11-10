import React from 'react';
import { Link } from 'react-router-dom';
import { Volume2, VolumeX, ShieldCheck, Github } from 'lucide-react';
import { useSound } from '../../hooks/useSound';

const Navbar = () => {
  const { soundEnabled, toggleSound } = useSound();

  return (
    <header className="h-14 border-b border-[#302E2B] bg-[#161512] px-4 md:px-8 flex items-center justify-between select-none sticky top-0 z-40">
      {/* Brand */}
      <Link to="/" className="flex items-center gap-2.5 group">
        <div className="w-8 h-8 rounded bg-[#81B64C] flex items-center justify-center font-bold text-black shadow-md group-hover:scale-105 transition-transform">
          <svg
            className="w-5 h-5 fill-current"
            viewBox="0 0 24 24"
          >
            <path d="M19 22H5v-2h14v2M17.5 10c0-1.88-1.29-3.46-3.04-3.89-.15-.49-.39-.93-.7-1.31C14.73 3.92 16 2.5 16 2H8s.5 2.5 1.5 3.5c-.32.38-.56.82-.71 1.31C7.04 6.54 5.75 8.12 5.75 10c0 .94.33 1.8.88 2.48l1.4 1.76c.45.56.72 1.25.72 1.97V18h6.5v-1.79c0-.72.27-1.41.72-1.97l1.4-1.76c.55-.68.88-1.54.88-2.48z" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-white font-extrabold text-lg tracking-tight leading-none group-hover:text-[#81B64C] transition-colors">
            By One Dek
          </span>
          <span className="text-[10px] text-[#A8A8A8] font-medium tracking-wide">
            MULTIPLAYER
          </span>
        </div>
      </Link>

      {/* Nav Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        <Link
          to="/"
          className="text-xs sm:text-sm font-semibold text-[#A8A8A8] hover:text-white px-3 py-1.5 rounded-md hover:bg-[#262421] transition-colors"
        >
          Lobbies
        </Link>

        {/* Sound toggle */}
        <button
          onClick={toggleSound}
          className="p-2 rounded-lg text-[#A8A8A8] hover:text-white hover:bg-[#262421] transition-colors"
          title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-[#81B64C]" />
          ) : (
            <VolumeX className="w-4 h-4 text-red-400" />
          )}
        </button>

        {/* Status Pill */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] bg-[#262421] border border-[#302E2B] px-2.5 py-1 rounded-full text-[#A8A8A8]">
          <span className="w-2 h-2 rounded-full bg-[#81B64C] animate-pulse"></span>
          <span>Server Live</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
