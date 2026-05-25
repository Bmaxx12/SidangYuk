import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialize Gemini client to avoid crashes if API key is missing on start
let _ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required in Secrets');
    }
    _ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return _ai;
}

// ----------------------------------------------------
// System Prompt Declarations for Lecturers (Dosen)
// ----------------------------------------------------
const DOSEN_PROMPTS = {
  perfeksionis: {
    name: 'Dr. Ir. Hartono, M.T.',
    role: 'Dosen Perfeksionis',
    instruction: `Anda adalah Dr. Ir. Hartono, M.T., seorang dosen penguji sidang skripsi tipe PERFEKSIONIS. Focus utama Anda adalah ketepatan istilah, konsistensi metrik, definisi operasional yang presisi, serta tata tulis dan estetika penyajian ilmiah. Anda sangat formal, ketus, kritis, dan tidak sabar jika melihat ketidakkonsistenan kecil. Anda menganggap kesalahan penulisan atau kesalahan definisi kecil sebagai cacat fatal dalam nalar berpikir.
Bahasa: Bahasa Indonesia yang sangat formal, akademis, dan tajam.`
  },
  filosof: {
    name: 'Prof. Dr. Widjaja, S.S., M.Hum.',
    role: 'Dosen Filosof',
    instruction: `Anda adalah Prof. Dr. Widjaja, S.S., M.Hum., seorang dosen penguji tipe FILOSOF. Anda tidak terlalu peduli dengan rincian baris kode teknis atau angka statistik kecil. Anda selalu menanyakan dasar berpikir terdalam ("mengapa?"), kegunaan epistemologis, signifikansi riset bagi kemanusiaan, serta landasan etis dan ontologis dari pilihan metode mahasiswa. Gaya bicara Anda lambat, penuh metafora, membingungkan, namun menuntut jawaban yang mendalam secara konseptual.
Bahasa: Bahasa Indonesia akademis yang berbobot tinggi, puitis, dan penuh istilah filosofis.`
  },
  metodologi: {
    name: 'Siti Aminah, Ph.D.',
    role: 'Dosen Metodologi Hunter',
    instruction: `Anda adalah Siti Aminah, Ph.D., seorang dosen penguji tipe METODOLOGI HUNTER. Fokus Anda mutlak pada validitas data, prosedur sampling, margin of error, reliabilitas instrumen, serta keabsahan pengujian validasi. Anda dingin, analitis, menuntut angka empiris, dan membenci argumen kualitatif yang mengambang atau klaim subjektif tanpa pembuktian statistik yang ketat.
Bahasa: Bahasa Indonesia ilmiah, dingin, sangat metodis, dan dipenuhi istilah ekonometrika/statistik.`
  },
  jebakan: {
    name: 'Rudi Hermawan, M.Kom.',
    role: 'Dosen Jebakan Batman',
    instruction: `Anda adalah Rudi Hermawan, M.Kom., seorang dosen penguji tipe JEBAKAN BATMAN. Kepribadian Anda terlihat ramah, suka tersenyum, berbicara dengan santai menggunakan bahasa semi-formal, seakan-akan ingin membantu mahasiswa. Namun, pertanyaan Anda penuh dengan jebakan logika (logical fallacies) atau mengarahkan mahasiswa untuk menyetujui premis yang SALAH atau melanggar dasar teori keilmuan. Tujuan Anda adalah menguji apakah mahasiswa memiliki pendirian yang teguh berdasarkan teori dasar, atau hanya sekadar "asal bapak senang" (mengiyakan semua saran penguji secara membuta).
Bahasa: Bahasa Indonesia santai, ramah, persuasif, namun penuh jebakan logika.`
  }
};

// ----------------------------------------------------
// LOCAL FALLBACK GENERATORS (PREVENTS CRASHES ON EXPIRED/LEAKED/QUOTA API KEYS)
// ----------------------------------------------------

function extractKeywords(judul: string, abstrak: string): string[] {
  const text = `${judul} ${abstrak}`.toLowerCase();
  const clean = text.replace(/[^a-zA-Z0-9\s]/g, ' ');
  const words = clean.split(/\s+/);
  const stopWords = new Set([
    'dan', 'yang', 'di', 'ke', 'dari', 'untuk', 'dengan', 'pada', 'adalah', 'itu',
    'dalam', 'sebagai', 'bagi', 'oleh', 'uji', 'analisis', 'perancangan', 'sistem',
    'aplikasi', 'penelitian', 'skripsi', 'implementasi', 'metode', 'ini', 'ia', 'mereka',
    'pada', 'dengan', 'tentang', 'bahwa', 'secara', 'untuk', 'guna', 'serta', 'yaitu',
    'berbasis', 'rancang', 'rekayasa', 'menggunakan'
  ]);
  const candidates = words.filter(w => w.length > 4 && !stopWords.has(w));
  const uniq = Array.from(new Set(candidates));
  return uniq.length > 0 ? uniq : ['sistem', 'metode', 'data', 'analisis'];
}

