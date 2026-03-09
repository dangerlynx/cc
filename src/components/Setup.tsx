import { useState } from 'react';
import { generateQuestions, Question } from '../services/gemini';
import { Loader2, Play, Sparkles } from 'lucide-react';

interface SetupProps {
  onStart: (questions: Question[]) => void;
}

export function Setup({ onStart }: SetupProps) {
  const [topic, setTopic] = useState('Khoa học tự nhiên');
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = async () => {
    setIsLoading(true);
    const questions = await generateQuestions(topic, 10);
    setIsLoading(false);
    if (questions.length > 0) {
      onStart(questions);
    } else {
      alert("Failed to generate questions. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1e1b2e] text-white p-8 font-sans relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-10 left-10 text-6xl opacity-20 rotate-12">🏃‍♂️</div>
      <div className="absolute bottom-10 right-10 text-6xl opacity-20 -rotate-12">🏃‍♀️</div>
      <div className="absolute top-20 right-20 text-6xl opacity-20 rotate-45">🎀</div>
      <div className="absolute bottom-20 left-20 text-6xl opacity-20 -rotate-45">🏆</div>

      <div className="max-w-md w-full bg-[#111827] rounded-[2rem] p-8 shadow-2xl border-4 border-slate-700 relative z-10">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-yellow-400 p-4 rounded-3xl shadow-[0_6px_0_#ca8a04] rotate-3">
            <Sparkles className="w-10 h-10 text-slate-900" />
          </div>
        </div>
        
        <h1 className="text-4xl font-black text-center mb-2 text-yellow-400 drop-shadow-md">Cuộc Chiến<br/>Nghiêng Đầu</h1>
        <p className="text-slate-400 text-center mb-8 font-bold">Head Tilt Tug-of-War</p>

        <div className="space-y-6">
          <div>
            <label className="block text-lg font-bold text-slate-300 mb-3">
              Chủ đề câu hỏi:
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-[#1e293b] border-4 border-slate-600 rounded-2xl px-6 py-4 text-white text-xl font-bold focus:outline-none focus:border-yellow-400 transition-all shadow-inner"
              placeholder="VD: Lịch sử, Toán học..."
            />
          </div>

          <button
            onClick={handleStart}
            disabled={isLoading || !topic.trim()}
            className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none text-slate-900 font-black text-2xl py-5 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_8px_0_#ca8a04] active:translate-y-2 active:shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin" />
                Đang tạo...
              </>
            ) : (
              <>
                <Play className="w-8 h-8 fill-slate-900" />
                BẮT ĐẦU
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
