export type DosenType = 'perfeksionis' | 'filosof' | 'metodologi' | 'jebakan' | 'custom' | string;

export interface LecturerProfile {
  id: string;
  name: string;
  title: string;
  avatar: string;
  description: string;
  difficulty: 'Sangat Tinggi' | 'Medium' | 'Tinggi' | 'Membingungkan' | string;
  accentColor: string;
  quote: string;
  focuses: string[];
}

export interface Session {
  id: string;
  userId: string;
  judul: string;
  abstrak: string;
  dosenType: DosenType;
  customLecturer?: LecturerProfile;
  status: 'setup' | 'inprogress' | 'verdict';
  currentQuestionIndex: number;
  createdAt: string;
}

export interface Question {
  id: string;
  sessionId: string;
  orderNum: number;
  questionText: string;
  isFollowup: boolean;
  transcript?: string;
  wpm?: number;
  fillerCount?: number;
  fillerWords?: Record<string, number>;
  aiScore?: number;
  aiFeedback?: string;
}

export interface Verdict {
  id: string;
  sessionId: string;
  overallScore: number;
  result: 'LULUS DENGAN PUJIAN' | 'LULUS' | 'REVISI OPTIONAL' | 'REVISI MAYOR' | 'TIDAK LULUS';
  scoreMateri: number;
  scoreMetodologi: number;
  scoreArgumentasi: number;
  scoreKontribusi: number;
  scoreTekanan: number;
  catatanDosen: string;
}
