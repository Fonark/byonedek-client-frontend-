import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { GameProvider } from './context/GameContext';
import { SoundProvider } from './context/SoundContext';
import Navbar from './components/UI/Navbar';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <SocketProvider>
      <GameProvider>
        <SoundProvider>
          <Router>
            <div className="min-h-screen bg-[#161512] text-white flex flex-col font-sans antialiased selection:bg-[#81B64C] selection:text-black">
              <Navbar />
              <main className="flex-1 flex flex-col">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/game/:lobbyId" element={<GamePage />} />
                  <Route path="/lobby/:lobbyId" element={<GamePage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </main>
            </div>
          </Router>
        </SoundProvider>
      </GameProvider>
    </SocketProvider>
  );
}

export default App;
