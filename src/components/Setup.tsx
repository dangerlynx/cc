import { useState, useRef, ChangeEvent } from 'react';
import { generateQuestions, Question } from '../services/gemini';
import { Loader2, Play, Sparkles, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface SetupProps {
  onStart: (questions: Question[]) => void;
}

export function Setup({ onStart }: SetupProps) {
  const [topic, setTopic] = useState('Khoa học tự nhiên');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        let startIndex = 0;
        if (data.length > 0 && (data[0][0] === 'Câu hỏi' || data[0][0] === 'Question')) {
          startIndex = 1;
        }

        const parsedQuestions: Question[] = [];
        for (let i = startIndex; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length < 4) continue;
          
          const text = row[0]?.toString().trim();
          const optionA = row[1]?.toString().trim();
          const optionB = row[2]?.toString().trim();
          let correctAnswer = row[3]?.toString().trim().toUpperCase();

          if (text && optionA && optionB && (correctAnswer === 'A' || correctAnswer === 'B')) {
            parsedQuestions.push({
              id: `excel-q-${i}-${Date.now()}`,
              text,
              optionA,
              optionB,
              correctAnswer: correctAnswer as 'A' | 'B'
            });
          }
        }

        if (parsedQuestions.length > 0) {
          alert(`Đã nạp thành công ${parsedQuestions.length} câu hỏi`);
          onStart(parsedQuestions);
        } else {
          alert("Không tìm thấy câu hỏi hợp lệ trong file. Vui lòng kiểm tra lại định dạng.");
        }
      } catch (error) {
        console.error(error);
        alert("Đã xảy ra lỗi khi đọc file Excel.");
      }
      
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Câu hỏi', 'Đáp án A', 'Đáp án B', 'Đáp án đúng (A/B)'],
      ['Thủ đô của Việt Nam là gì?', 'Hà Nội', 'TP. Hồ Chí Minh', 'A'],
      ['1 + 1 bằng mấy?', '3', '2', 'B']
    ]);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 40 }, // Câu hỏi
      { wch: 20 }, // Đáp án A
      { wch: 20 }, // Đáp án B
      { wch: 20 }  // Đáp án đúng
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Mau_Cau_Hoi_Nghieng_Dau.xlsx');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1e1b2e] text-white p-8 font-sans relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-10 left-10 text-6xl opacity-20 rotate-12">🏃‍♂️</div>
      <div className="absolute bottom-10 right-10 text-6xl opacity-20 -rotate-12">🏃‍♀️</div>
      <div className="absolute top-20 right-20 text-6xl opacity-20 rotate-45">🎀</div>
      <div className="absolute bottom-20 left-20 text-6xl opacity-20 -rotate-45">🏆</div>

      <div className="max-w-xl w-full bg-[#111827] rounded-[2rem] p-8 shadow-2xl border-4 border-slate-700 relative z-10">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-yellow-400 p-4 rounded-3xl shadow-[0_6px_0_#ca8a04] rotate-3">
            <Sparkles className="w-10 h-10 text-slate-900" />
          </div>
        </div>
        
        <h1 className="text-4xl font-black text-center mb-2 text-yellow-400 drop-shadow-md">Cuộc Chiến<br/>Nghiêng Đầu</h1>
        <p className="text-slate-400 text-center mb-8 font-bold">Head Tilt Tug-of-War</p>

        <div className="space-y-8">
          {/* AI Generation Section */}
          <div className="bg-[#1e293b] p-6 rounded-2xl border-2 border-slate-600">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              Tạo câu hỏi tự động bằng AI
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-2">
                  Chủ đề câu hỏi:
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-[#0f172a] border-2 border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-yellow-400 transition-all shadow-inner"
                  placeholder="VD: Lịch sử, Toán học..."
                />
              </div>

              <button
                onClick={handleStart}
                disabled={isLoading || !topic.trim()}
                className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none text-slate-900 font-black text-xl py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-[0_6px_0_#ca8a04] active:translate-y-2 active:shadow-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 fill-slate-900" />
                    BẮT ĐẦU VỚI AI
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-px bg-slate-700 flex-1"></div>
            <span className="text-slate-500 font-bold uppercase text-sm">Hoặc</span>
            <div className="h-px bg-slate-700 flex-1"></div>
          </div>

          {/* Excel Import Section */}
          <div className="bg-[#1e293b] p-6 rounded-2xl border-2 border-slate-600">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-green-400" />
              Nhập câu hỏi từ Excel
            </h2>
            
            <div className="space-y-4">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-green-500 hover:bg-green-400 text-white font-black text-xl py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-[0_6px_0_#16a34a] active:translate-y-2 active:shadow-none"
              >
                <Upload className="w-6 h-6" />
                CHỌN FILE EXCEL
              </button>

              <div className="flex justify-between items-center mt-4">
                <p className="text-xs text-slate-400">
                  Cột: Câu hỏi | Đáp án A | Đáp án B | Đáp án đúng (A/B)
                </p>
                <button
                  onClick={downloadTemplate}
                  className="text-sm text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Tải file mẫu
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