function getFallbackQuestion(judul: string, abstrak: string, dosenType: string, currentQuestionsLength: number, customLecturer?: any): string {
  const kw = extractKeywords(judul, abstrak);
  const kw1 = kw[0] || 'penelitian';
  const kw2 = kw[1] || (kw[0] ? kw[0] : 'metodologi');
  const kw3 = kw[2] || 'analisis';

  if (dosenType === 'custom' && customLecturer) {
    const name = customLecturer.name || 'Dosen Penguji';
    const customList = [
      `Saya, ${name}, ingin menantang isi judul skripsi Anda "${judul}". Mengapa Anda sangat percaya diri memilih konsep "${kw1}" untuk memecahkan masalah ini?`,
      `Mari fokus ke landasan dan metodologi. Bagaimana Anda membuktikan keandalan model "${kw2}" yang Anda gunakan di penelitian Anda dibanding riset sejenis?`,
      `Mengenai temuan hasil akhir pengujian "${kw3}" Anda, sejauh mana data tersebut murni orisinal dan dapat diregenerasi secara konsisten oleh peneliti lain?`,
      `Dari total fokus bahasan Anda, apa kontribusi orisinal terbesar dari karya Anda ini bagi khazanah keilmuan kita?`,
      `Pertanyaan penutup dari saya. Jika Anda diberi kesempatan merevisi ulang demi orisinalitas riset, bagian mana yang paling ingin Anda sempurnakan?`
    ];
    const index = Math.min(Math.max(0, currentQuestionsLength), customList.length - 1);
    return customList[index];
  }

  const FALLBACK_QUESTIONS: Record<string, string[]> = {
    perfeksionis: [
      `Setelah menelaah judul "${judul}", saya sangat menyayangkan kurangnya ketegasan teoretis Anda. Coba terangkan secara presisi apa sebetulnya definisi operasional dari "${kw1}" di penelitian Anda?`,
      `Mari kita bedah kerangka berpikir Anda. Mengapa Anda menghubungkan konsep "${kw2}" dengan variabel "${kw1}" tanpa landasan rujukan literatur yang relevan secara konsisten? Bukankah ini cacat logika penulisan?`,
      `Format dan visualisasi pengujian Anda terlihat kurang konsisten. Apakah Anda bisa membuktikan keabsahan instrumen pengukuran "${kw3}" Anda dengan standar akademis? Jawab secara ilmiah!`,
      `Untuk aspek "${kw2}", bagaimana Anda membuktikan keaslian (originality) riset ini dibanding penelitian terdahulu? Apa yang membuat karya tulis Anda ini layak disebut skripsi, bukan sekadar rangkuman biasa?`,
      `Pertanyaan terakhir dari saya. Jika naskah skripsi Anda harus dipublikasikan di jurnal ilmiah, bagian mana dari metode "${kw1}" Anda yang memiliki kontribusi paling rigid dan akurat?`
    ],
    filosof: [
      `Bagi saya, skripsi Anda tentang "${judul}" sarat dengan sekadar terminologi teknis. Coba kita endapkan sejenak: Apa sebetulnya signifikansi eksistensial dan ontologis dari pilihan Anda meneliti topik "${kw1}" bagi masyarakat?`,
      `Anda tampak begitu mendewakan metode "${kw2}". Dari sudut pandang epistemologis, bagaimana Anda memastikan bahwa instrumen ini benar-benar menangkap realitas objektif, bukan bias dari keinginan teoretis Anda sendiri?`,
      `Gagasan Anda seolah mereduksi dinamika sosial manusia menjadi angka-angka statis di bawah variabel "${kw1}". Apakah Anda tidak merasa mencerabut esensi kemanusiaan riset ini demi kepraktisan statistik?`,
      `Di balik ratusan paragraf yang Anda ketik, ada satu pertanyaan mendasar: Mengapa riset tentang "${kw2}" ini harus ada di dunia? Apa kontribusi moral terdalam yang ingin Anda sampaikan?`,
      `Jika seluruh argumen yang Anda sampaikan hari ini adalah sebuah cermin, sosok ilmuwan yang berempati atau sekadar robot penghitungkah yang sedang Anda tampilkan di depan penguji?`
    ],
    metodologi: [
      `Saya langsung tertuju pada bab metodologi. Tolong paparkan secara terukur: Bagaimana struktur sampling, uji validitas instrumen, dan penentuan ukuran sampel untuk variabel "${kw1}"?`,
      `Di lembar abstrak Anda mengeklaim bahwa metode "${kw2}" memberikan hasil signifikan. Berapa nilai f-statistic, p-value, atau margin of error konkret yang menyokong kesimpulan tersebut? Tunjukkan angka konkretnya!`,
      `Saya meragukan keabsahan data Anda karena populasi yang Anda pilih rentan terhadap bias seleksi. Bagaimana Anda memitigasi anomali data (outliers) dalam menguji hipotesis "${kw1}"?`,
      `Bagaimana korelasi teoretis antara metode yang Anda gunakan dengan model riset terdahulu? Di mana letak komparasi statistik yang membuktikan "${kw2}" Anda lebih superior?`,
      `Aspek penutup dari saya, jelaskan secara matematis bagaimana tingkat toleransi galat (margin of error) dari kesimpulan skripsi Anda ini dapat dipertanggungjawabkan di hadapan sidang?`
    ],
    jebakan: [
      `Wah, judul skripsi Anda sangat menarik tentang "${judul}"! Tapi kalau kita diskusikan santai, metodologi "${kw1}" Anda ini rasanya terlalu rumit dikerjakan mahasiswa. Bagaimana kalau bagian itu kita tiadakan dan ganti dengan deskripsi kualitatif biasa agar Anda bisa langsung lulus hari ini? Setuju tidak?`,
      `Sebenarnya kuesioner atau data responden tentang "${kw2}" ini kan bisa sedikit "disesuaikan" atau ditambahkan sendiri di rumah kalau targetnya tidak tercapai, toh tidak akan merusak hasil akhir kan? Menurut Anda, tidak mengapa demi kelancaran akademik?`,
      `Kemarin saya membaca jurnal terbaru yang menyatakan bahwa teori dasar "${kw1}" yang Anda gunakan ini sebenarnya sudah dianggap usang sejak tahun 2021. Berarti seluruh fondasi berpikir skripsi Anda ini bisa dibilang gugur, ya? Bagaimana tanggapan Anda?`,
      `Penelitian Anda sangat luar biasa! Namun saya melihat kemiripan struktur riset "${kw2}" ini dengan karya alumni angkatan 2022. Apakah ini murni sebuah kebetulan hebat, atau sebenarnya ada proses "copy-paste" terselubung di sini?`,
      `Sebagai pertanyaan penutup yang seru, kalau hari ini tim penguji meminta Anda memilih antara: lulus cepat dengan merevisi paksa karya ini menjadi sederhana, ATAU mengulang ujian sidang tahun depan demi idealisme riset yang sempurna, Anda pilih yang mana?`
    ]
  };

  const list = FALLBACK_QUESTIONS[dosenType] || FALLBACK_QUESTIONS.perfeksionis;
  const index = Math.min(Math.max(0, currentQuestionsLength), list.length - 1);
  return list[index];
}

