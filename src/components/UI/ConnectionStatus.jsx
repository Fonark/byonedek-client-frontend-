import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

const ConnectionStatus = ({ isConnected = true, opponentConnected = true }) => {
  return (
    <div className="flex items-center gap-3 text-xs bg-[#262421]/90 border border-[#302E2B] px-3 py-1.5 rounded-lg select-none">
      {/* Self Connection */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-[#81B64C]' : 'bg-red-500 animate-pulse'
          }`}
        />
        <span className="text-[#A8A8A8]">
          {isConnected ? 'Connected' : 'Offline'}
        </span>
      </div>

      <div className="w-[1px] h-3 bg-[#403E3A]" />

      {/* Opponent Connection */}
      <div className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            opponentConnected ? 'bg-[#81B64C]' : 'bg-amber-500 animate-pulse'
          }`}
        />
        <span className="text-[#A8A8A8]">
          {opponentConnected ? 'Opponent Online' : 'Opponent Disconnected'}
        </span>
      </div>
    </div>
  );
};

export default ConnectionStatus;
