import { useEffect, useRef, useState } from 'react';
import { Question } from '../services/gemini';
import { useFaceLandmarker, Team, Answer } from '../hooks/useFaceLandmarker';
import { cn } from '../utils';
import { Trophy, Clock, Volume2, Maximize, X, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameProps {
  questions: Question[];
  onEnd: () => void;
}

interface TeamState {
  questionIndex: number;
  frozenUntil: number | null;
  score: number;
}

function TeamAvatar({ team, stream, isFrozen, isTilting }: { team: Team, stream: MediaStream | null, isFrozen: boolean, isTilting: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const isBlue = team === 'blue';

  return (
    <div className={cn(
      "w-24 h-24 rounded-2xl overflow-hidden relative border-4 transition-all duration-300 shrink-0 bg-slate-800",
      isBlue ? "border-blue-500" : "border-red-500",
      isTilting && (isBlue ? "shadow-[0_0_20px_#3b82f6] scale-110" : "shadow-[0_0_20px_#ef4444] scale-110"),
      isFrozen && "border-cyan-300 shadow-[0_0_15px_#67e8f9]"
    )}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute top-0 h-full w-[200%] max-w-none object-cover scale-x-[-1]"
        style={{
          left: isBlue ? '0' : '-100%'
        }}
      />
      {isFrozen && (
        <div className="absolute inset-0 bg-blue-500/40 backdrop-blur-[2px] flex items-center justify-center z-10">
          <span className="text-3xl drop-shadow-md">❄️</span>
        </div>
      )}
    </div>
  );
}

export function Game({ questions, onEnd }: GameProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { players, isReady } = useFaceLandmarker(videoRef);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [tugScore, setTugScore] = useState(0); // -10 (Red wins) to +10 (Blue wins)
  
  const [blueState, setBlueState] = useState<TeamState>({ questionIndex: 0, frozenUntil: null, score: 0 });
  const [redState, setRedState] = useState<TeamState>({ questionIndex: 0, frozenUntil: null, score: 0 });
  
  const [winner, setWinner] = useState<Team | 'tie' | null>(null);

  // Setup webcam
  useEffect(() => {
    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: false,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing webcam", err);
      }
    }
    setupCamera();
  }, []);

  // Timer
  useEffect(() => {
    if (winner) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          endGame(tugScore);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [winner, tugScore]);

  const endGame = (finalScore: number) => {
    if (finalScore > 0) setWinner('blue');
    else if (finalScore < 0) setWinner('red');
    else setWinner('tie');
    
    if (finalScore !== 0) {
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.5 },
        colors: finalScore > 0 ? ['#3b82f6', '#60a5fa'] : ['#ef4444', '#f87171']
      });
    }
  };

  // Check win condition by tug score
  useEffect(() => {
    if (tugScore >= 10) endGame(10);
    else if (tugScore <= -10) endGame(-10);
  }, [tugScore]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech to avoid queue buildup
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.2;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Handle answers
  const handleAnswer = (team: Team, answer: Answer) => {
    if (!answer || winner) return;
    
    const now = Date.now();
    const state = team === 'blue' ? blueState : redState;
    const setState = team === 'blue' ? setBlueState : setRedState;
    
    if (state.frozenUntil && now < state.frozenUntil) return;
    
    const currentQuestion = questions[state.questionIndex % questions.length];
    
    if (answer === currentQuestion.correctAnswer) {
      // Correct
      setTugScore(prev => prev + (team === 'blue' ? 1 : -1));
      setState(prev => ({
        ...prev,
        questionIndex: prev.questionIndex + 1,
        score: prev.score + 1
      }));
      speak("Đúng rồi!");
    } else {
      // Incorrect -> Freeze for 3 seconds
      setState(prev => ({
        ...prev,
        frozenUntil: now + 3000
      }));
      speak("Sai rồi!");
    }
  };

  const lastAnswerTime = useRef<{ blue: number, red: number }>({ blue: 0, red: 0 });

  useEffect(() => {
    const now = Date.now();
    if (players.blue.selectedAnswer && now - lastAnswerTime.current.blue > 1500) {
      handleAnswer('blue', players.blue.selectedAnswer);
      lastAnswerTime.current.blue = now;
    }
    if (players.red.selectedAnswer && now - lastAnswerTime.current.red > 1500) {
      handleAnswer('red', players.red.selectedAnswer);
      lastAnswerTime.current.red = now;
    }
  }, [players.blue.selectedAnswer, players.red.selectedAnswer]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 100);
    return () => clearInterval(interval);
  }, []);

  const renderTeamArea = (team: Team) => {
    const state = team === 'blue' ? blueState : redState;
    const player = team === 'blue' ? players.blue : players.red;
    const isFrozen = state.frozenUntil !== null && Date.now() < state.frozenUntil;
    const question = questions[state.questionIndex % questions.length];

    const isBlue = team === 'blue';
    const bgColor = isBlue ? 'bg-[#111827]' : 'bg-[#b91c1c]';
    const borderColor = isBlue ? 'border-[#3b82f6]' : 'border-[#ef4444]';
    const titleColor = isBlue ? 'text-slate-600' : 'text-white';
    const scoreBg = isBlue ? 'bg-[#0f172a]' : 'bg-[#7f1d1d]';
    const scoreText = isBlue ? 'text-yellow-500' : 'text-yellow-400';

    return (
      <div className={cn(
        "flex-1 flex flex-col rounded-3xl border-4 p-6 relative overflow-hidden transition-all shadow-2xl",
        bgColor, borderColor
      )}>
        {/* Freeze Overlay */}
        {isFrozen && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <h2 className="text-5xl font-black text-red-500 mb-4 drop-shadow-md">Đóng Băng!</h2>
            <div className="text-8xl font-black text-white mb-2 drop-shadow-lg">
              {Math.ceil((state.frozenUntil! - Date.now()) / 1000)}
            </div>
            <p className="text-xl text-white font-bold tracking-wide">Phạt trả lời sai</p>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-6 z-30 relative">
          <div className="flex items-center gap-4">
            <TeamAvatar 
              team={team} 
              stream={stream} 
              isFrozen={isFrozen} 
              isTilting={!!player.selectedAnswer} 
            />
            <h2 className={cn("text-4xl font-black tracking-wide drop-shadow-sm", titleColor)}>
              {isBlue ? 'Đội Xanh' : 'Đội Đỏ'}
            </h2>
          </div>
          <div className={cn("text-5xl font-black px-6 py-2 rounded-2xl shadow-inner", scoreBg, scoreText)}>
            {state.score}
          </div>
        </div>

        {/* Question Card */}
        <div className={cn(
          "flex-1 flex flex-col items-center justify-center p-8 rounded-3xl mb-6 relative border border-white/10 shadow-lg z-10",
          isBlue ? "bg-[#1e293b]" : "bg-[#991b1b]"
        )}>
           <h3 className="text-3xl font-bold text-white text-center leading-relaxed">
             {question.text}
           </h3>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-4 z-10 relative">
          <div className={cn(
            "p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all relative overflow-hidden",
            player.selectedAnswer === 'A' ? "bg-green-100 scale-95 shadow-inner" : "bg-[#f1f5f9] shadow-[0_8px_0_#cbd5e1] active:translate-y-2 active:shadow-none"
          )}>
            <div className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-slate-500 text-white font-black flex items-center justify-center shadow-sm">A</div>
            <span className="text-3xl font-black text-slate-800 mt-4">{question.optionA}</span>
            <div className="mt-4 text-sm text-slate-500 font-bold uppercase tracking-wider">Nghiêng Trái</div>
          </div>

          <div className={cn(
            "p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all relative overflow-hidden",
            player.selectedAnswer === 'B' ? "bg-green-100 scale-95 shadow-inner" : "bg-[#f1f5f9] shadow-[0_8px_0_#cbd5e1] active:translate-y-2 active:shadow-none"
          )}>
            <div className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-slate-500 text-white font-black flex items-center justify-center shadow-sm">B</div>
            <span className="text-3xl font-black text-slate-800 mt-4">{question.optionB}</span>
            <div className="mt-4 text-sm text-slate-500 font-bold uppercase tracking-wider">Nghiêng Phải</div>
          </div>
        </div>
        
        {/* Player Presence Indicator */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          <div className={cn(
            "w-3 h-3 rounded-full",
            player.isPresent ? "bg-green-400 shadow-[0_0_10px_#4ade80]" : "bg-slate-600"
          )} />
        </div>
      </div>
    );
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#1e1b2e] overflow-hidden flex flex-col font-sans p-6 gap-6">
      {/* Background Video (Mirrored) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover opacity-10 scale-x-[-1] pointer-events-none"
      />

      {/* Header */}
      <div className="z-30 flex justify-between items-center px-4">
        <h1 className="text-5xl font-black text-yellow-400 tracking-wider drop-shadow-md">ôn tập</h1>
        
        <div className="bg-[#111827] px-8 py-3 rounded-full border-2 border-slate-700 flex items-center gap-4 shadow-xl">
          <Clock className="w-8 h-8 text-white" />
          <span className="text-5xl font-black text-white tracking-widest">
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>
        
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#111827] border border-slate-600 rounded-xl text-white font-bold hover:bg-slate-800 transition-colors">
            <Volume2 className="w-5 h-5" />
            Tắt Âm
          </button>
          <button onClick={toggleFullscreen} className="flex items-center gap-2 px-4 py-2 bg-[#111827] border border-slate-600 rounded-xl text-white font-bold hover:bg-slate-800 transition-colors">
            <Maximize className="w-5 h-5" />
            Toàn Màn Hình
          </button>
          <button onClick={onEnd} className="flex items-center gap-2 px-4 py-2 bg-[#111827] border border-slate-600 rounded-xl text-white font-bold hover:bg-slate-800 transition-colors">
            Thoát
          </button>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex z-10 gap-6">
        {renderTeamArea('blue')}
        
        {/* Center Divider & Tug of War */}
        <div className="w-1/3 bg-slate-50 rounded-3xl relative overflow-hidden shadow-2xl">
          {/* Dashed Center Line */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0 border-l-[6px] border-dashed border-green-500" />
          
          {/* Rope */}
          <div className="absolute left-0 right-0 h-3 bg-[#8B4513] top-1/2 -translate-y-1/2 shadow-sm" />
          
          {/* Tug Indicator (Ribbon) */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-300 ease-out text-7xl drop-shadow-xl z-10"
            style={{
              left: `calc(50% - 35px - ${(tugScore / 10) * 40}%)`
            }}
          >
            🎀
          </div>
          
          {/* Cute characters pulling */}
          <div className="absolute top-1/2 -translate-y-1/2 left-8 text-7xl -scale-x-100 drop-shadow-lg">🏃‍♂️</div>
          <div className="absolute top-1/2 -translate-y-1/2 right-8 text-7xl drop-shadow-lg">🏃‍♀️</div>
        </div>

        {renderTeamArea('red')}
      </div>

      {/* Winner Overlay */}
      {winner && (
        <div className="absolute inset-0 z-50 bg-[#1e1b2e]/95 backdrop-blur-md flex flex-col items-center justify-center">
          <Trophy className={cn(
            "w-40 h-40 mb-8 drop-shadow-2xl",
            winner === 'blue' ? "text-blue-500" : winner === 'red' ? "text-red-500" : "text-yellow-400"
          )} />
          <h1 className="text-7xl font-black text-white uppercase tracking-widest mb-8 drop-shadow-lg">
            {winner === 'tie' ? "Hòa Nhau!" : `Đội ${winner === 'blue' ? 'Xanh' : 'Đỏ'} Chiến Thắng!`}
          </h1>
          <button
            onClick={onEnd}
            className="px-12 py-6 bg-yellow-400 text-slate-900 text-2xl font-black rounded-2xl hover:bg-yellow-300 transition-colors shadow-[0_8px_0_#ca8a04] active:translate-y-2 active:shadow-none"
          >
            Chơi Lại
          </button>
        </div>
      )}
    </div>
  );
}