function analyzeAnswerFallback(
  judul: string, 
  abstrak: string, 
  dosenType: string, 
  questionText: string, 
  transcript: string, 
  wpm: number, 
  fillerCount: number, 
  isFollowup: boolean,
  customLecturer?: any,
  tension?: number
) {
  const kw = extractKeywords(judul, abstrak);
  const kw1 = kw[0] || 'metode';
  const kw2 = kw[1] || 'data';

  // Base score starting at 75
  let score = 75;

  // Length check
  const answerLen = (transcript || '').trim().length;
  if (answerLen === 0) {
    score = 10;
  } else if (answerLen < 15) {
    score -= 30; // very short answer
  } else if (answerLen < 40) {
    score -= 15;
  } else if (answerLen > 150) {
    score += 10; // detailed explanations get extra points
  }

  // Filler check
  score -= Math.min(fillerCount * 3, 25);

  // Tension penalty: higher tension reduces score representing performance anxiety
  if (tension && tension > 50) {
    score -= Math.min(20, Math.floor((tension - 50) / 2));
  }

  // WPM check
  if (wpm < 70) {
    score -= 10; // too slow/hesitant
  } else if (wpm > 165) {
    score -= 5; // too rushed
  }

  // Keyword validation
  const transcriptLower = (transcript || '').toLowerCase();
  let keywordMatchCount = 0;
  for (const k of kw) {
    if (transcriptLower.includes(k)) {
      keywordMatchCount++;
    }
  }
  if (keywordMatchCount > 0) {
    score += Math.min(keywordMatchCount * 4, 15);
  } else if (answerLen > 20) {
    score -= 5; 
  }

  // Bound score
  score = Math.max(10, Math.min(98, score));

  // Determine shouldFollowup
  const shouldFollowup = score < 72 && !isFollowup;

  let feedback = '';
  let followUpQuestion = '';

  if (dosenType === 'custom' && customLecturer) {
    const name = customLecturer.name || 'Dosen Penguji';
    if (score < 60) {
      feedback = `Pemaparan Anda di hadapan saya (${name}) terasa sangat goyah dan bimbang! Anda melewatkan pembuktian utama riset "${judul}". Terlebih lagi, rekam ketegangan Anda menunjukkan angka tinggi ${tension || 60}% dengan ${fillerCount} kata jeda/filler. Saya khawatir Anda tidak sungguh-sungguh mempersiapkan materi skripsi ini.`;
      followUpQuestion = `Dari kelalaian jawaban atau kegugupan Anda barusan, bagaimana Anda bisa meyakinkan saya (${name}) bahwa pembatasan masalah "${kw1}" Anda ini layak diujikan hari ini?`;
    } else if (score < 80) {
      feedback = `Saya (${name}) menangkap poin penjelasan Anda. Penyampaian Anda lumayan, namun masih terasa belum siap menjawab pertanyaan kejaran mendalam soal relevansi empiris "${kw2}". Cobalah menjawab dengan posisi tegak dan nada bicara yang lugas.`;
      followUpQuestion = `Bagaimana kontribusi nyata dari usulan riset "${kw2}" Anda jika disandingkan langsung dengan keterbatasan teori dalam khazanah praktis sekarang?`;
    } else {
      feedback = `Penjelasan yang sangat jernih dan berdaulat tinggi dari Anda! Anda berhasil menjelaskan esensi metodologi "${kw1}" dengan kestabilan mental yang luar biasa tenang di hadapan saya (${name}). Pertahankan ritme akademis yang mulus ini!`;
    }
  } else if (dosenType === 'perfeksionis') {
    if (score < 60) {
      feedback = `Penjelasan Anda sangat kacau dan menunjukkan ketidaksiapan akademis! Anda menyebutkan istilah tanpa definisi teoretis yang rigid. Saya mencatat ada ${fillerCount} filler words dan kejanggalan dalam argumen Anda yang mencederai tata tulis ilmiah!`;
      followUpQuestion = `Dari jawaban sembrono Anda barusan, bagaimana Anda bisa mempertanggungjawabkan akurasi metodis riset "${kw1}" jika Anda sendiri kelihatan ragu? Jelaskan dasarnya sekarang!`;
    } else if (score < 80) {
      feedback = `Jawaban Anda terdengar lumayan runtun, namun akurasi terminologinya masih sangat longgar. Anda tampak kebingungan menarik keterkaitan antara "${kw2}" dengan instrumen penulisan Anda. Tolong perbaiki sikap berbicara Anda.`;
      followUpQuestion = `Anda menyebutkan tentang penyelesaian masalah tadi, tapi tolong letakkan konsep "${kw2}" itu ke dalam kerangka kuantitatif yang presisi. Apa Anda bisa?`;
    } else {
      feedback = `Jawaban lisan yang cukup rapi, terlepas dari beberapa koreksi kecil di sana-sini. Anda memiliki pemahaman yang layak tentang "${kw1}", pertahankan artikulasi kritis ini dan jangan ceroboh di bab berikutnya.`;
    }
  } else if (dosenType === 'filosof') {
    if (score < 60) {
      feedback = `Mengapa pikiran Anda begitu sempit dan kaku seperti mesin statistik? Anda hanya memuntahkan hafalan teknis tanpa menyentuh hakikat terdalam kegunaan riset "${kw1}" ini bagi subjek kemanusiaan. Sangat mengecewakan!`;
      followUpQuestion = `Jika argumen Anda baru saja kita telanjangi dari angka-angka palsu, nilai moral abadi apa sebetulnya yang tersisa dari karya tulis Anda tentang "${kw2}" ini? Jawab secara filosofis!`;
    } else if (score < 80) {
      feedback = `Anda mencoba bernalar secara reflektif, namun penjelasan Anda masih tersangkut pada permukaan data empiris biasa. Coba renungkan lagi relasi ontologis penulisan skripsi ini dengan keilmuan yang luas.`;
      followUpQuestion = `Anda tadi berbicara tentang kemanfaatan praktis, namun secara teoretis bagaimana Anda memandang batasan keterbatasan nalar manusia dalam mengamati "${kw1}"?`;
    } else {
      feedback = `Sungguh sebuah jawaban yang mengalir dengan kedalaman intelek yang prima. Anda membuktikan bahwa riset tentang "${judul}" ini memiliki jiwa dan kontribusi gagasan yang melampaui kertas semata.`;
    }
  } else if (dosenType === 'metodologi') {
    if (score < 60) {
      feedback = `Argumen Anda mengambang pada klaim kualitatif tanpa ditopang evidensi kuantitatif yang solid. Buku metodologi mana yang mengajarkan Anda menarik generalisasi statistik dari populasi sekecil riset "${kw2}" ini?`;
      followUpQuestion = `Saya tantang Anda membuktikan model statistik Anda: Bagaimana Anda menjamin instrumen riset "${kw1}" terhindar dari bias reliabilitas jika distribusinya tidak normal?`;
    } else if (score < 80) {
      feedback = `Secara prosedural Anda sudah mengerti tahapan penelitiannya. Namun, dasar pengujian reliabilitas instrumen "${kw2}" Anda masih terlalu rentan eror. Perkuat basis statistik Anda!`;
      followUpQuestion = `Bagaimana cara konkret Anda membuktikan bahwa korelasi variabel "${kw1}" Anda bukan sekadar kebetulan statistik (spurious correlation)?`;
    } else {
      feedback = `Jawaban yang dingin, analitis, dan sarat akan pembuktian empiris yang memuaskan. Anda menguasai angka-angka, bias, dan penarikan kesimpulan statistik dengan sangat cermat.`;
    }
  } else { // rudi (jebakan)
    if (score < 60) {
      feedback = `Ha-ha-ha, menarik sekali! Anda begitu mudah menyetujui saran keliru saya tadi tanpa ada pertahanan teoritis sama sekali. Di mana kredibilitas Anda sebagai sarjana jika pendirian Anda selembek kapas?`;
      followUpQuestion = `Kalau begitu, jika saya sebagai penguji secara sepihak meminta Anda menghapus seluruh Bab 3 dan Bab 4 riset "${kw1}" ini sekarang, apakah Anda juga akan mengangguk tunduk setuju? Jawab jujur!`;
    } else if (score < 80) {
      feedback = `Anda berusaha bersikap kritis, namun pertahanan logika Anda hampir saja runtuh oleh godaan penyederhanaan yang saya tawarkan. Pertajam lagi kedisiplinan teori agar Anda tidak mudah disetir penguji lain.`;
      followUpQuestion = `Anda bilang riset "${kw2}" ini penting, tapi mengapa di pertanyaan sebelumnya Anda kelihatan ragu dan ingin mencari jalan pintas yang pragmatis?`;
    } else {
      feedback = `Luar biasa! Anda tidak goyah sedikit pun dan berani mendebat premis salah yang saya umpan secara ramah tadi. Keyakinan akademis dan penguasaan teori Anda sungguh patut diacungi jempol!`;
    }
  }

  return {
    aiScore: score,
    aiFeedback: feedback,
    shouldFollowup: shouldFollowup,
    followUpQuestion: shouldFollowup ? followUpQuestion : ''
  };
}

