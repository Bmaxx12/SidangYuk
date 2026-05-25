import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { LECTURERS } from '../data/lecturers';
import { detectFillers, calculateWpms, getSpeedCategory } from '../lib/speech';
import { 
  Mic, MicOff, Volume2, Send, Clock, User, AlertOctagon, HelpCircle, AlertTriangle, Play, CheckCircle2, 
  MessageSquare, Loader2, Sparkles, ChevronRight, Keyboard
} from 'lucide-react';

interface SidangViewProps {
  userId: string;
  sessionId: string;
  sessionData: any;
  onFinished: (verdictId: string, resultData: any) => void;
}

// Indonesian University specific funny loading sentences list
const LOADING_MESSAGES = [
  "Dosen sedang mengernyitkan dahi...",
  "Dosen sedang memarahi mahasiswa bimbingan lain...",
  "Mencocokkan jawaban dengan buku teori cetakan 1998...",
  "Dosen sedang menyeruput kopi hitam hangat...",
  "Dosen menatap tajam ke arah lembar naskah Anda...",
  "Membuka kembali lembar pedoman kelulusan kampus...",
  "Dosen sedang mencatat poin kelalaian Anda di binder...",
  "Membaca ulang slide teori utama penelitian..."
];

const getRandomReaction = (type: string, lecturerName: string): string => {
  const reactions: Record<string, string[]> = {
    silent_medium: [
      `${lecturerName} melirik jam tangannya gundah...`,
      "Mengapa terdiam? Penjelasan Anda terputus.",
      "Ayo berikan argumentasi logis Anda.",
      "Kenapa hening? Belum siap menjawab ya?"
    ],
    silent_high: [
      `${lecturerName} mengetuk-ngetuk bolpoin dengan tak sabar!`,
      "Saya sedang menguji Anda, tolong jangan diam membisu!",
      "Jika kurang menguasai, jangan membuang waktu sidang.",
      "Apakah ini skripsi buatan joki sehingga Anda terdiam begini?"
    ],
    filler_medium: [
      "Tolong fokus, batasi gumaman 'ee/aa' tersebut.",
      "Penjelasan Anda terdengar samar karena penuh keraguan."
    ],
    filler_high: [
      `${lecturerName} menggelengkan kepala meragukan orisinalitas riset Anda!`,
      "Bisa jelaskan tanpa mendengung 'ee/aa' terus menerus?!",
      "Argumentasi Anda berputar-putar tak terarah."
    ],
    fluent: [
      "Dosen menyimak dengan saksama penjelasan ilmiah Anda.",
      "Mulai menulis garis bawah pada naskah ujian...",
      "Penjelasan berjalan lancar dan mengena sasaran."
    ]
  };

  const list = reactions[type] || reactions.fluent;
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
};

