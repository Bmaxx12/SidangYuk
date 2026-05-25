import { LecturerProfile } from '../types';

export const LECTURERS: LecturerProfile[] = [
  {
    id: 'perfeksionis',
    name: 'Dr. Ir. Hartono, M.T.',
    title: 'Kaprodi / Penguji Utama',
    avatar: '👨‍🏫',
    description: 'Fokus melototi tata tulis, format sitasi, konsistensi istilah ilmiah, dan akurasi diagram alir. Jangan berani-berani ada typo depan beliau.',
    difficulty: 'Sangat Tinggi',
    accentColor: 'rose',
    quote: '"Saudara membaca buku pedoman kampus tidak? Mengapa istilah asing di halaman 14 tidak dicetak miring?"',
    focuses: ['Format & Tata Tulis', 'Konsistensi Metrik', 'Definisi Operasional']
  },
  {
    id: 'filosof',
    name: 'Prof. Dr. Widjaja, S.S., M.Hum.',
    title: 'Penguji Ahli Kebijakan',
    avatar: '🧙‍♂️',
    description: 'Mengabaikan detail baris instruksi teknis, tapi mencecar filosofi dasar ("Mengapa Anda memilih topik ini?", "Apa kontribusi ontologis Anda bagi dunia?").',
    difficulty: 'Tinggi',
    accentColor: 'indigo',
    quote: '"Bagi saya program itu sekadar kulit. Saya ingin bertanya: Jika sistem Anda ini runtuh esok hari, apa signifikansi eksistensial riset Anda?"',
    focuses: ['Dasar Pemikiran', 'Signifikansi Masalah', 'Argumen Filosofis']
  },
  {
    id: 'metodologi',
    name: 'Siti Aminah, Ph.D.',
    title: 'Pakar Statistik & Metodologi',
    avatar: '👩‍🏫', // custom teacher emoji
    description: 'Pakar metodologi penelitian, data sampling, margin-of-error, dan validasi teori. Beliau alergi berat dengan klaim subjektif tanpa pembuktian statistik.',
    difficulty: 'Sangat Tinggi',
    accentColor: 'sky',
    quote: '"Anda mengklaim model Anda akurat. Mana uji normalitas datanya? Kenapa ukuran sampel Anda di bawah ambang batas Slovin?"',
    focuses: ['Ukuran Sampel', 'Uji Validitas & Reliabilitas', 'Bukti Pengujian Empiris']
  },
  {
    id: 'jebakan',
    name: 'Rudi Hermawan, M.Kom.',
    title: 'Sekretaris Sidang / Penguji Praktis',
    avatar: '👨‍💻',
    description: 'Terlihat sangat ramah, murah senyum, santai, dan seakan membela Anda. Namun pertanyaan-pertanyaannya penuh jebakan sesat logika demi menguji keyakinan teori Anda.',
    difficulty: 'Membingungkan',
    accentColor: 'amber',
    quote: '"Sistem Anda ini kan gampang sekali ya, kenapa tidak pakai Deep Learning saja di komputer jinjing dosen biar kelihatan canggih?"',
    focuses: ['Keteguhan Pendirian', 'Pemahaman Teori Dasar', 'Logika Penalaran']
  }
];
