import { motion } from 'motion/react';
import { 
  Award, RefreshCw, BarChart2, CheckCircle, HelpCircle, Activity, Play, ArrowLeft, 
  MessageSquare, LayoutGrid, ThumbsUp, Sparkles, BookOpen, AlertOctagon, CheckCircle2
} from 'lucide-react';
import { Verdict } from '../types';
import { LECTURERS } from '../data/lecturers';

interface VerdictViewProps {
  sessionData: any;
  resultData: Verdict;
  onRestart: () => void;
}

export default function VerdictView({ sessionData, resultData, onRestart }: VerdictViewProps) {
  const activeLecturer = sessionData.customLecturer || LECTURERS.find(l => l.id === sessionData.dosenType) || LECTURERS[0];

  const getLetterGradeData = (score: number) => {
    if (score >= 85) return { grade: 'A', bg: 'bg-emerald-400 text-slate-950 border-2 border-black', desc: 'LULUS DENGAN PUJIAN (CUM LAUDE)' };
    if (score >= 80) return { grade: 'B+', bg: 'bg-teal-400 text-slate-950 border-2 border-black', desc: 'LULUS DENGAN PRESTASI SANGAT MEMUASKAN' };
    if (score >= 70) return { grade: 'B', bg: 'bg-indigo-300 text-slate-950 border-2 border-black', desc: 'LULUS BAIK' };
    if (score >= 65) return { grade: 'C+', bg: 'bg-amber-400 text-slate-950 border-2 border-black', desc: 'LULUS DENGAN REVISI RINGAN' };
    if (score >= 60) return { grade: 'C', bg: 'bg-amber-300 text-slate-950 border-2 border-black', desc: 'LULUS DENGAN REVISI TARGET' };
    if (score >= 50) return { grade: 'D', bg: 'bg-rose-450 bg-rose-400 text-slate-950 border-2 border-black', desc: 'UJIAN ULANG (REVISI MAYOR)' };
    return { grade: 'E', bg: 'bg-rose-600 text-slate-950 border-2 border-black', desc: 'GAGAL / TIDAK LULUS' };
  };

  const gradeData = getLetterGradeData(resultData.overallScore);

  // Helper colors based on status outcome for light theme
  const getOutcomeStyling = (result: string) => {
    switch (result) {
      case 'LULUS DENGAN PUJIAN':
        return {
          bannerBg: 'bg-emerald-400 border-3 border-black text-slate-950 font-black shadow-[4px_4px_0px_rgba(0,0,0,1)] px-6 py-2 rounded-2xl',
          radialGlow: 'bg-emerald-500/10',
          textColor: 'text-emerald-400',
          badgeText: '🏆 LULUS DENGAN PUJIAN (CUM LAUDE)'
        };
      case 'LULUS':
        return {
          bannerBg: 'bg-emerald-400 border-3 border-black text-slate-950 font-black shadow-[4px_4px_0px_rgba(0,0,0,1)] px-6 py-2 rounded-2xl',
          radialGlow: 'bg-indigo-500/10',
          textColor: 'text-emerald-400',
          badgeText: '🎓 LULUS (MEMUASKAN)'
        };
      case 'REVISI OPTIONAL':
        return {
          bannerBg: 'bg-amber-400 border-3 border-black text-slate-950 font-black shadow-[4px_4px_0px_rgba(0,0,0,1)] px-6 py-2 rounded-2xl',
          radialGlow: 'bg-sky-500/10',
          textColor: 'text-amber-400',
          badgeText: '✍️ LULUS DENGAN REVISI KECIL'
        };
      case 'REVISI MAYOR':
        return {
          bannerBg: 'bg-amber-400 border-3 border-black text-slate-950 font-black shadow-[4px_4px_0px_rgba(0,0,0,1)] px-6 py-2 rounded-2xl',
          radialGlow: 'bg-amber-500/10',
          textColor: 'text-amber-400',
          badgeText: '⚠️ REVISI MAYOR (UJIAN ULANG KECIL)'
        };
      default:
        return {
          bannerBg: 'bg-rose-500 border-3 border-black text-slate-950 font-black shadow-[4px_4px_0px_rgba(0,0,0,1)] px-6 py-2 rounded-2xl',
          radialGlow: 'bg-rose-500/10',
          textColor: 'text-rose-400',
          badgeText: '❌ TIDAK LULUS (MENGULANG TAHUN DEPAN)'
        };
    }
  };

  const style = getOutcomeStyling(resultData.result);

  const scoreBars = [
    { label: 'Kedalaman Materi', value: resultData.scoreMateri, color: 'from-emerald-400 to-teal-400', desc: 'Pemahaman materi inti skripsi' },
    { label: 'Metodologi Penelitian', value: resultData.scoreMetodologi, color: 'from-indigo-400 to-blue-400', desc: 'Keteraturan uji data & referensi' },
    { label: 'Kefasihan Argumentasi', value: resultData.scoreArgumentasi, color: 'from-amber-400 to-orange-400', desc: 'Logika & ketegasan membela teori' },
    { label: 'Kontribusi Keilmuan', value: resultData.scoreKontribusi, color: 'from-fuchsia-400 to-violet-400', desc: 'Manfaat akademik & praktis hasil' },
    { label: 'Ketenangan di bawah Tekanan', value: resultData.scoreTekanan, color: 'from-rose-400 to-pink-400', desc: 'Kecepatan WPM & deteksi filler words' }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 relative">
      {/* Dynamic Background Glow representing results status */}
      <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full filter blur-3xl pointer-events-none animation-pulse-slow ${style.radialGlow}`} />

      {/* Landing / Status Header Title */}
      <div className="text-center z-10 relative mb-10 space-y-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className={`inline-flex px-6 py-2.5 rounded-2xl border-3 border-black text-sm md:text-base font-display font-black shadow-[4px_4px_0px_rgba(0,0,0,1)] tracking-wider uppercase ${style.bannerBg}`}
        >
          {style.badgeText}
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="font-display text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tight"
        >
          Hasil Sidang Skripsi Anda
        </motion.h1>

        <p className="text-xs font-mono text-slate-700 max-w-lg mx-auto bg-white border-2 border-dashed border-black px-4 py-1.5 rounded-xl select-all font-bold">
          JUDUL: "{sessionData.judul}"
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
        
        {/* SCORE BREAKDOWN PANEL - BENTO (Left & Center, Colspan 2) */}
        <div className="md:col-span-2 space-y-5">
          <div className="bg-white border-3 border-black p-6 rounded-2xl shadow-[6px_6px_0px_rgba(0,0,0,1)] text-slate-800 space-y-4 text-left">
            <h3 className="font-display font-black text-lg text-slate-900 border-b-2 border-black pb-3 flex items-center gap-2 uppercase tracking-wide">
              <LayoutGrid className="w-5 h-5 text-indigo-605 text-indigo-600 stroke-[2.5]" />
              Parameter Penilaian
            </h3>

            <div className="space-y-4 pt-1.5">
              {scoreBars.map((bar, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-extrabold text-[#0f172a] block">{bar.label}</span>
                      <span className="text-[10px] text-slate-600 font-bold leading-none">{bar.desc}</span>
                    </div>
                    <span className="font-mono font-black text-slate-900">{bar.value} / 100</span>
                  </div>
                  <div className="w-full bg-[#faf6ee] h-3 rounded-full overflow-hidden border-2 border-black">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${bar.value}%` }}
                      transition={{ duration: 1, delay: idx * 0.1 }}
                      className={`h-full bg-gradient-to-r border-r border-[#0f172a] ${bar.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* OVERALL PERCENTAGE GAUGE - BENTO (Right, Colspan 1) */}
        <div className="md:col-span-1">
          <div className="bg-white border-3 border-black p-6 rounded-2xl shadow-[6px_6px_0px_rgba(0,0,0,1)] flex flex-col justify-between items-center text-center h-full min-h-[290px] text-slate-800">
            <div>
              <h3 className="font-display font-black text-xs text-slate-600 uppercase tracking-widest bg-[#faf6ee] border border-black px-3 py-1 rounded-full shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]">
                Nilai Kumulatif
              </h3>
              
              {/* Massive Centered Circular Tally Display */}
              <div className="relative w-44 h-44 flex items-center justify-center my-6">
                
                {/* Visual SVG Progress ring */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r="44" 
                    className="stroke-[#eae6de] fill-none" 
                    strokeWidth="8" 
                  />
                  <motion.circle 
                    cx="50" cy="50" r="44" 
                    className="stroke-emerald-500 fill-none" 
                    strokeWidth="8" 
                    strokeDasharray="276"
                    initial={{ strokeDashoffset: 276 }}
                    animate={{ strokeDashoffset: 276 - (276 * resultData.overallScore) / 100 }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                </svg>

                {/* Score numbers centered inside */}
                <div className="absolute flex flex-col items-center">
                  <span className="font-display text-5xl font-black text-slate-950 tracking-tight leading-none mb-0.5 select-text">
                    {gradeData.grade}
                  </span>
                  <span className="text-[10px] font-mono text-slate-800 uppercase font-black bg-white px-2 py-0.5 rounded border border-black shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]">{resultData.overallScore} / 100</span>
                </div>
              </div>

              {/* Letter grade description badge under the circular gauge */}
              <div className={`mt-2 px-4 py-2 rounded-xl text-center border-2 border-black font-display font-black text-[12px] shadow-[2.5px_2.5px_0px_rgba(0,0,0,1)] tracking-wide uppercase ${gradeData.bg}`}>
                Grade Indeks: {gradeData.grade}
                <div className="text-[10px] lowercase font-extrabold text-slate-800 font-sans tracking-normal mt-0.5 leading-tight">
                  ({gradeData.desc})
                </div>
              </div>
            </div>

            <div className="text-slate-600 text-[10px] leading-relaxed max-w-xs mx-auto font-sans font-bold mt-4 pt-3 border-t-2 border-black border-dashed w-full">
              Naskah kelayakan diuji berdasarkan standar akademis nasional dipimpin oleh ketua penguji <span className="text-slate-900 font-black">{activeLecturer.name}</span>.
            </div>
          </div>
        </div>
      </div>

      {/* LECTURER DEBRIEFING NOTES WRAP */}
      <div className="bg-white border-3 border-black p-6 rounded-2xl shadow-[6px_6px_0px_rgba(0,0,0,1)] mb-10 text-left relative z-10 space-y-4 text-slate-800">
        <h3 className="font-display font-black text-lg text-slate-900 border-b-2 border-black pb-3 flex items-center gap-1.5 uppercase tracking-wide">
          <MessageSquare className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
          Ulasan Komprehensif Tim Penguji ({activeLecturer.name})
        </h3>

        {/* Long critique scroll area showing immersive feedback */}
        <div className="text-slate-800 text-sm leading-relaxed space-y-4 max-h-[300px] overflow-y-auto pr-2 font-semibold bg-[#faf6ee] p-4 border-2 border-black rounded-2xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] select-text">
          {resultData.catatanDosen ? (
            resultData.catatanDosen.split('\n\n').map((paragraph, idx) => (
              <p key={idx} className="font-sans leading-relaxed">
                {paragraph}
              </p>
            ))
          ) : (
            <p className="italic text-slate-600 text-xs text-center font-bold">Catatan penguji tidak berhasil dianalisis.</p>
          )}
        </div>
      </div>

      {/* Actions Restart simulation grid */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10 pt-2 mb-12">
        <button
          onClick={onRestart}
          className="px-8 py-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-display font-black text-sm rounded-xl border-3 border-black shadow-[5px_5px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2 justify-center cursor-pointer w-full sm:w-auto"
        >
          <RefreshCw className="w-4 h-4 text-slate-950 stroke-[3]" />
          SIMULASI ULANG (UJI NYALI BARU)
        </button>
      </div>

    </div>
  );
}