export default function SidangView({ userId, sessionId, sessionData, onFinished }: SidangViewProps) {
  // Simulator state
  const [currentQuestionsList, setCurrentQuestionsList] = useState<any[]>([]);
  const [currentQuestionText, setCurrentQuestionText] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // 1-5 progress
  const [phase, setPhase] = useState<'fetch-question' | 'answering' | 'analyzing' | 'critique'>('fetch-question');
  
  // Follow up counters
  const [isFollowupMode, setIsFollowupMode] = useState(false);
  const [followupCount, setFollowupCount] = useState(0); // limit to max 2 in a session to keep it fast
  const [dosenStatusText, setDosenStatusText] = useState('Sedang mempersiapkan pertanyaan...');

  // Answering states
  const [transcript, setTranscript] = useState('');
  const [manualText, setManualText] = useState('');
  const [useKeyboardInput, setUseKeyboardInput] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);
  const [durationUsed, setDurationUsed] = useState(0);

  // Stats
  const [fillerCount, setFillerCount] = useState(0);
  const [fillerWords, setFillerWords] = useState<Record<string, number>>({});
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null); // from analyze-answer
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  // Dynamic Stress Model (Stress Meter)
  const [tension, setTension] = useState(30);
  const [liveReaction, setLiveReaction] = useState('Suasana sidang kondusif. Penguji siap mendengar pemaparan lisan Anda.');
  const lastChangeTimeRef = useRef<number>(Date.now());
  const prevFillerCountRef = useRef<number>(0);

  // Refs for audio player and Web Speech
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordingRef = useRef(false);
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeLecturer = sessionData.customLecturer || LECTURERS.find(l => l.id === sessionData.dosenType) || LECTURERS[0];

  // TTS Easter egg: Speaking lecturer question
  const speakQuestion = (text: string) => {
    if ('speechSynthesis' in window) {
      // stop any existing speech
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      
      // Try to find an Indonesian voice if available
      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(voice => voice.lang.includes('id') || voice.lang.includes('ID'));
      if (idVoice) {
         utterance.voice = idVoice;
      }
      
      // Speed adjustments based on Dosen Type
      if (sessionData.dosenType === 'filosof') {
        utterance.rate = 0.8; // talk slow
      } else if (sessionData.dosenType === 'perfeksionis' || activeLecturer.difficulty === 'Sangat Tinggi') {
        utterance.rate = 1.05; // rapid and aggressive
      } else {
        utterance.rate = 0.95;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // On initial mount / advance, generate the question
  useEffect(() => {
    if (phase === 'fetch-question') {
      generateQuestion();
    }
  }, [currentQuestionIndex, phase]);

  // Loading text cycler
  useEffect(() => {
    if (phase === 'analyzing') {
      loadingIntervalRef.current = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
    } else {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    }
    return () => {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
      }
    };
  }, [phase]);

  // Countdown timer effect
  useEffect(() => {
    if (isRecording && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
        setDurationUsed(prev => prev + 1);
      }, 1000);
    } else if (isRecording && timeLeft === 0) {
      stopSpeechRecording();
      handleSubmitAnswer();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isRecording, timeLeft]);

  // Reset tension metrics on question changes or entering answering phase
  useEffect(() => {
    if (phase === 'answering') {
      setTension(30);
      setLiveReaction('Suasana sidang kondusif. Penguji menanti argumentasi lisan/keyboard Anda.');
      lastChangeTimeRef.current = Date.now();
      prevFillerCountRef.current = 0;
    }
  }, [phase, currentQuestionIndex]);

  // Keep tracking input activity (silence/inactive trigger)
  useEffect(() => {
    lastChangeTimeRef.current = Date.now();
  }, [transcript, manualText]);

  // Monitor filler words spikes real-time
  useEffect(() => {
    if (phase === 'answering' && fillerCount > prevFillerCountRef.current) {
      const delta = fillerCount - prevFillerCountRef.current;
      prevFillerCountRef.current = fillerCount;

      setTension(prev => {
        const next = Math.min(100, prev + (delta * 9)); // Spike stress on verbal fillers!
        if (next >= 75) {
          setLiveReaction(getRandomReaction('filler_high', activeLecturer.name));
        } else if (next >= 45) {
          setLiveReaction(getRandomReaction('filler_medium', activeLecturer.name));
        }
        return next;
      });
    }
  }, [fillerCount, phase, activeLecturer.name]);

  // Real-time Stress Meter ticking interval
  useEffect(() => {
    if (phase !== 'answering') return;

    const stressInterval = setInterval(() => {
      setTension(prev => {
        const now = Date.now();
        const secondsOfInactivity = (now - lastChangeTimeRef.current) / 1000;

        let val = prev;
        if (secondsOfInactivity > 5) {
          // Increase stress: student is silent/stuck (terlalu lama terdiam)
          val += 4;
          if (val >= 75) {
            setLiveReaction(getRandomReaction('silent_high', activeLecturer.name));
          } else if (val >= 45) {
            setLiveReaction(getRandomReaction('silent_medium', activeLecturer.name));
          }
        } else {
          // Decay stress smoothly when speaking continuously or typing (rewards confidence!)
          if (isRecording || (useKeyboardInput && manualText.trim().length > 0)) {
            val = Math.max(15, val - 1);
            if (val < 40) {
              setLiveReaction(getRandomReaction('fluent', activeLecturer.name));
            }
          }
        }
        return Math.min(100, val);
      });
    }, 1000);

    return () => clearInterval(stressInterval);
  }, [phase, isRecording, useKeyboardInput, activeLecturer.name, manualText]);

  // Handle Speech Recognition Initiation
  const startSpeechRecording = () => {
    setTranscript('');
    setFillerCount(0);
    setFillerWords({});
    setTimeLeft(90);
    setDurationUsed(0);
    setIsRecording(true);
    isRecordingRef.current = true;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Browser doesn't support Web Speech. Let them use keyboard backup
      setUseKeyboardInput(true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'id-ID';

    recognition.onresult = (event: any) => {
      let currentResult = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentResult += event.results[i][0].transcript;
      }

      setTranscript(currentResult);

      // detect fillers real-time
      const analysis = detectFillers(currentResult);
      setFillerCount(analysis.total);
      setFillerWords(analysis.breakdown);
    };

    recognition.onerror = (e: any) => {
      console.warn('Speech Recognition error occurred:', e);
      if (e.error === 'not-allowed') {
        alert('Izin mikrofon ditolak. Anda bisa menjawab menggunakan keyboard.');
        setUseKeyboardInput(true);
      }
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        // restart if user didn't explicitly finish
        try {
          recognition.start();
        } catch (err) {
          console.warn("Failed to restart speech listener:", err);
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setDosenStatusText('Sedang antusias mendengarkan Anda...');
  };

  const stopSpeechRecording = () => {
    setIsRecording(false);
    isRecordingRef.current = false;
    setDosenStatusText('Mencatat dan mencerna jawaban Anda...');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping Speech recognition:", e);
      }
    }
  };

  // Web API Calls
  const generateQuestion = async () => {
    setDosenStatusText('Sedang merumuskan pertanyaan baru...');
    try {
      const response = await fetch('/api/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judul: sessionData.judul,
          abstrak: sessionData.abstrak,
          dosenType: sessionData.dosenType,
          customLecturer: sessionData.customLecturer,
          currentQuestions: currentQuestionsList
        })
      });

      const data = await response.json();
      if (data.isFallback) {
        setIsFallbackMode(true);
      }
      if (data.questionText) {
        setCurrentQuestionText(data.questionText);
        setPhase('answering');
        setDosenStatusText('Menanti jawaban suara Anda...');
        // Speak using TTS
        setTimeout(() => speakQuestion(data.questionText), 400);
      } else {
        throw new Error('Gagal merumuskan pertanyaan');
      }
    } catch (err) {
      console.error(err);
      setDosenStatusText('Gagal merumuskan pertanyaan. Mencoba kembali...');
      setTimeout(generateQuestion, 3000);
    }
  };

  const handleSubmitAnswer = async () => {
    stopSpeechRecording();
    setPhase('analyzing');

    const finalAnswerText = useKeyboardInput ? manualText : transcript;
    const finalWords = finalAnswerText.split(/\s+/).filter(Boolean).length;
    const wpm = calculateWpms(finalWords, durationUsed);

    // Playful speed check: if answered in under 8 seconds with very few words, spike tension!
    let finalTension = tension;
    if (durationUsed < 8 && finalWords < 12 && finalAnswerText.trim().length > 0) {
      finalTension = Math.min(100, tension + 35);
      setTension(finalTension);
    }

    try {
      const response = await fetch('/api/analyze-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judul: sessionData.judul,
          abstrak: sessionData.abstrak,
          dosenType: sessionData.dosenType,
          customLecturer: sessionData.customLecturer,
          questionText: currentQuestionText,
          transcript: finalAnswerText,
          wpm,
          fillerCount,
          isFollowup: isFollowupMode,
          tension: Math.round(finalTension)
        })
      });

      const data = await response.json();
      if (data.isFallback) {
        setIsFallbackMode(true);
      }
      setCurrentAnalysis(data);

      // Capture and Save question & answer document to Firestore
      const questionId = `q_${Date.now()}`;
      const questionDoc = {
        id: questionId,
        sessionId,
        orderNum: currentQuestionIndex + 1,
        questionText: currentQuestionText,
        isFollowup: isFollowupMode,
        transcript: finalAnswerText,
        wpm,
        fillerCount,
        fillerWords,
        tension: Math.round(finalTension),
        aiScore: data.aiScore,
        aiFeedback: data.aiFeedback
      };

      const questionRef = doc(db, 'sessions', sessionId, 'questions', questionId);
      await setDoc(questionRef, questionDoc);

      // Keep record in react list
      setCurrentQuestionsList(prev => [...prev, questionDoc]);

      setPhase('critique');
      setDosenStatusText('Memperhatikan jawaban Anda dengan saksama...');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `sessions/${sessionId}/questions`);
    }
  };

  const handleNextStep = () => {
    // Determine whether to do follow-up question or advance main question
    const checkFollowup = currentAnalysis?.shouldFollowup && followupCount < 2; // limit to maximum 2 follow-ups per session 

    if (checkFollowup) {
      // Enter Follow-up path
      setIsFollowupMode(true);
      setFollowupCount(prev => prev + 1);
      setCurrentQuestionText(currentAnalysis.followUpQuestion);
      
      // Clear answer states
      setTranscript('');
      setManualText('');
      setTimeLeft(90);
      setDurationUsed(0);
      setCurrentAnalysis(null);
      setPhase('answering');
      
      // Speak the follow up question
      setTimeout(() => speakQuestion(currentAnalysis.followUpQuestion), 400);
    } else {
      // Advance to next regular question (max 5 questions total)
      setIsFollowupMode(false);
      const nextIndex = currentQuestionIndex + 1;
      
      if (nextIndex >= 5) {
        // Completed all questions, generate final verdict report!
        handleGenerateFinalVerdict();
      } else {
        setCurrentQuestionIndex(nextIndex);
        setTranscript('');
        setManualText('');
        setTimeLeft(90);
        setDurationUsed(0);
        setCurrentAnalysis(null);
        setPhase('fetch-question');
      }
    }
  };

  const handleGenerateFinalVerdict = async () => {
    setPhase('analyzing');
    setDosenStatusText('Sedang merundingkan kelulusan Anda bersama tim penguji...');
    
    try {
      const response = await fetch('/api/generate-verdict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judul: sessionData.judul,
          abstrak: sessionData.abstrak,
          dosenType: sessionData.dosenType,
          customLecturer: sessionData.customLecturer,
          history: currentQuestionsList
        })
      });

      const data = await response.json();
      if (data.isFallback) {
        setIsFallbackMode(true);
      }
      
      // Save verdict document to Firestore
      const verdictId = `v_${Date.now()}`;
      const verdictData = {
        id: verdictId,
        sessionId,
        ...data
      };
      
      const verdictRef = doc(db, 'sessions', sessionId, 'verdicts', verdictId);
      await setDoc(verdictRef, verdictData);

      // Update session status to verdict
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, { status: 'verdict' });

      onFinished(verdictId, verdictData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `sessions/${sessionId}/verdicts`);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      {isFallbackMode && (
        <div className="mb-6 bg-amber-400 border-3 border-black p-4 rounded-2xl text-left shadow-[5px_5px_0px_rgba(0,0,0,1)] flex gap-3 animate-fade-in font-sans text-slate-950">
          <AlertTriangle className="w-5 h-5 text-slate-950 shrink-0 mt-0.5 stroke-[2.5]" />
          <div className="text-xs font-semibold leading-relaxed">
            <h4 className="font-black font-display text-[14px] uppercase tracking-wide text-slate-950">Mode Simulasi Cadangan Aktif</h4>
            <p className="mt-0.5 text-slate-900 text-[11px] font-bold">
              Layanan AI Utama sedang padat atau mencapai batas kuota gratis. Demi keasyikan sidang skripsi Anda, **Sidang.AI mengaktifkan kecerdasan simulasi cadangan lokal** yang disempurnakan penuh dengan karakter penguasaan unik dosen Anda! Pengalaman simulasi tetap berjalan 100% lancar, dinamis, dan interaktif.
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT: Core Lecturer Simulator Representation */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border-3 border-black p-5 rounded-2xl shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-between text-center min-h-[460px] text-slate-800">
            <div>
              <span className="text-[10px] font-mono font-black tracking-widest text-slate-600 uppercase bg-white px-3 py-1 border-2 border-black rounded-full shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                Penguji Utama Anda
              </span>
              
              {/* Dynamic Lecturer Character Expression */}
              <div className="relative my-6 select-none">
                {(() => {
                  const currentEmoji = (() => {
                    if (phase !== 'answering') return activeLecturer.avatar;
                    if (tension >= 75) {
                      if (activeLecturer.avatar === '👹') return '🔥';
                      if (activeLecturer.avatar === '👨‍🏫') return '🤬';
                      if (activeLecturer.avatar === '👩‍🏫') return '😤';
                      if (activeLecturer.avatar === '👴') return '💀';
                      if (activeLecturer.avatar === '🦉') return '⚡';
                      return '🤬';
                    }
                    if (tension >= 45) {
                      return '🧐';
                    }
                    return activeLecturer.avatar;
                  })();

                  // Construct dynamic styles and animations
                  let containerAnimate: any = { x: 0, y: 0, rotate: 0, scale: 1 };
                  let containerTransition: any = { duration: 0.3, ease: "easeInOut" };

                  if (phase === 'analyzing') {
                    containerAnimate = {
                      y: [0, -6, 0],
                      scale: [0.98, 1.02, 0.98],
                    };
                    containerTransition = {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    };
                  } else if (isRecording) {
                    containerAnimate = {
                      scale: [1.02, 1.06, 1.02],
                    };
                    containerTransition = {
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    };
                  } else if (tension >= 75) {
                    containerAnimate = {
                      x: [-1.5, 1.5, -1.5, 1.5, 0],
                      y: [-0.5, 0.5, -0.5, 0.5, 0],
                      rotate: [-2, 2, -2, 2, 0],
                      scale: [1.02, 1.05, 1.02],
                    };
                    containerTransition = {
                      duration: 0.25,
                      repeat: Infinity,
                      ease: "linear",
                    };
                  } else if (tension >= 45) {
                    containerAnimate = {
                      rotate: [-3, 3, -3],
                      scale: 1.01,
                    };
                    containerTransition = {
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    };
                  } else {
                    containerAnimate = {
                      y: [0, -3, 0],
                    };
                    containerTransition = {
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    };
                  }

                  // Determine dynamic border/ring classes
                  const borderRingClass = tension >= 75
                    ? 'border-rose-600 ring-4 ring-rose-500/20 shadow-[0_0_15px_rgba(225,29,72,0.15)]'
                    : tension >= 45
                    ? 'border-amber-500 ring-4 ring-amber-500/10'
                    : isRecording
                    ? 'border-emerald-500 ring-4 ring-emerald-500/20'
                    : 'border-black';

                  return (
                    <motion.div
                      animate={containerAnimate}
                      transition={containerTransition}
                      className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center text-6xl border-4 bg-[#faf6ee] shadow-[inset_0_4px_12px_rgba(0,0,0,0.06)] relative z-10 ${borderRingClass}`}
                    >
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={currentEmoji}
                          initial={{ scale: 0.5, opacity: 0, rotate: -25 }}
                          animate={{ scale: 1, opacity: 1, rotate: 0 }}
                          exit={{ scale: 0.5, opacity: 0, rotate: 25 }}
                          transition={{ type: "spring", stiffness: 350, damping: 15 }}
                          className="inline-block"
                        >
                          {currentEmoji}
                        </motion.span>
                      </AnimatePresence>
                    </motion.div>
                  );
                })()}

                {/* Microstatus floating badge */}
                <div className="absolute bottom-0 right-4 bg-slate-950 border-2 border-black px-2 py-0.5 rounded-full text-[10px] font-mono font-bold text-slate-300 shadow flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] z-20">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    isRecording ? 'bg-emerald-400 animate-ping' : 
                    phase === 'analyzing' ? 'bg-indigo-400 animate-spin' : 'bg-slate-500'
                  }`} />
                  {isRecording ? 'Mendengarkan' : phase === 'analyzing' ? 'Menganalisis' : 'Diam'}
                </div>
              </div>

              <h3 className="font-display font-black text-slate-900 text-lg uppercase tracking-wide">{activeLecturer.name}</h3>
              <p className="text-xs text-slate-600 font-mono tracking-wide mt-0.5">{activeLecturer.title}</p>
            </div>

            {/* Interactive Dynamic Stress Meter */}
            <div className="w-full bg-[#faf6ee] border-2 border-black p-4 rounded-xl space-y-2 text-left relative overflow-hidden shadow-[2.5px_2.5px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      tension >= 75 ? 'bg-rose-500' : tension >= 45 ? 'bg-amber-500' : 'bg-emerald-600'
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${
                      tension >= 75 ? 'bg-rose-600' : tension >= 45 ? 'bg-amber-600' : 'bg-emerald-600'
                    }`}></span>
                  </span>
                  <span className="text-[10px] font-mono tracking-wider uppercase font-black text-slate-600 animate-pulse">
                    Stress Meter
                  </span>
                </div>
                <span className={`font-mono text-[9px] font-black px-1.5 py-0.5 rounded border border-black uppercase ${
                  tension >= 75 ? 'bg-rose-500 text-slate-950 animate-pulse' :
                  tension >= 45 ? 'bg-amber-400 text-slate-950' :
                  'bg-emerald-400 text-slate-950'
                }`}>
                  {tension}% {tension >= 75 ? 'TEGANG' : tension >= 45 ? 'CURIGA' : 'AMAN'}
                </span>
              </div>
              
              <div className="w-full bg-slate-900 h-3.5 rounded-full overflow-hidden border-2 border-black relative">
                <div 
                  className={`h-full transition-all duration-300 ${
                    tension >= 75 ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-red-500 border-r border-black' : 
                    tension >= 45 ? 'bg-gradient-to-r from-amber-400 to-orange-500 border-r border-black' : 
                    'bg-gradient-to-r from-emerald-400 to-emerald-500 border-r border-black'
                  }`}
                  style={{ width: `${tension}%` }}
                />
              </div>

              {/* Dynamic live dialogue bullet */}
              <div className="p-2 bg-slate-900 rounded-lg border border-black text-[10.5px] leading-relaxed font-sans mt-1">
                <span className="font-extrabold text-white">Reaksi Dosen:</span> <span className="text-slate-300 italic">
                  {phase === 'answering' ? `"${liveReaction}"` : '"Penguji sedang meneliti performa lisan Anda..."'}
                </span>
              </div>
            </div>

            {/* Sub Status Banner */}
            <div className="w-full bg-slate-950 p-4 border-2 border-black rounded-xl space-y-1 mt-4 text-left shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <span className="text-[10px] tracking-wider font-mono uppercase text-slate-400 block font-black">
                Status Penguji
              </span>
              <p className="text-xs text-indigo-400 font-extrabold leading-relaxed">
                "{dosenStatusText}"
              </p>
            </div>

            {/* Defense Progress indicator bar */}
            <div className="w-full space-y-2 mt-4 text-left">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase font-bold">
                <span>Kemajuan Sidang</span>
                <span className="text-white font-extrabold">{currentQuestionIndex + 1} / 5 Pertanyaan</span>
              </div>
              <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden border-2 border-black">
                <div 
                  className="bg-indigo-400 h-full transition-all duration-300 border-r-2 border-black"
                  style={{ width: `${((currentQuestionIndex + 1) / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Active Question Display & Recorder Workrooms */}
        <div className="lg:col-span-2 space-y-4 flex flex-col justify-between">
          <div className="bg-white border-3 border-black p-6 rounded-2xl shadow-[6px_6px_0px_rgba(0,0,0,1)] flex-1 flex flex-col justify-between min-h-[460px] text-slate-800 font-sans">
            
            {/* Phase 1 & 2 & 3 & 4 Routing */}
            <AnimatePresence mode="wait">
              
              {/* FETCH QUESTION & ANALYZING LOADER */}
              {(phase === 'fetch-question' || phase === 'analyzing') && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex flex-col items-center justify-center text-center flex-1 py-16 space-y-6 animate-fade-in"
                >
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-amber-400 animate-spin stroke-[2.5]" />
                    <Sparkles className="w-4 h-4 text-amber-300 absolute top-0 -right-2 animate-pulse" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-display font-black text-lg text-slate-900 uppercase tracking-wider">
                      {phase === 'fetch-question' ? 'Menyusun Pertanyaan Ujian...' : 'Memproses Jawaban Oral Anda...'}
                    </h3>
                    <p className="text-indigo-700 text-xs max-w-sm mx-auto animate-pulse font-mono font-black bg-[#faf6ee] px-4 py-2.5 rounded-xl border-2 border-dashed border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                      "{LOADING_MESSAGES[loadingMsgIdx]}"
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ANSWERING SCREEN */}
              {phase === 'answering' && (
                <motion.div
                  key="answering"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col justify-between flex-1 gap-4"
                >
                  {/* Top: Active Question text block */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-black tracking-wider uppercase border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
                        isFollowupMode 
                          ? 'bg-rose-500 text-slate-950' 
                          : 'bg-indigo-400 text-slate-950'
                      }`}>
                        {isFollowupMode ? '⚠️ Pertanyaan Kejaran (Follow-Up)' : 'Pertanyaan Utama'}
                      </span>
                      
                      {/* Repeat synthesizer button */}
                      <button
                        onClick={() => speakQuestion(currentQuestionText)}
                        className="p-2 rounded-xl text-emerald-400 bg-slate-950 hover:bg-emerald-400 hover:text-slate-950 transition-all border-2 border-black shadow-[2.5px_2.5px_0px_rgba(0,0,0,1)] cursor-pointer"
                        title="Dengarkan Ulang Suara Dosen"
                      >
                        <Volume2 className="w-4 h-4 text-current stroke-[2.5]" />
                      </button>
                    </div>

                    <p className="font-display font-black text-lg md:text-xl text-indigo-950 leading-relaxed bg-[#faf6ee] border-2 border-black p-5 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] select-text">
                      "{currentQuestionText}"
                    </p>
                  </div>

                  {/* Middle: Transcript view OR Text input */}
                  <div className="flex-1 min-h-[143px] flex flex-col justify-center border-2 border-black rounded-2xl bg-[#faf6ee] p-4 font-normal shadow-[4px_4px_0px_rgba(0,0,0,1)] text-left">
                    {useKeyboardInput ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b-2 border-black pb-2">
                          <span className="text-xs text-slate-700 font-bold flex items-center gap-1.5 font-sans">
                            <Keyboard className="w-4 h-4 text-indigo-600" />
                            Input Keyboard Aktif (Backup)
                          </span>
                          <button 
                            onClick={() => setUseKeyboardInput(false)}
                            className="text-[10px] text-indigo-600 hover:underline cursor-pointer font-bold"
                          >
                            Pakai Mikrofon
                          </button>
                        </div>
                        <textarea
                          maxLength={3000}
                          rows={4}
                          value={manualText}
                          onChange={(e) => setManualText(e.target.value)}
                          placeholder="Ketik jawaban skripsi Anda secara mendetail di sini..."
                          className="w-full bg-transparent text-slate-900 text-sm focus:outline-none placeholder-slate-400 resize-none font-sans font-semibold"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b-2 border-black pb-2">
                          <span className="text-xs text-slate-700 font-bold flex items-center gap-1.5 font-sans">
                            <Mic className="w-4 h-4 text-emerald-600 animate-pulse stroke-[2.5]" />
                            Transkripsi Suara Real-Time
                          </span>
                          <button 
                            onClick={() => setUseKeyboardInput(true)}
                            className="text-[10px] text-indigo-600 hover:underline cursor-pointer font-bold"
                          >
                            Ketik Jawaban
                          </button>
                        </div>
                        
                        {transcript ? (
                          <p className="text-sm font-semibold text-slate-900 leading-relaxed max-h-[110px] overflow-y-auto w-full break-words select-text">
                            {transcript}
                          </p>
                        ) : (
                          <div className="text-center py-6 text-slate-600 text-xs italic font-bold">
                            {isRecording ? 'Mulai berbicara sekarang. Suara Anda akan ditranskrip secara otomatis di sini...' : 'Klik tombol Mulai Bicara di bawah dan berikan pembelaan terbaik Anda!'}
                          </div>
                        )}
                        
                        {/* Live metrics under talking */}
                        {isRecording && (
                          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500 pt-2 border-t-2 border-black">
                            <span className="flex items-center gap-1 border-r-2 border-black pr-3 font-sans font-bold text-slate-700">
                              Filler: <span className={`font-black ${fillerCount > 4 ? 'text-amber-600' : 'text-emerald-600'}`}>{fillerCount} kata</span>
                            </span>
                            <span className="flex items-center gap-1 font-bold text-slate-600">
                              Kecepatan ideal WPM: 80 - 140
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Controls */}
                  <div className="flex items-center justify-between gap-4 mt-2 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-3">
                      {/* Live timer display circle */}
                      <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                        <Clock className={`w-4 h-4 ${timeLeft < 20 ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`} />
                        <span className={`text-xs font-mono font-bold ${timeLeft < 20 ? 'text-rose-500 font-extrabold' : 'text-slate-850'}`}>
                          00:{timeLeft < 10 ? '0' : ''}{timeLeft}
                        </span>
                      </div>

                      {/* Toggling Recorder Button */}
                      {!useKeyboardInput && (
                        <button
                          type="button"
                          onClick={isRecording ? stopSpeechRecording : startSpeechRecording}
                          className={`px-5 py-2.5 rounded-xl border-2 border-black font-display font-black text-xs flex items-center gap-2 transition-all cursor-pointer ${
                            isRecording 
                              ? 'bg-rose-500 text-slate-950 hover:bg-rose-404 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none' 
                              : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300 shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none'
                          }`}
                        >
                          {isRecording ? (
                            <>
                              <MicOff className="w-4 h-4 stroke-[2.5]" />
                              HENTIKAN REKAM
                            </>
                          ) : (
                            <>
                              <Mic className="w-4 h-4 stroke-[2.5]" />
                              MULAI BICARA
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Selesai Menjawab trigger submission */}
                    <button
                      type="button"
                      id="btn_selesai_menjawab"
                      onClick={handleSubmitAnswer}
                      disabled={isRecording || (!useKeyboardInput && !transcript.trim()) || (useKeyboardInput && !manualText.trim())}
                      className="px-6 py-2.5 bg-amber-400 text-slate-950 font-display font-black text-xs rounded-xl border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:bg-amber-300 disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 flex items-center gap-1.5 transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                    >
                      KIRIM JAWABAN
                      <Send className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* CRITIQUE SCREEN: Immediate response from academic */}
              {phase === 'critique' && currentAnalysis && (
                <motion.div
                  key="critique"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col justify-between flex-1 gap-5"
                >
                  {/* Top Header stats critique */}
                  <div className="flex items-center justify-between border-b-2 border-black pb-3">
                    <span className="text-xs font-mono font-black uppercase text-slate-400">
                      Ulas Jawaban Ujian {currentQuestionsList.length}
                    </span>

                    {/* Quality badge indicator */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono font-bold">Skor Jawaban:</span>
                      <span className={`text-sm font-black px-3 py-1.5 rounded-xl text-center border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] leading-none ${
                        currentAnalysis.aiScore >= 80 ? 'bg-emerald-400 text-slate-950' :
                        currentAnalysis.aiScore >= 60 ? 'bg-amber-400 text-slate-950' :
                        'bg-rose-500 text-slate-950'
                      }`}>
                        {currentAnalysis.aiScore} POIN
                      </span>
                    </div>
                  </div>

                  {/* Body Content containing dynamic critique response */}
                  <div className="space-y-4 flex-1 overflow-y-auto max-h-[220px] border-2 border-black rounded-xl bg-[#faf6ee] p-4 font-normal text-slate-800 shadow-[3px_3px_0px_rgba(0,0,0,1)] text-left">
                    <div className="flex gap-2 items-start">
                      <MessageSquare className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5 stroke-[2.5]" />
                      <p className="text-sm font-sans leading-relaxed text-slate-900 font-semibold select-text">
                        {currentAnalysis.aiFeedback}
                      </p>
                    </div>
 
                    {/* Speech Performance insights warning summary */}
                    {!useKeyboardInput && (
                      <div className="mt-4 pt-3 border-t-2 border-black flex items-center gap-1.5 justify-between flex-wrap text-slate-600 text-[10px] font-mono font-bold">
                        <span className="flex items-center gap-1">
                          Kecepatan lisan: <span className="font-extrabold text-slate-900">{currentQuestionsList[currentQuestionsList.length-1]?.wpm} WPM</span>
                        </span>
                        <span className="flex items-center gap-1">
                          Gumaman filler (Tally): <span className={`font-extrabold ${fillerCount > 3 ? 'text-amber-600' : 'text-slate-650'}`}>{fillerCount} jeda</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Red Alert if they entered a follow-up or warning stage */}
                  {currentAnalysis.shouldFollowup && followupCount < 2 && (
                    <div className="bg-rose-500 border-2 border-black p-3.5 rounded-xl flex items-start gap-2.5 text-slate-950 text-left shadow-[3px_3px_0px_rgba(0,0,0,1)] font-sans">
                      <AlertOctagon className="w-5 h-5 text-slate-950 shrink-0 mt-0.5 animate-bounce stroke-[2.5]" />
                      <div>
                        <h4 className="text-xs font-black text-slate-950 uppercase tracking-wide font-display">PERTANYAAN KEJARAN MULAI!</h4>
                        <p className="text-[10px] text-slate-900 leading-relaxed mt-0.5 font-bold">
                          Jawaban Anda dinilai mengandung celah kritis atau meragukan bagi penguji. Persiapkan diri Anda menghadapi pendalaman materi secara lisan lebih tajam!
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Navigation controls next question */}
                  <div className="flex justify-end pt-2">
                    <button
                      id="btn_lanjut_sidang"
                      onClick={handleNextStep}
                      className="px-6 py-3 bg-amber-400 text-[#0f172a] font-display font-black text-sm rounded-xl border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:bg-amber-300 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {currentQuestionsList.length >= 5 && (!currentAnalysis.shouldFollowup || followupCount >= 2) ? (
                        <>
                          LANJUT KEPUTUSAN KELULUSAN
                          <CheckCircle2 className="w-4 h-4 text-[#0f172a] stroke-[2.5]" />
                        </>
                      ) : (
                        <>
                          PERTANYAAN BERIKUTNYA
                          <ChevronRight className="w-4 h-4 text-[#0f172a] stroke-[2.5]" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