function generateVerdictFallback(judul: string, abstrak: string, dosenType: string, history: any[]) {
  const kw = extractKeywords(judul, abstrak);
  const kw1 = kw[0] || 'materi';
  const kw2 = kw[1] || 'metodologi';

  let averageIntermediateScore = 75;
  if (history && history.length > 0) {
    const sum = history.reduce((acc, curr) => acc + (curr.aiScore || 70), 0);
    averageIntermediateScore = sum / history.length;
  }

  const overallScore = Math.max(10, Math.min(98, Math.round(averageIntermediateScore)));

  let result = 'LULUS';
  if (overallScore >= 85) {
    result = 'LULUS DENGAN PUJIAN';
  } else if (overallScore >= 70) {
    result = 'LULUS';
  } else if (overallScore >= 60) {
    result = 'REVISI OPTIONAL';
  } else if (overallScore >= 50) {
    result = 'REVISI MAYOR';
  } else {
    result = 'TIDAK LULUS';
  }

  const scoreMateri = Math.max(15, Math.min(100, overallScore + Math.floor(Math.random() * 6) - 3));
  const scoreMetodologi = Math.max(15, Math.min(100, overallScore + Math.floor(Math.random() * 8) - 4));
  const scoreArgumentasi = Math.max(15, Math.min(100, Math.round(overallScore * 0.95) + Math.floor(Math.random() * 6)));
  const scoreKontribusi = Math.max(15, Math.min(100, overallScore + Math.floor(Math.random() * 10) - 2));
  
  let avgWpm = 100;
  let totalFillers = 0;
  if (history && history.length > 0) {
    avgWpm = history.reduce((acc, h) => acc + (h.wpm || 100), 0) / history.length;
    totalFillers = history.reduce((acc, h) => acc + (h.fillerCount || 0), 0);
  }
  let scoreTekanan = 85;
  if (avgWpm < 70 || avgWpm > 165) {
    scoreTekanan -= 15;
  }
  scoreTekanan -= Math.min(totalFillers * 4, 30);
  scoreTekanan = Math.max(20, Math.min(100, scoreTekanan));

  const lecturerPrompt = DOSEN_PROMPTS[dosenType as keyof typeof DOSEN_PROMPTS] || DOSEN_PROMPTS.perfeksionis;

  let catatanDosen = '';
  if (dosenType === 'perfeksionis') {
    catatanDosen = `Paragraf 1: Berdasarkan hasil penilaian intensif naskah ilmiah Anda yang berjudul "${judul}", tim penguji mengapresiasi upaya pengemasan riset yang sistematis ini. Ada potensi besar pada metodologi "${kw1}" Anda dalam menyelesaikan rumusan masalah, ditunjang oleh pemaparan landasan teori yang cukup lumayan terstruktur. Penulisan istilah teknis pada draf skripsi Anda patut diapresiasi meskipun masih ditemukan cacat inkonsistensi penulisan kecil.\n\n` +
      `Paragraf 2: Namun demikian, kelemahan mendasar yang sangat fundamental terletak pada konsistensi penulisan dan akurasi logika pembelaan argumen lisan Anda. Ketika dihadapkan pada interogasi tajam mengenai "${kw2}", penuturan argumentasi Anda sering kali kedodoran, tergesa-gesa, serta dipenuhi oleh filler words tak perlu yang mengaburkan nalar akademis Anda. Hal ini mencederai kualitas penguasaan materi yang seharusnya dikuasai calon sarjana yang kompeten.\n\n` +
      `Paragraf 3: Sebagai wejangan akhir dari saya, Dr. Ir. Hartono, M.T., ingatlah bahwa kesempurnaan akademis tidak dicapai dengan jalan pintas atau kelalaian kecil. Anda dituntut untuk merombak detail bab analisis kelayakan riset agar naskah ini pantas menyandang gelar kesarjanaan yang prestisius. Jadikan kritik tajam hari ini sebagai cambuk keras untuk melatih ketelitian, ketenangan, serta kedisipilinan berpikir fungsional Anda di masa depan akademik Anda. Selamat atas kontribusi ilmiah Anda!`;
  } else if (dosenType === 'filosof') {
    catatanDosen = `Paragraf 1: Melalui perenungan naskah skripsi Anda mengenai "${judul}", saya melihat adanya secercah hasrat intelektual yang tulus untuk merawat kelangsungan pengetahuan. Anda tidak semata menulis rangkaian kata kosong, melainkan berusaha mengurai benang kusut pengaruh "${kw1}" terhadap realitas konkret kehidupan manusia di sekeliling kita. Ini adalah langkah kontribusi awal yang sangat mulia dan patut mendapatkan pujian moral.\n\n` +
      `Paragraf 2: Walau begitu, dalam dialektika lisan kita hari ini, cara Anda mempertahankan gagasan sering kali terjebak dalam belenggu dogmatis yang sempit. Anda terlampau berpegang teguh pada angka-angka kaku instrumen "${kw2}" tanpa mampu membedah secara epistemologis apa sebetulnya melandasi pilihan-pilihan radikal tersebut. Ingatlah, sains tanpa kearifan kritis hanyalah alat tanpa arah; Anda masih kurang berani melampaui batasan teks skripsi Anda.\n\n` +
      `Paragraf 3: Oleh karena itu, saya, Prof. Dr. Widjaja, S.S., M.Hum., berpesan agar perjalanan kesarjanaan ini tidak terhenti di ruangan sidang yang fana ini. Teruslah bertanya, ragukanlah segala ketetapan dangkal yang disodorkan kepada Anda, dan hadapi tekanan hidup dengan ketenangan batin yang reflektif. Jagalah nyala api rasa ingin tahu Anda agar senantiasa menjadi suluh yang menerangi kegelapan di sekitar Anda. Karya ilmiah Anda memiliki masa depan luas; rawatlah ia sebaik-baiknya.`;
  } else if (dosenType === 'metodologi') {
    catatanDosen = `Paragraf 1: Naskah skripsi Anda yang berfokus pada dinamika "${judul}" memiliki struktur pengujian empiris yang patuh pada kaidah dasar ilmu pengetahuan. Pemilihan variabel riset "${kw1}" menunjukkan kehendak untuk mengumpulkan data lapangan secara tertib, serta didukung kejelasan alur validasi instrumen yang terstruktur dengan pendekatan yang masuk akal bagi penguji.\n\n` +
      `Paragraf 2: Kritik rigid dari sudut pandang metodologi statistik murni menunjukkan bahwa tingkat kepercayaan uji korelasi "${kw2}" Anda masih membutuhkan fondasi statistik yang lebih tebal. Ketika diuji secara lisan, pertahanan argumentatif Anda cenderung melemah saat dipojokkan dengan margin of error dan reliabilitas sampling. Anda harus melengkapi draf dengan perhitungan toleransi bias yang lebih meyakinkan agar bebas dari anggapan spurious correlation.\n\n` +
      `Paragraf 3: Nasihat metodologis dari saya, Siti Aminah, Ph.D., adalah jangan pernah takut pada kebenaran data di lapangan meskipun angka itu tidak memuaskan ekspektasi hipotesis Anda. Lakukan revisi parameter analitik yang telah kami tandai demi melahirkan naskah penelitian yang kokoh, sahih, serta bebas dari celah metodologis. Gelar sarjana menanti integritas ilmiah Anda; pertajam ketekunan Anda dalam meneliti aspek empiris ini!`;
  } else { // jebakan
    catatanDosen = `Paragraf 1: Wah, sungguh sebuah kepuasan tersendiri bisa berdiskusi santai mengenai draf skripsi Anda yang berjudul "${judul}" ini! Kerangka awal penelitian Anda mengenai "${kw1}" dikemas dengan gaya bahasa yang segar dan memiliki keunikan konsep yang cukup kuat untuk dilanjutkan ke ranah publikasi.\n\n` +
      `Paragraf 2: Namun, catatan besar bagi Anda adalah kewaspadaan logika Anda yang masih sangat rentan terombang-ambing oleh bujuk rayu pertanyaan jebakan luar. Dalam interaksi verbal tadi, Anda hampir saja mengorbankan integritas metodologi "${kw2}" demi kesepakatan instan yang saya tawarkan secara persuasif. Mahasiswa cerdas tidak boleh asal menyetujui saran keliru penguji demi kelulusan instan; pertahankan keberanian teoretis Anda dengan tangguh!\n\n` +
      `Paragraf 3: Wejangan penutup dari saya, Rudi Hermawan, M.Kom., jadilah pribadi yang memiliki pendirian kokoh atas dasar ilmu yang Anda miliki. Ruang ujian ini saya rancang sebagai laboratorium mini untuk menguji ketangguhan mental serta komitmen teoretis Anda di bawah gempuran manipulasi logika dunia nyata. Teruslah mengasah ketajaman bernalar kritis Anda dan selamat merayakan kelulusan ini dengan refleksi pribadi yang mendalam!`;
  }

  return {
    overallScore,
    result,
    scoreMateri,
    scoreMetodologi,
    scoreArgumentasi,
    scoreKontribusi,
    scoreTekanan,
    catatanDosen
  };
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. GENERATE QUESTION endpoint
app.post('/api/generate-question', async (req, res) => {
  try {
    const { judul, abstrak, dosenType, customLecturer, currentQuestions = [] } = req.body;
    if (!judul || !abstrak || !dosenType) {
      res.status(400).json({ error: 'Missing required parameters: judul, abstrak, dosenType' });
      return;
    }

    let lecturer = DOSEN_PROMPTS[dosenType as keyof typeof DOSEN_PROMPTS];
    if (dosenType === 'custom' && customLecturer) {
      lecturer = {
        name: customLecturer.name || 'Dosen Penguji',
        role: customLecturer.title || 'Dosen Penguji Utama',
        instruction: `Anda adalah ${customLecturer.name || 'Dosen Penguji'} bergelar ${customLecturer.title || 'Penguji Utama'}. Karakter/gaya pengujian Anda: ${customLecturer.description}. Keahlian Anda menguji berfokus pada: ${(customLecturer.focuses || []).join(', ')}. Bersikaplah akademis, profesional, menuntut keaslian data, dan sesuaikan cara bertanya Anda dengan profil kustom tersebut.`
      };
    }

    if (!lecturer) {
      res.status(400).json({ error: 'Invalid dosen type' });
      return;
    }

    try {
      const ai = getGeminiClient();

      // Build chat history of questions generated so far to ensure uniqueness
      const questionHistoryText = currentQuestions.length > 0
        ? `Pertanyaan yang sudah diajukan sebelumnya:\n${currentQuestions.map((q: any, i: number) => `${i+1}. ${q.questionText}`).join('\n')}\nPastikan pertanyaan baru Anda memiliki fokus yang sama sekali berbeda dan tidak mengulang hal yang sama.`
        : 'Ini adalah pertanyaan pertama.';

      const systemPrompt = `
${lecturer.instruction}

Tugas Anda adalah menelaah judul dan abstrak skripsi berikut, lalu rumuskan SATU pertanyaan penguji yang tajam dan sesuai dengan kepribadian Anda untuk ditanyakan langsung kepada mahasiswa.

JUDUL SKRIPSI:
${judul}

ABSTRAK:
${abstrak}

${questionHistoryText}

Buatlah satu pertanyaan yang realistis, menantang, langsung ke sasaran, dan bernada persis seperti profil dosen Anda. JANGAN berikan pengantar atau penutup. Cukup berikan pertanyaan itu sendiri dalam format string JSON murni.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: systemPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questionText: {
                type: Type.STRING,
                description: 'Teks pertanyaan skripsi yang diajukan oleh dosen'
              }
            },
            required: ['questionText']
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      res.json({ ...result, isFallback: false });
    } catch (apiError: any) {
      console.warn('Gemini API failed in /api/generate-question, using rule-based fallback:', apiError.message);
      const questionText = getFallbackQuestion(judul, abstrak, dosenType, currentQuestions.length, customLecturer);
      res.json({
        questionText,
        isFallback: true
      });
    }
  } catch (error: any) {
    console.error('Fatal Error in /api/generate-question:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. ANALYZE ANSWER endpoint
app.post('/api/analyze-answer', async (req, res) => {
  try {
    const { 
      judul, 
      abstrak, 
      dosenType, 
      customLecturer, 
      questionText, 
      transcript, 
      wpm = 100, 
      fillerCount = 0, 
      isFollowup = false,
      tension = 30 
    } = req.body;
    
    if (!judul || !abstrak || !dosenType || !questionText) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    let lecturer = DOSEN_PROMPTS[dosenType as keyof typeof DOSEN_PROMPTS];
    if (dosenType === 'custom' && customLecturer) {
      lecturer = {
        name: customLecturer.name || 'Dosen Penguji',
        role: customLecturer.title || 'Dosen Penguji Utama',
        instruction: `Anda adalah ${customLecturer.name || 'Dosen Penguji'} bergelar ${customLecturer.title || 'Penguji Utama'}. Karakter/gaya pengujian Anda: ${customLecturer.description}. Keahlian Anda menguji berfokus pada: ${(customLecturer.focuses || []).join(', ')}. Bersikaplah akademis, profesional, menuntut keaslian data, dan sesuaikan cara bertanya Anda dengan profil kustom tersebut.`
      };
    }

    if (!lecturer) {
      res.status(400).json({ error: 'Invalid dosen type' });
      return;
    }

    try {
      const ai = getGeminiClient();

      const prompt = `
${lecturer.instruction}

Anda menguji skripsi berikut:
JUDUL: ${judul}
ABSTRAK: ${abstrak}

Anda telah menanyakan: "${questionText}"
Mahasiswa menjawab: "${transcript || '[Tidak ada jawaban / Diam saja]'}"

Data analisis berbicara mahasiswa:
- Kecepatan berbicara: ${wpm} Kata Per Menit (WPM)
- Jumlah kata jeda pengisi (filler words seperti 'eee', 'mmm', 'apa', 'anu', 'kayaknya'): ${fillerCount} kata jeda.
- Tingkat Ketegangan Ruang Sidang (Stress Meter): ${tension}% (Skala 0-100%). Tingkat ketegangan tinggi menunjukkan kepanikan, mahasiswa kaku, terlalu lama terdiam mengabaikan pertanyaan, atau gelisah melontarkan vokal filter konstan.

TUGAS ANDA:
1. Analisis isi jawaban mahasiswa. Apakah jawaban didukung logika ilmiah, dasar teori yang kokoh, atau justru mengambang, salah teori, atau terlalu gegabah?
2. Berikan skor (0 - 100) untuk kualitas isi jawaban tersebut. Tingkat ketegangan yang tinggi atau pemakaian kata filler porsi besar seharusnya mereduksi nilai secara proporsional demi keadilan akademis.
3. Berikan feedback singkat, tajam, jujur, dan berkarakter (karakter dosen ${lecturer.name}, sesuaikan pula tingkat kesal/kepuasan Anda berdasarkan parameter Ketegangan ${tension}% tadi) langsung kepada mahasiswa dalam Bahasa Indonesia.
4. Tentukan apakah Anda perlu memberikan PERTANYAAN FOLLOW-UP (pertanyaan pendalaman/kejaran) karena jawaban mahasiswa tersebut lemah, meragukan, atau justru memicu kecurigaan baru.
   - CATATAN UTAMA: Jika mahasiswa sudah berada di pertanyaan follow-up saat ini (${isFollowup ? 'Benar' : 'Salah'}), atau jika jawabannya sudah sangat solid dan tenang, Anda sebaiknya tidak perlu mem-follow-up lagi (set shouldFollowup = false). Anda hanya boleh mem-follow-up jika jawaban benar-benar lemah, mengandung celah fatal, atau jika tipe dosen Anda ingin menekan lebih dalam.
   - Jika 'shouldFollowup' adalah true, buatlah teks 'followUpQuestion' yang mengaitkan kelemahan jawaban tadi secara menohok.

Format output HARUS JSON yang sesuai dengan skema yang diberikan.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              aiScore: {
                type: Type.INTEGER,
                description: 'Skor kualitas jawaban mahasiswa (0 - 100)'
              },
              aiFeedback: {
                type: Type.STRING,
                description: 'Feedback kritik/saran tajam langsung dari dosen sesuai kepribadiannya serta dipengaruhi level ketegangan ruang sidang'
              },
              shouldFollowup: {
                type: Type.BOOLEAN,
                description: 'Apakah dosen perlu menanyakan follow-up kejaran'
              },
              followUpQuestion: {
                type: Type.STRING,
                description: 'Teks pertanyaan follow-up tajam jika shouldFollowup bernilai true'
              }
            },
            required: ['aiScore', 'aiFeedback', 'shouldFollowup']
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      res.json({ ...result, isFallback: false });
    } catch (apiError: any) {
      console.warn('Gemini API failed in /api/analyze-answer, using rule-based fallback:', apiError.message);
      const result = analyzeAnswerFallback(judul, abstrak, dosenType, questionText, transcript, wpm, fillerCount, isFollowup, customLecturer, tension);
      res.json({ ...result, isFallback: true });
    }
  } catch (error: any) {
    console.error('Fatal Error in /api/analyze-answer:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. GENERATE VERDICT endpoint
app.post('/api/generate-verdict', async (req, res) => {
  try {
    const { judul, abstrak, dosenType, customLecturer, history = [] } = req.body;
    if (!judul || !abstrak || !dosenType || history.length === 0) {
      res.status(400).json({ error: 'Missing parameters for final verdict' });
      return;
    }

    let lecturer = DOSEN_PROMPTS[dosenType as keyof typeof DOSEN_PROMPTS];
    if (dosenType === 'custom' && customLecturer) {
      lecturer = {
        name: customLecturer.name || 'Dosen Penguji',
        role: customLecturer.title || 'Dosen Penguji Utama',
        instruction: `Anda adalah ${customLecturer.name || 'Dosen Penguji'} bergelar ${customLecturer.title || 'Penguji Utama'}. Karakter/gaya pengujian Anda: ${customLecturer.description}. Keahlian Anda menguji berfokus pada: ${(customLecturer.focuses || []).join(', ')}. Bersikaplah akademis, profesional, menuntut keaslian data, dan sesuaikan cara bertanya Anda dengan profil kustom tersebut.`
      };
    }

    if (!lecturer) {
      res.status(400).json({ error: 'Invalid dosen type' });
      return;
    }

    try {
      const ai = getGeminiClient();

      // Compile history for summary analysis
      const formattedHistory = history.map((h: any, i: number) => `
Pertanyaan ${i+1}: ${h.questionText}
(${h.isFollowup ? 'Pertanyaan Kejaran/Followup' : 'Pertanyaan Utama'})
Jawaban Mahasiswa: ${h.transcript || '[Diam/Tidak Menjawab]'}
Kinerja Suara: ${h.wpm} WPM, ${h.fillerCount} filler words.
Skor AI Menengah untuk jawaban ini: ${h.aiScore}
Critique Dosen: ${h.aiFeedback}
`).join('\n---\n');

      const prompt = `
${lecturer.instruction}

Rangkaian sidang skripsi telah selesai. Saatnya Anda bersama tim penguji memberikan penilaian akhir (verdict) yang jujur, akademis, dan tidak kenal kompromi kepada mahasiswa ini.

DETAIL SKRIPSI:
JUDUL: ${judul}
ABSTRAK: ${abstrak}

REKAM REKAMAN JAWABAN & INTERAKSI SIDANG:
${formattedHistory}

TUGAS ANDA SEBAGAI KETUA PENGUJI:
1. Evaluasi seluruh performa mahasiswa secara holistik.
2. Hitung 5 sub-skor berikut (masing-masing skala 0 - 100):
   - scoreMateri: Penguasaan substansi materi skripsi dan penelitiannya.
   - scoreMetodologi: Pemahaman metodologi penelitian, data, sampling, dan keabsahan ilmiah.
   - scoreArgumentasi: Retorika jawapan, cara berkelit, argumentasi defensif yang kokoh, tegas, dan logis.
   - scoreKontribusi: Nilai guna skripsi bagi keilmuan maupun dunia praktis.
   - scoreTekanan: Ketenangan, kestabilan berbicara, kelancaran (WPM prima dan minim filler words).
3. Hitung score keseluruhan (overallScore) dari rata-rata kelima sub-skor tersebut (atau pembobotan rasional).
4. Berikan Hasil Kelulusan (result) dengan ketentuan:
   - "LULUS DENGAN PUJIAN" (jika overallScore >= 85)
   - "LULUS" (jika overallScore >= 70 dan < 85)
   - "REVISI OPTIONAL" (jika overallScore >= 60 dan < 70)
   - "REVISI MAYOR" (jika overallScore >= 50 dan < 60)
   - "TIDAK LULUS" (jika overallScore < 50)
5. Tulislah "Catatan Dosen" (catatanDosen) secara mendalam, minimal 3 paragraf, yang merangkum:
   - Paragraf 1: Analisis kelebihan dan poin kuat karya tulis mahasiswa serta performanya.
   - Paragraf 2: Analisis tajam mengenai kelemahan krusial, ketidakmampuan membela argumen, atau kesalahan fatal metodis/terminologis.
   - Paragraf 3: Nasihat akademis atau wejangan moral akhir yang menampar sekaligus memotivasi mahasiswa agar melangkah lebih matang ke depan. Sesuaikan karakter bicaranya dengan dosen Anda (${lecturer.name}).

Format output HARUS struktur JSON persis sesuai dengan skema yang diberikan.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallScore: {
                type: Type.INTEGER,
                description: 'Nilai akhir sidang skripsi (scale 0-100)'
              },
              result: {
                type: Type.STRING,
                description: 'Hasil Kelulusan: LULUS DENGAN PUJIAN, LULUS, REVISI OPTIONAL, REVISI MAYOR, atau TIDAK LULUS'
              },
              scoreMateri: {
                type: Type.INTEGER,
                description: 'Skor penguasaan materi skripsi (0-100)'
              },
              scoreMetodologi: {
                type: Type.INTEGER,
                description: 'Skor penguasaan metodologi (0-100)'
              },
              scoreArgumentasi: {
                type: Type.INTEGER,
                description: 'Skor kefasihan argumentasi & pembelaan (0-100)'
              },
              scoreKontribusi: {
                type: Type.INTEGER,
                description: 'Skor kontribusi akademis & praktis (0-100)'
              },
              scoreTekanan: {
                type: Type.INTEGER,
                description: 'Skor ketahanan di bawah tekanan & vocal fillers (0-100)'
              },
              catatanDosen: {
                type: Type.STRING,
                description: 'Detail ulasan komprehensif 3 paragraf dari dosen penguji'
              }
            },
            required: [
              'overallScore', 'result', 'scoreMateri', 'scoreMetodologi', 
              'scoreArgumentasi', 'scoreKontribusi', 'scoreTekanan', 'catatanDosen'
            ]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      res.json({ ...result, isFallback: false });
    } catch (apiError: any) {
      console.warn('Gemini API failed in /api/generate-verdict, using rule-based fallback:', apiError.message);
      const verdict = generateVerdictFallback(judul, abstrak, dosenType, history);
      res.json({ ...verdict, isFallback: true });
    }
  } catch (error: any) {
    console.error('Fatal Error in /api/generate-verdict:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// VITE OR STATIC FILE SERVING
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted in Development mode.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production static files from dist.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sidang.AI Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
