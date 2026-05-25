import { useState } from 'react';
import { motion } from 'motion/react';
import { Mic, AlertTriangle, ShieldCheck, Play, BookOpen, Clock, Activity } from 'lucide-react';
import { authenticateAnonymously } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';

interface LandingViewProps {
  onStart: (userId: string) => void;
}

export default function LandingView({ onStart }: LandingViewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthRestricted, setIsAuthRestricted] = useState(false);

  const handleStartApp = async () => {
    setLoading(true);
    setError(null);
    setIsAuthRestricted(false);
    try {
      const user = await authenticateAnonymously();
      onStart(user.uid);
    } catch (err: any) {
      console.error("Firebase Auth Exception:", err);
      const errString = err instanceof Error ? err.message : String(err);
      const isRestricted = errString.includes('admin-restricted-operation') || 
                          err?.code === 'auth/admin-restricted-operation' ||
                          (errString.toLowerCase().includes('anonymous') && errString.toLowerCase().includes('restricted'));
      
      if (isRestricted) {
        setIsAuthRestricted(true);
        setError('Penyedia Anonymous Sign-In Dinonaktifkan di Firebase Console Anda.');
      } else {
        setError('Gagal masuk secara anonim. Silakan periksa koneksi internet Anda.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 md:px-8 bg-[#faf6ee] bg-dot-grid overflow-hidden">
      {/* Premium Neon Ambient Glow Orbs */}
      <div className="absolute top-1/6 left-1/4 w-96 h-96 bg-indigo-200/40 rounded-full filter blur-[100px] pointer-events-none animate-pulse-slow mix-blend-multiply" />
      <div className="absolute bottom-1/5 right-1/4 w-[400px] h-[400px] bg-emerald-200/30 rounded-full filter blur-[120px] pointer-events-none animate-pulse-slow mix-blend-multiply" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-200/25 rounded-full filter blur-[80px] pointer-events-none" />

      {/* Abstract Board of Examiners Silhouette SVG */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none flex items-center justify-center">
        <svg 
          className="absolute top-[12%] left-1/2 -translate-x-1/2 w-[90%] max-w-[850px] h-[320px] opacity-[0.05] md:opacity-[0.08]" 
          viewBox="0 0 800 300" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Lecturers Table */}
          <path d="M100 240 Q400 210 700 240 L710 245 C730 250 690 260 400 260 C110 260 70 250 90 245 Z" fill="currentColor" className="text-slate-500" />
          
          {/* Left Examiner Silhouette */}
          <circle cx="280" cy="140" r="28" fill="currentColor" className="text-indigo-400" />
          <path d="M225 210 Q225 180 252 173 Q280 178 308 173 Q335 180 335 210 Z" fill="currentColor" className="text-indigo-400/80" />
          
          {/* Center Examiner Silhouette (The Dean) */}
          <circle cx="400" cy="115" r="34" fill="currentColor" className="text-emerald-400" />
          <path d="M335 200 Q335 162 367 154 Q400 160 433 154 Q465 162 465 200 Z" fill="currentColor" className="text-emerald-400/80" />
          <path d="M380 148 L420 148 L400 132 Z" fill="currentColor" className="text-emerald-300" /> {/* Graduation/Dean Cap detail */}
          
          {/* Right Examiner Silhouette */}
          <circle cx="520" cy="145" r="26" fill="currentColor" className="text-indigo-400" />
          <path d="M470 215 Q470 186 495 180 Q520 185 545 180 Q570 186 570 215 Z" fill="currentColor" className="text-indigo-400/80" />

          {/* Interactive Digital Neural Pathways representing AI */}
          <path d="M280 140 L400 115 L520 145" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 5" className="text-indigo-500/40" />
          <path d="M400 115 L400 245" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-emerald-500/30" />
          
          {/* Glowing target speaker point */}
          <circle cx="400" cy="245" r="6" fill="currentColor" className="text-emerald-400" />
          <circle cx="400" cy="245" r="14" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400 animate-ping opacity-75" />
        </svg>
      </div>

      {/* Interactive Floating Micro Dialogue Bubbles */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {[
          { id: 1, text: "Bab 4 mana?", x: "left-[5%] md:left-[12%]", y: "top-[15%]", delay: 0, emoji: "🧐" },
          { id: 2, text: "Yakin p-value Anda signifikan?", x: "right-[4%] md:right-[10%]", y: "top-[25%]", delay: 1.5, emoji: "🦉" },
          { id: 3, text: "Grade A", x: "left-[4%] md:left-[8%]", y: "bottom-[35%]", delay: 3, emoji: "🎓" },
          { id: 4, text: "Stress Meter: 99%", x: "right-[6%] md:right-[14%]", y: "bottom-[20%]", delay: 2.2, emoji: "🔥" },
          { id: 5, text: "Uji Validitas?", x: "left-[10%] md:left-[18%]", y: "top-[45%]", delay: 4.1, emoji: "📊" },
          { id: 6, text: "Revisi Mayor!", x: "right-[8%] md:right-[15%]", y: "top-[48%]", delay: 5.2, emoji: "👹" },
        ].map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: [0.15, 0.45, 0.15],
              y: [0, -15, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: item.delay,
            }}
            className={`absolute ${item.x} ${item.y} hidden sm:flex items-center gap-2 px-3.5 py-2.5 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_rgba(0,0,0,1)] text-[11.5px] font-mono font-bold text-slate-800 pointer-events-auto hover:scale-105 hover:bg-white transition-all select-none`}
          >
            <span>{item.emoji}</span>
            <span className="italic">"{item.text}"</span>
          </motion.div>
        ))}
      </div>

      <div className="w-full max-w-4xl text-center z-20 py-12 relative">
        {/* Category Tag */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-400 text-slate-950 text-xs font-black uppercase tracking-wider mb-8 border-3 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
        >
          <BookOpen className="w-4 h-4 text-slate-950 stroke-[2.5]" />
          SIMULATOR SIDANG PENDADARAN UTAMA & KRITIS
        </motion.div>
 
        {/* Brand Display Typography with drop glow */}
        <motion.h1 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-display text-5xl md:text-8xl font-black tracking-tight text-slate-950 mb-6 drop-shadow-[5px_5px_0px_rgba(251,191,36,1)]"
        >
          Sidang<span className="text-emerald-600 font-extrabold text-6xl md:text-9xl relative inline-block animate-pulse">.</span>AI
        </motion.h1>
 
        {/* Catchy Indonesian Slogan */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-base md:text-lg text-slate-800 max-w-2xl mx-auto mb-10 leading-relaxed font-bold bg-white p-5 border-3 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] inline-block"
        >
          Uji kesiapan mental, kelancaran vokal, dan penguasaan skripsi Anda di hadapan <span className="text-emerald-650 text-emerald-700 font-extrabold font-display">Dosen Penguji AI</span> yang kritis dan adaptif.
          <span className="block mt-2 text-indigo-700 font-black">Latih kepercayaan dirimu secara real-time langsung di browser!</span>
        </motion.p>
 
        {/* Start Button & Call to Action */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-col items-center gap-3 mb-20"
        >
          <button
            id="btn_mulai_sidang"
            onClick={handleStartApp}
            disabled={loading}
            className="group relative px-10 py-5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-display font-black text-xl rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[9px_9px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-3 disabled:opacity-50 cursor-pointer overflow-hidden leading-none"
          >
            {/* Gloss wave overlay animation */}
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
            
            {loading ? (
              <>
                <div className="w-5 h-5 border-3 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Mempersiapkan Ruang Sidang...
              </>
            ) : (
              <>
                MASUK RUANG SIMULASI
                <Play className="w-5 h-5 fill-slate-950 stroke-slate-950 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
          
          {error && !isAuthRestricted && (
            <div className="text-rose-950 text-sm flex items-center gap-2 mt-2 bg-rose-400 px-4 py-2 rounded-xl border-2 border-black font-semibold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-sans">
              <AlertTriangle className="w-4 h-4 shrink-0 text-slate-950" />
              <span>{error}</span>
            </div>
          )}
 
          {isAuthRestricted && (
            <div className="mt-4 w-full max-w-xl bg-orange-950/40 backdrop-blur-md border border-orange-900/40 p-5 rounded-2xl text-left shadow-2xl relative overflow-hidden font-sans">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full filter blur-xl pointer-events-none" />
              
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                <div className="space-y-3 flex-1 text-slate-300">
                  <div>
                    <h3 className="font-display font-bold text-white text-sm">
                      Langkah Perbaikan: Aktifkan Anonymous Sign-In
                    </h3>
                    <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                      Error <strong>(auth/admin-restricted-operation)</strong> terjadi karena provider <strong>Anonymous Sign-In</strong> belum diaktifkan di Firebase Console Anda. Harap ikuti 3 langkah mudah berikut:
                    </p>
                  </div>
 
                  <div className="space-y-2 text-xs">
                    <div className="flex gap-2.5 items-start bg-slate-900/60 p-2.5 rounded-xl border border-orange-900/30">
                      <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-mono font-bold text-xs shrink-0 border border-orange-500/30">1</span>
                      <p className="leading-relaxed text-slate-300">
                        Buka halaman sign-in providers Anda secara langsung di:{' '}
                        <a 
                          href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                          target="_blank" 
                          referrerPolicy="no-referrer"
                          className="text-indigo-400 font-bold hover:underline break-all inline-flex items-center gap-0.5"
                        >
                          Firebase Admin Console ↗
                        </a>
                      </p>
                    </div>
 
                    <div className="flex gap-2.5 items-start bg-slate-900/60 p-2.5 rounded-xl border border-orange-900/30">
                      <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-mono font-bold text-xs shrink-0 border border-orange-500/30">2</span>
                      <p className="leading-relaxed text-slate-300 font-sans">
                        Klik tombol <span className="font-bold text-white">Add new provider</span> (atau klik item <strong>Anonymous</strong> jika sudah ada di lis) lalu pilih penyedia bernama <span className="font-bold text-white">Anonymous</span> (Anonim).
                      </p>
                    </div>
 
                    <div className="flex gap-2.5 items-start bg-slate-900/60 p-2.5 rounded-xl border border-orange-900/30">
                      <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-mono font-bold text-xs shrink-0 border border-orange-500/30">3</span>
                      <p className="leading-relaxed text-slate-300">
                        Aktifkan tombol toggle <span className="font-bold text-white">Enable</span> pilih <span className="font-bold text-white">Save</span> (Simpan).
                      </p>
                    </div>
                  </div>
 
                  <div className="pt-2.5 border-t border-orange-905 border-orange-900/20 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 font-mono gap-2">
                    <span>Setelah diaktifkan, klik tombol coba lagi:</span>
                    <button
                      onClick={handleStartApp}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-950 font-sans font-bold rounded-lg text-xs transition-colors cursor-pointer w-full sm:w-auto text-center"
                    >
                      Coba Masuk Lagi
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <span className="text-xs text-slate-800 font-mono flex items-center gap-1.5 mt-2 bg-white px-3.5 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-extrabold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
            Keamanan Terjamin dengan Firebase Auth & Firestore rules
          </span>
        </motion.div>
 
        {/* Features Grid with premium dark glass cards */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-20"
        >
          <div className="bg-white border-3 border-black p-6 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] bg-indigo-50/20">
            <div className="w-11 h-11 rounded-xl bg-indigo-400 text-slate-950 flex items-center justify-center mb-4 border-2 border-black shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)]">
              <Mic className="w-5.5 h-5.5 stroke-[2.5]" />
            </div>
            <h3 className="font-display font-black text-lg text-slate-900 mb-2 uppercase tracking-wide">Speech-To-Text</h3>
            <p className="text-slate-700 text-sm leading-relaxed font-semibold">
              Teknologi transkripsi real-time di browser berkat Web Speech API. Latih cara bicaramu agar terdengar mantap dan fasih.
            </p>
          </div>
 
          <div className="bg-white border-3 border-black p-6 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] bg-emerald-50/20">
            <div className="w-11 h-11 rounded-xl bg-emerald-400 text-slate-950 flex items-center justify-center mb-4 border-2 border-black shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)]">
              <Activity className="w-5.5 h-5.5 stroke-[2.5]" />
            </div>
            <h3 className="font-display font-black text-lg text-slate-900 mb-2 uppercase tracking-wide">Detektor Filler</h3>
            <p className="text-slate-700 text-sm leading-relaxed font-semibold">
              Mendeteksi otomatis kata-kata jeda gagap seperti 'eee', 'kayaknya', 'anu', 'terus', dsb. Latih jeda hening berkharisma.
            </p>
          </div>
 
          <div className="bg-white border-3 border-black p-6 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] bg-amber-50/20">
            <div className="w-11 h-11 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center mb-4 border-2 border-black shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)]">
              <Clock className="w-5.5 h-5.5 stroke-[2.5]" />
            </div>
            <h3 className="font-display font-black text-lg text-slate-900 mb-2 uppercase tracking-wide">Dosen AI Adaptif</h3>
            <p className="text-slate-700 text-sm leading-relaxed font-semibold">
              Gemini AI secara cerdas merancang follow-up kejaran apabila jawaban Anda lemah atau bertolak belakang dengan dasar metode.
            </p>
          </div>
        </motion.div>
 
        {/* Why this App was Made & How it Works Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="border-t border-slate-800/50 pt-16 text-left space-y-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border-3 border-black p-6 md:p-8 rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:scale-[1.01]">
              <h2 className="font-display text-xl font-black text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
                <span className="p-1 px-2.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-black border-2 border-black">?</span>
                Mengapa Sidang.AI Dibuat?
              </h2>
              <p className="text-slate-700 text-sm leading-relaxed mb-4 font-semibold">
                Banyak mahasiswa tingkat akhir mengalami gangguan kecemasan berlebih (performance anxiety) saat menghadapi sidang skripsi asli. Kehadiran dosen penguji yang tidak terprediksi karakternya, pertanyaan susulan yang mendalam, serta kebiasaan menggunakan vokal jeda (filler words) sering kali meruntuhkan konsentrasi di ruang sidang.
              </p>
              <p className="text-slate-700 text-sm leading-relaxed font-semibold">
                <strong>Sidang.AI</strong> dirancang sebagai ruang simulasi psikologis dan akademis yang aman. Kami ingin membantu mahasiswa melatih ketenangan mental, kecepatan memformulasi lisan, kelancaran vokal, serta ketepatan argumentasi ilmiah sebelum hari h murni tanpa rasa takut salah.
              </p>
            </div>
 
            <div className="bg-white border-3 border-black p-6 md:p-8 rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:scale-[1.01]">
              <h2 className="font-display text-xl font-black text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
                <span className="p-1 px-2.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-black border-2 border-black">✓</span>
                Bagaimana Aplikasi Ini Bekerja?
              </h2>
              <p className="text-slate-700 text-sm leading-relaxed mb-3 font-semibold">
                Cukup masukkan judul beserta abstrak penelitian nyata Anda, lalu pilih karakter dosen penguji yang ingin disimulasikan (bahkan Anda dapat mengustomisasi profil dosen penguji nyata di kampus Anda sendiri!).
              </p>
              <ul className="text-slate-705 text-slate-700 text-sm space-y-2 mt-4 font-semibold">
                <li className="flex gap-2.5 items-start">
                  <span className="text-emerald-600 font-extrabold text-xs shrink-0 mt-0.5">•</span>
                  <span><strong>Pertanyaan Adaptif:</strong> AI merancang dan menyuarakan pertanyaan secara langsung berdasarkan muatan judul & abstrak Anda.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="text-emerald-600 font-extrabold text-xs shrink-0 mt-0.5">•</span>
                  <span><strong>Penilaian Real-Time:</strong> Sistem menganalisis kecepatan bicara Anda (WPM) dan mendeteksi vokal filler secara otomatis.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="text-emerald-600 font-extrabold text-xs shrink-0 mt-0.5">•</span>
                  <span><strong>Stress Meter Dinamis:</strong> Suasana ruangan dipengaruhi keaktifan bicaramu. Terlalu lama terdiam memicu ketegangan dosen!</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
