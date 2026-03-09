import { useState } from 'react';
import { Setup } from './components/Setup';
import { Game } from './components/Game';
import { LiveHost } from './components/LiveHost';
import { Question } from './services/gemini';

export default function App() {
  const [gameState, setGameState] = useState<'setup' | 'playing'>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);

  const handleStart = (generatedQuestions: Question[]) => {
    setQuestions(generatedQuestions);
    setGameState('playing');
  };

  const handleEnd = () => {
    setGameState('setup');
    setQuestions([]);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {gameState === 'setup' ? (
        <Setup onStart={handleStart} />
      ) : (
        <Game questions={questions} onEnd={handleEnd} />
      )}
      
      <LiveHost />
    </div>
  );
}

