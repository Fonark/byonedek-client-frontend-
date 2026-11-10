import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-20 h-20 rounded-2xl bg-[#262421] border border-[#302E2B] flex items-center justify-center mb-6 text-5xl shadow-2xl">
        ♟️
      </div>
      <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
        404 - Page Not Found
      </h1>
      <p className="text-sm text-[#A8A8A8] max-w-sm mb-6">
        The chess lobby or page you are looking for does not exist or the match has expired.
      </p>
      <Link
        to="/"
        className="flex items-center gap-2 bg-[#81B64C] hover:bg-[#81B64C]/90 text-black font-bold px-5 py-2.5 rounded-lg shadow-lg transition-transform hover:scale-105"
      >
        <Home className="w-4 h-4" />
        Return to Home
      </Link>
    </div>
  );
};

export default NotFoundPage;
