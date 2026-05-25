import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { LECTURERS } from '../data/lecturers';
import { CONTOH_SKRIPSI } from '../data/examples';
import { DosenType } from '../types';
import { BookOpen, Sparkles, AlertCircle, RefreshCw, UserCheck, Quote, GraduationCap } from 'lucide-react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface SetupViewProps {
  userId: string;
  onSessionCreated: (sessionId: string, sessionData: any) => void;
}

export default function SetupView({ userId, onSessionCreated }: SetupViewProps) {
  const [judul, setJudul] = useState('');
  const [abstrak, setAbstrak] = useState('');
  const [selectedDosen, setSelectedDosen] = useState<DosenType>('perfeksionis');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom Lecturer States
  const [customName, setCustomName] = useState('Dr. Hermawan, M.Si.');
  const [customTitle, setCustomTitle] = useState('Dosen Penguji Utama');
  const [customAvatar, setCustomAvatar] = useState('👹');
  const [customDescription, setCustomDescription] = useState('Sangat kritis tentang keaslian/orisinalitas riset dan menyukai pertanyaan jebakan metodis dengan nada yang tenang tapi memojokkan.');
  const [customDifficulty, setCustomDifficulty] = useState('Sangat Tinggi');
  const [customQuote, setCustomQuote] = useState('Coba buktikan ke saya, dari mana Anda menjamin bahwa data responden ini bukan hasil rekayasa sendiri?');
  const [customFocuses, setCustomFocuses] = useState('Orisinalitas Data, Logika Hipotesis, Teori Dasar');

  // Auto load examples
  const handleLoadExample = (index: number) => {
    const example = CONTOH_SKRIPSI[index];
    setJudul(example.judul);
    setAbstrak(example.abstrak);
    setError(null);
  };

  const handleCreateSession = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!judul.trim() || judul.trim().length < 10) {
      setError('Judul skripsi wajib diisi (minimal 10 karakter).');
      return;
    }
    if (!abstrak.trim() || abstrak.trim().length < 50) {
      setError('Abstrak skripsi wajib diisi (minimal 50 karakter agar AI bekerja maksimal).');
      return;
    }

    setLoading(true);
    const sessionId = `sess_${Date.now()}`;

    const customLecturerObj = selectedDosen === 'custom' ? {
      id: 'custom',
      name: customName.trim() || 'Dosen Kustom',
      title: customTitle.trim() || 'Dosen Penguji',
      avatar: customAvatar,
      description: customDescription.trim() || 'Menguji secara kritis.',
      difficulty: customDifficulty,
      accentColor: 'indigo',
      quote: customQuote.trim() || 'Apakah Anda yakin dengan karya tulis Anda?',
      focuses: customFocuses.split(',').map(f => f.trim()).filter(Boolean)
    } : null;

    const sessionData = {
      id: sessionId,
      userId,
      judul: judul.trim(),
      abstrak: abstrak.trim(),
      dosenType: selectedDosen,
      ...(customLecturerObj ? { customLecturer: customLecturerObj } : {}),
      status: 'inprogress',
      currentQuestionIndex: 0,
      createdAt: new Date().toISOString()
    };

    try {
      // Create session document in Firestore
      const sessionRef = doc(db, 'sessions', sessionId);
      await setDoc(sessionRef, sessionData);
      onSessionCreated(sessionId, sessionData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `sessions/${sessionId}`);
    } finally {
      setLoading(false);
    }
  };

  const activeLecturer = selectedDosen === 'custom' ? {
    id: 'custom',
    name: customName,
    title: customTitle,
    avatar: customAvatar,
    description: customDescription,
    difficulty: customDifficulty,
    accentColor: 'indigo',
    quote: customQuote,
    focuses: customFocuses.split(',').map(f => f.trim()).filter(Boolean)
  } : (LECTURERS.find(l => l.id === selectedDosen) || LECTURERS[0]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* View Header */}
      <div className="mb-8 text-center md:text-left">
        <h2 className="font-display text-3xl font-black text-slate-900 mb-2 flex items-center justify-center md:justify-start gap-3">
          <GraduationCap className="text-amber-500 w-8 h-8 stroke-[2.5]" />
          MULAI PERSIAPAN SIDANG SKRIPSI
        </h2>
        <p className="text-slate-600 text-sm font-bold">
          Lengkapi detail skripsi Anda, pilih dosen penguji, dan rasakan atmosfer ujian yang kritis serta autentik.
        </p>
      </div>

      <form onSubmit={handleCreateSession} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: Skripsi Form (Colspan 2) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border-3 border-black p-6 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-5 text-slate-800">
              <div className="flex items-center justify-between border-b-2 border-black pb-4 flex-wrap gap-2">
                <h3 className="font-display font-black text-lg text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  Karya Tulis Skripsi
                </h3>
                
                {/* Instant Example Complete Popover */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-700 font-mono font-bold">Gunakan Contoh:</span>
                  <div className="flex gap-1.5">
                    {CONTOH_SKRIPSI.map((ex, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleLoadExample(i)}
                        title={ex.tag}
                        className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-indigo-400 text-slate-950 hover:bg-indigo-300 transition-colors border-2 border-black shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] cursor-pointer"
                      >
                        SKRIPSI {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-2 text-left">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  Judul Skripsi
                  <span className="text-[10px] text-slate-505 text-slate-500 lowercase font-mono">{judul.length}/500 karakter</span>
                </label>
                <input
                  type="text"
                  maxLength={500}
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Contoh: Klasifikasi Penyakit Daun Padi Sawah Menggunakan Model Deep Learning..."
                  className="w-full px-4 py-3 bg-white border-2 border-black text-slate-900 placeholder-slate-400 rounded-xl focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-black transition-all text-sm font-semibold"
                />
              </div>

              {/* Abstract Input */}
              <div className="space-y-2 text-left">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  Abstrak Skripsi
                  <span className="text-[10px] text-slate-505 text-slate-500 lowercase font-mono">{abstrak.length}/5000 karakter</span>
                </label>
                <textarea
                  maxLength={5000}
                  rows={8}
                  value={abstrak}
                  onChange={(e) => setAbstrak(e.target.value)}
                  placeholder="Salin potongan teks abstrak skripsi Anda di sini. Jelaskan latar belakang, metode penelitian, ukuran sampel, hasil temuan, dan akurasi/skor kesuksesan penelitian agar AI dapat menguji Anda dengan akurasi maksimal..."
                  className="w-full px-4 py-3 bg-white border-2 border-black text-slate-900 placeholder-slate-400 rounded-xl focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-black transition-all text-sm font-medium leading-relaxed resize-none font-sans"
                />
              </div>
            </div>
          </div>

          {/* RIGHT: Dosen Picker Info (Colspan 1) */}
          <div className="space-y-6">
            <div className="bg-white border-3 border-black p-6 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between min-h-[410px] text-slate-800">
              <div>
                <h3 className="font-display font-black text-lg text-slate-900 mb-4 border-b-2 border-black pb-3 flex items-center gap-2 uppercase tracking-wide">
                  <UserCheck className="w-5 h-5 text-amber-500" />
                  Dosen Utama Anda
                </h3>

                {/* Grid lecturers buttons icons */}
                <div className="grid grid-cols-5 gap-1.5 mb-4">
                  {LECTURERS.map((lecturer) => {
                    const isSelected = selectedDosen === lecturer.id;
                    return (
                      <button
                        key={lecturer.id}
                        type="button"
                        onClick={() => setSelectedDosen(lecturer.id)}
                        className={`py-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400 border-black text-slate-950 font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-x-0.5 -translate-y-0.5'
                            : 'bg-[#faf6ee] border-black text-slate-700 font-bold shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] hover:bg-[#eae6de]'
                        }`}
                      >
                        <span className="text-xl mb-0.5">{lecturer.avatar}</span>
                        <span className={`text-[8px] md:text-[9px] font-bold tracking-tight text-center max-w-[50px] truncate ${
                          isSelected ? 'text-slate-950 font-black' : 'text-slate-500'
                        }`}>
                          {lecturer.id === 'perfeksionis' ? 'Hartono' :
                           lecturer.id === 'filosof' ? 'Widjaja' :
                           lecturer.id === 'metodologi' ? 'Siti' : 'Rudi'}
                        </span>
                      </button>
                    );
                  })}
                  {/* Custom Lecturer Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedDosen('custom')}
                    className={`py-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                      selectedDosen === 'custom'
                        ? 'bg-amber-400 border-black text-slate-950 font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-x-0.5 -translate-y-0.5'
                        : 'bg-[#faf6ee] border-black text-indigo-600 font-bold shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] hover:bg-[#eae6de]'
                    }`}
                  >
                    <span className="text-xl mb-0.5">✍️</span>
                    <span className={`text-[8.5px] md:text-[9.5px] font-bold tracking-tight text-center ${
                      selectedDosen === 'custom' ? 'text-slate-950 font-black' : 'text-indigo-600'
                    }`}>
                      Kustom
                    </span>
                  </button>
                </div>

                {/* Sub info active selected lecturer */}
                <div className="bg-[#faf6ee] border-2 border-black p-4 rounded-xl space-y-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-[#0f172a]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-wider font-extrabold uppercase text-slate-600 font-bold">Tipe Karakter</span>
                    <span className="text-xs font-black text-slate-900">{activeLecturer.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-wider font-extrabold uppercase text-slate-600 font-bold">Kesulitan</span>
                    <span className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded border-2 border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] ${
                      activeLecturer.difficulty === 'Sangat Tinggi' ? 'bg-rose-500 text-slate-955 text-slate-955 text-slate-950' :
                      activeLecturer.difficulty === 'Tinggi' ? 'bg-orange-400 text-slate-950' :
                      activeLecturer.difficulty === 'Membingungkan' ? 'bg-sky-300 text-slate-950' :
                      'bg-amber-400 text-slate-950'
                    }`}>
                      {activeLecturer.difficulty.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-slate-700 text-xs leading-relaxed border-t-2 border-black pt-3 font-semibold text-left">
                    {activeLecturer.description}
                  </p>
                  
                  {/* Dynamic Focus Lists */}
                  <div className="space-y-1.5 pt-1.5 border-t-2 border-black">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-extrabold block text-left">Fokus Pertanyaan:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeLecturer.focuses.map((f, idx) => (
                        <span key={idx} className="bg-indigo-400 px-2 py-0.5 rounded-md text-[10px] border border-black text-slate-950 font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quote from lecturer */}
              <div className="mt-4 bg-indigo-50 p-3.5 rounded-xl border-2 border-indigo-300 border-dashed flex gap-2 items-start text-left">
                <Quote className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5 stroke-[2.5]" />
                <p className="text-indigo-900 font-display text-[11px] italic leading-relaxed font-bold">
                  "{activeLecturer.quote}"
                </p>
              </div>
            </div>

            {/* Custom Lecturer Form Section */}
            {selectedDosen === 'custom' && (
              <div className="bg-white border-3 border-black p-5 rounded-2xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-4 animate-fade-in text-left text-[#0f172a]">
                <div className="border-b-2 border-black pb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4.5 h-4.5 text-amber-500" />
                  <h4 className="font-display font-black text-[14px] text-slate-900 uppercase tracking-wide">Sesuaikan Dosen Nyata Anda</h4>
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#1e293b]">Gelar & Nama Lengkap</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Contoh: Dr. Ir. Joko Susilo, M.Eng."
                    className="w-full px-3 py-2 bg-[#faf6ee] border-2 border-black text-slate-900 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#1e293b]">Jabatan Sidang</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Contoh: Penguji Utama / Ketua Penguji"
                    className="w-full px-3 py-2 bg-[#faf6ee] border-2 border-black text-slate-900 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>

                {/* Avatar emojis & Difficulty */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#1e293b]">Pilih Avatar</label>
                    <select
                      value={customAvatar}
                      onChange={(e) => setCustomAvatar(e.target.value)}
                      className="w-full px-2 py-2 bg-[#faf6ee] border-2 border-black text-slate-900 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-650 focus:bg-white"
                    >
                      <option value="👹" className="bg-white text-slate-900">👹 Penguji Killer</option>
                      <option value="👨‍🏫" className="bg-white text-slate-900">👨‍🏫 Dosen Pria</option>
                      <option value="👩‍🏫" className="bg-white text-slate-900">👩‍🏫 Dosen Wanita</option>
                      <option value="👴" className="bg-white text-slate-900">👴 Dosen Senior</option>
                      <option value="🧐" className="bg-white text-slate-900">🧐 Skeptis Berat</option>
                      <option value="🤠" className="bg-white text-slate-900">🤠 Humoris/Santai</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#1e293b]">Tingkat Kesulitan</label>
                    <select
                      value={customDifficulty}
                      onChange={(e) => setCustomDifficulty(e.target.value)}
                      className="w-full px-2 py-2 bg-[#faf6ee] border-2 border-black text-slate-900 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-650 focus:bg-white"
                    >
                      <option value="Sangat Tinggi" className="bg-white text-slate-900 font-bold">Sangat Tinggi</option>
                      <option value="Tinggi" className="bg-white text-slate-900 font-bold">Tinggi</option>
                      <option value="Medium" className="bg-white text-slate-900 font-bold">Medium</option>
                      <option value="Membingungkan" className="bg-white text-slate-900 font-bold">Membingungkan</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 flex justify-between">
                    <span>Watak & Gaya Bicara</span>
                    <span className="text-[9px] text-slate-600 lowercase italic">menerangkan prompt AI</span>
                  </label>
                  <textarea
                    rows={3}
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Contoh: Dosen perfeksionis tata tulis yang sangat alergi pada typo, menggunakan tutur kata formal, dingin, bergelar tinggi, dan suka menguji kelayakan sitasi."
                    className="w-full px-3 py-2 bg-[#faf6ee] border-2 border-black text-slate-900 rounded-lg text-xs leading-relaxed focus:outline-none focus:border-indigo-650 focus:bg-white resize-none"
                  />
                </div>

                {/* Focus list split by comma */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#1e293b]">Fokus Pertanyaan (Pisah Koma)</label>
                  <input
                    type="text"
                    value={customFocuses}
                    onChange={(e) => setCustomFocuses(e.target.value)}
                    placeholder="Contoh: Orisinalitas, Metodologi, Tata Tulis"
                    className="w-full px-3 py-2 bg-[#faf6ee] border-2 border-black text-slate-900 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-650 focus:bg-white"
                  />
                </div>

                {/* Favorite quote */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#1e293b]">Kalimat Andalan (Quote)</label>
                  <input
                    type="text"
                    value={customQuote}
                    onChange={(e) => setCustomQuote(e.target.value)}
                    placeholder="Contoh: Dari mana data ini Anda manipulasi?"
                    className="w-full px-3 py-2 bg-[#faf6ee] border-2 border-black text-slate-900 rounded-lg text-xs italic focus:outline-none focus:border-indigo-650 focus:bg-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Trigger Buttons bottom */}
        <div className="flex flex-col items-center justify-center pt-4 space-y-4">
          {error && (
            <div className="text-rose-950 text-sm flex items-center gap-2 bg-rose-400 px-4 py-2.5 rounded-xl border-2 border-black font-extrabold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] max-w-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-slate-950" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            id="btn_submit_setup"
            disabled={loading}
            className="group relative px-10 py-5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-display font-black text-xl rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[9px_9px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-3 w-full sm:w-auto disabled:opacity-50 cursor-pointer overflow-hidden leading-none"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-3 border-slate-950 border-t-transparent rounded-full animate-spin mr-1" />
                Mendaftarkan Sidang...
              </>
            ) : (
              <>
                MULAI SIMULASI SIDANG
                <Sparkles className="w-5 h-5 fill-slate-950 text-slate-950 group-hover:scale-110 transition-transform" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
