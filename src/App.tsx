import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import LandingView from './components/LandingView';
import SetupView from './components/SetupView';
import SidangView from './components/SidangView';
import VerdictView from './components/VerdictView';
import { authenticateAnonymously } from './lib/firebase';
import { 
  GraduationCap, Mic, Award, HelpCircle, HardDrive, CheckCircle, Database 
} from 'lucide-react';

type ScreenState = 'landing' | 'setup' | 'sidang' | 'verdict';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenState>('landing');
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any | null>(null);
  const [resultData, setResultData] = useState<any | null>(null);

  const handleStart = (uid: string) => {
    setUserId(uid);
    setActiveScreen('setup');
  };

  const handleSessionCreated = (sessId: string, sessData: any) => {
    setSessionId(sessId);
    setSessionData(sessData);
    setActiveScreen('sidang');
  };

  const handleFinished = (vId: string, resData: any) => {
    setResultData(resData);
    setActiveScreen('verdict');
  };

  const handleRestart = () => {
    setSessionId(null);
    setSessionData(null);
    setResultData(null);
    setActiveScreen('setup');
  };

  return (
    <div className="min-h-screen bg-[#faf6ee] text-slate-900 flex flex-col justify-between overflow-x-hidden select-none">
      
      {/* 1. APP HEADER / NAVIGATION BAR */}
      <header className="border-b-4 border-black bg-amber-400 text-slate-950 px-6 py-4 sticky top-0 z-50 flex items-center justify-between shadow-[0_4px_0px_0px_rgba(0,0,0,1)]">
        <div 
          onClick={handleRestart}
          className="flex items-center gap-3.5 cursor-pointer group"
          id="nav_brand"
        >
          <div className="w-9 h-9 bg-white border-2 border-black flex items-center justify-center text-slate-950 group-hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <GraduationCap className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-display font-black text-lg tracking-tight leading-none text-slate-950">
              Sidang<span className="text-emerald-600">.</span>AI
            </h1>
            <span className="text-[9px] font-mono text-slate-900 tracking-wider font-extrabold uppercase block mt-0.5">
              Simulator Skripsi AI
            </span>
          </div>
        </div>

        {/* Database indicator status */}
        <div className="flex items-center gap-2 bg-emerald-400 text-slate-950 border-2 border-black px-3 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <Database className="w-3.5 h-3.5 text-slate-950 animate-pulse fill-slate-950" />
          <span className="text-[10px] font-mono font-black uppercase leading-none">
            Firestore Active
          </span>
        </div>
      </header>

      {/* 2. CORE VISUAL CONTAINER WITH PAGE CHANGER TRANSITIONS */}
      <main className="flex-1 w-full flex flex-col min-h-[82vh]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, scale: 0.99, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, y: -5 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="flex-1 flex flex-col h-full w-full"
          >
            {activeScreen === 'landing' && <LandingView onStart={handleStart} />}
            {activeScreen === 'setup' && userId && (
              <SetupView userId={userId} onSessionCreated={handleSessionCreated} />
            )}
            {activeScreen === 'sidang' && userId && sessionId && sessionData && (
              <SidangView 
                userId={userId} 
                sessionId={sessionId} 
                sessionData={sessionData} 
                onFinished={handleFinished} 
              />
            )}
            {activeScreen === 'verdict' && sessionData && resultData && (
              <VerdictView 
                sessionData={sessionData} 
                resultData={resultData} 
                onRestart={handleRestart} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 3. APP FOOTER */}
      <footer className="border-t-4 border-black bg-amber-300/10 px-6 py-5 text-center flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-700 font-mono font-bold">
        <div>
          © 2026 Sidang.AI — Google AI Studio Build. All Rights Reserved.
        </div>
        <div className="flex items-center gap-1">
          <span>Teknologi Web Speech + Gemini 3.5 Flash</span>
        </div>
      </footer>

    </div>
  );
}
