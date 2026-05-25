// Indonesian Filler Words detection definition

export const INDO_FILLERS_MAP = {
  'ee': /\\beee*\\b|\\be*h\\b/gi,
  'anu': /\\banu\\b/gi,
  'kayaknya': /\\bkayak(nya)?\\b|\\bkayak-kayak\\b/gi,
  'mungkin': /\\bmungkin\\b/gi,
  'terus': /\\bterus\\b|\\btrus\\b/gi,
  'apa': /\\bapa(an)?\\b/gi,
  'itu': /\\bitu\\b/gi,
  'jadi': /\\bjadi\\b/gi,
  'hmm': /\\bhmmm*\\b/gi,
  'sih': /\\bsih\\b/gi,
};

export interface FillerStats {
  total: number;
  breakdown: Record<string, number>;
}

export function detectFillers(text: string): FillerStats {
  if (!text) return { total: 0, breakdown: {} };
  
  const breakdown: Record<string, number> = {};
  let total = 0;

  // Let's count fillers using clean word matching
  const words = text.toLowerCase().split(/\s+/);
  
  const fillerWordTargets = ['ee', 'eee', 'anu', 'kayaknya', 'mungkin', 'terus', 'trus', 'apa', 'itu', 'jadi', 'hmm', 'hmmm', 'sih', 'dong', 'kayak'];
  
  words.forEach(word => {
    // strip punctuation
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    if (fillerWordTargets.includes(cleanWord)) {
      let category = cleanWord;
      if (cleanWord === 'eee' || cleanWord === 'ee') category = 'ee';
      if (cleanWord === 'trus' || cleanWord === 'terus') category = 'terus';
      if (cleanWord === 'hmmm' || cleanWord === 'hmm') category = 'hmm';
      if (cleanWord === 'kayak' || cleanWord === 'kayaknya') category = 'kayaknya';

      breakdown[category] = (breakdown[category] || 0) + 1;
      total += 1;
    }
  });

  return { total, breakdown };
}

export function calculateWpms(wordCount: number, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0;
  const minutes = durationSeconds / 60;
  return Math.round(wordCount / minutes);
}

export function getSpeedCategory(wpm: number): {
  label: string;
  color: string;
  description: string;
} {
  if (wpm === 0) return { label: 'Tidak Berbicara', color: 'text-gray-400', description: 'Sunyi atau tidak terdeteksi suara' };
  if (wpm < 80) return { label: 'Terlalu Lambat', color: 'text-amber-500', description: 'Berbicara lambat, berisiko menguji kesabaran dosen' };
  if (wpm <= 140) return { label: 'Sangat Ideal', color: 'text-emerald-500', description: 'Tempo bicara prima, tenang, dan profesional' };
  if (wpm <= 180) return { label: 'Sedikit Cepat', color: 'text-orange-500', description: 'Sedikit terburu-buru, coba stabilkan napas Anda' };
  return { label: 'Terlalu Cepat (Gugup)', color: 'text-rose-500', description: 'Sangat cepat, dosen mungkin kesulitan mencerna poin Anda' };
}
