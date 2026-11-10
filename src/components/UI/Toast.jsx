import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ message, type = 'info', onClose }) => {
  if (!message) return null;

  const bgStyles = {
    success: 'bg-[#262421] border-[#81B64C] text-[#81B64C]',
    error: 'bg-[#262421] border-red-500 text-red-400',
    info: 'bg-[#262421] border-blue-500 text-blue-400',
  }[type] || 'bg-[#262421] border-[#302E2B] text-white';

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 shrink-0 text-[#81B64C]" />,
    error: <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />,
    info: <Info className="w-4 h-4 shrink-0 text-blue-400" />,
  };

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl animate-slide-in ${bgStyles}`}
    >
      {icons[type]}
      <span className="text-sm font-medium text-white">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="text-[#A8A8A8] hover:text-white ml-2 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Toast;
