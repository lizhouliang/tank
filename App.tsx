
import React, { useState, useEffect, useCallback } from 'react';
import GameEngine from './components/GameEngine';
import { generateMission } from './services/geminiService';
import { Mission } from './types';

const App: React.FC = () => {
  const [level, setLevel] = useState(1);
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'START' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('START');
  const [score, setScore] = useState(0);

  const startNextLevel = useCallback(async (isInitial = false) => {
    setLoading(true);
    setStatus('PLAYING'); // Optimistic or set during loading
    const nextLevel = isInitial ? 1 : level + 1;
    if (!isInitial) setLevel(nextLevel);
    
    try {
      const newMission = await generateMission(nextLevel);
      setMission(newMission);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, [level]);

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    setStatus('GAMEOVER');
  };

  const handleVictory = (finalScore: number) => {
    setScore(finalScore);
    setStatus('VICTORY');
  };

  const resetGame = () => {
    setLevel(1);
    setScore(0);
    setMission(null);
    setStatus('START');
  };

  if (status === 'START') {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl md:text-6xl text-green-400 mb-8 text-center animate-pulse">
          GEMINI TANK COMMANDER
        </h1>
        <div className="bg-neutral-800 p-8 rounded-lg retro-border max-w-lg w-full">
          <p className="text-sm md:text-base mb-6 leading-loose">
            Prepare for strategic armored combat. AI-generated missions await your command.
          </p>
          <button 
            onClick={() => startNextLevel(true)}
            className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-4 px-8 rounded transition-transform transform hover:scale-105"
          >
            INITIALIZE MISSION
          </button>
        </div>
        <div className="mt-8 text-neutral-500 text-[10px] uppercase">
          &copy; 2025 AI Combat Sim v3.0
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4">
        <div className="text-green-400 text-2xl mb-8 animate-bounce">GENERIC MISSION BRIEFING...</div>
        <div className="w-64 h-2 bg-neutral-700 rounded-full overflow-hidden">
          <div className="h-full bg-green-400 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
        </div>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(250%); }
          }
        `}</style>
      </div>
    );
  }

  if (status === 'GAMEOVER') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-red-500">
        <h2 className="text-5xl mb-4">MISSION FAILED</h2>
        <p className="text-xl mb-8">FINAL SCORE: {score}</p>
        <div className="space-x-4">
          <button 
            onClick={() => startNextLevel(true)}
            className="bg-red-600 text-white px-6 py-3 rounded hover:bg-red-700 font-bold"
          >
            RETRY
          </button>
          <button 
            onClick={resetGame}
            className="border border-red-600 px-6 py-3 rounded hover:bg-red-900 transition-colors"
          >
            QUIT
          </button>
        </div>
      </div>
    );
  }

  if (status === 'VICTORY') {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4 text-green-400">
        <h2 className="text-5xl mb-4">VICTORY</h2>
        <p className="text-xl mb-8">LEVEL {level} COMPLETE</p>
        <p className="text-lg mb-8">SCORE: {score}</p>
        <button 
          onClick={() => startNextLevel()}
          className="bg-green-600 text-black px-12 py-4 rounded font-bold hover:bg-green-500 transition-transform transform hover:scale-105"
        >
          NEXT MISSION
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center py-8">
      {mission && (
        <div className="w-full max-w-[800px] flex flex-col md:flex-row gap-8 px-4">
          <div className="flex-1">
            <GameEngine 
              mission={mission} 
              onGameOver={handleGameOver} 
              onVictory={handleVictory} 
            />
          </div>
          <div className="w-full md:w-64 bg-neutral-800 p-4 rounded retro-border h-fit">
            <h3 className="text-green-400 text-sm mb-4 border-b border-green-900 pb-2">BRIEFING</h3>
            <h4 className="text-white text-[12px] mb-2">{mission.name}</h4>
            <p className="text-neutral-400 text-[10px] leading-relaxed mb-4">
              {mission.description}
            </p>
            <div className="mt-6">
              <h5 className="text-xs text-green-700 mb-2">OBJECTIVE</h5>
              <ul className="text-[10px] text-neutral-300 space-y-2">
                <li>• ELIMINATE {mission.enemyCount} TANKS</li>
                <li>• DEFEND THE BASE</li>
              </ul>
            </div>
            <button 
              onClick={resetGame}
              className="mt-8 w-full text-[10px] text-red-400 hover:text-red-300 underline"
            >
              ABORT MISSION
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
