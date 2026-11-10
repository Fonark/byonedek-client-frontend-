import React from 'react';

const LoadingSpinner = ({ message = 'Loading...', size = 'md' }) => {
  const sizeMap = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 gap-3 select-none">
      <div
        className={`${sizeMap[size] || sizeMap.md} rounded-full border-t-transparent border-[#81B64C] animate-spin`}
      />
      {message && <p className="text-sm font-medium text-[#A8A8A8]">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
