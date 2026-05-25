export interface ContohSkripsi {
  judul: string;
  abstrak: string;
  tag: string;
}

export const CONTOH_SKRIPSI: ContohSkripsi[] = [
  {
    tag: "Kecerdasan Buatan (AI) / Pertanian",
    judul: "Penerapan Convolutional Neural Networks (CNN) Berbasis Mobile untuk Klasifikasi Penyakit Daun Padi Sawah",
    abstrak: "Sektor pertanian padi sawah sering mengalami penurunan produktivitas akibat patogen penyakit daun seperti Blast, Bacterial Leaf Blight, dan Brown Spot. Identifikasi konvensional memakan waktu lama dan rentan subjektivitas. Penelitian ini merancang aplikasi mobile berbasis Convolutional Neural Networks (CNN) menggunakan arsitektur MobileNetV3-Large untuk mendeteksi 4 kategori citra daun padi sawah. Dataset terdiri dari 2.400 gambar daun padi yang dikumpulkan secara mandiri. Model dilatih dengan rasio data 80:20 menggunakan optimizer Adam dan learning rate 0.0001. Hasil pengujian menunjukkan model CNN mencapai akurasi sebesar 96.42% dengan ukuran file terkompresi sebesar 12 MB, membuatnya adaptif untuk dijalankan secara luring (offline) pada perangkat smartphone petani dengan spesifikasi kelas menengah ke bawah."
  },
  {
    tag: "Data Science / NLP / Sosial",
    judul: "Analisis Sentimen Kebijakan Transportasi Listrik Nasional Menggunakan Bidirectional Encoder Representations from Transformers (BERT)",
    abstrak: "Transisi energi bersih melalui adopsi kendaraan listrik (EV) di Indonesia menuai beragam tanggapan dari publik di media sosial Twitter. Penelitian ini bertujuan untuk menganalisis sentimen masyarakat mengenai subsidi kendaraan listrik menggunakan model pre-trained IndoBERT. Data dikikis dari Twitter sebanyak 8.500 tweet yang mengandung kata kunci relevan selama periode Januari-April 2026. Data dianotasi secara semi-manual ke dalam tiga kelas: Positif, Negatif, dan Netral. Pengujian performa dilakukan dengan membandingkan model IndoBERT menghadapi model baseline Support Vector Machine (SVM). Hasil eksperimen menunjukkan IndoBERT melampaui SVM dengan nilai F1-Score sebesar 91.24% berbanding 79.52%. Analisis topik lanjutan mengungkapkan kekhawatiran masyarakat didominasi oleh isu jangkauan stasiun pengisian kendaraan listrik umum (SPKLU), nilai jual kembali EV, dan keandalan baterai."
  },
  {
    tag: "RPL / UI/UX / E-Commerce UMKM",
    judul: "Pengembangan Sistem Informasi E-Commerce Produk Kerajinan Bambu Desa Kreatif Menggunakan Pendekatan User-Centered Design (UCD)",
    abstrak: "Desa kreatif Gintangan terkenal sebagai sentra anyaman bambu, namun keterbatasan pemasaran digital menghambat jangkauan pasar pelaku UMKM setempat. Penelitian ini merancang dan menguji aplikasi web e-commerce anyaman bambu menggunakan metodologi User-Centered Design (UCD). Tahapan penelitian meliputi analisis kebutuhan pengguna lewat wawancara, perancangan persona, wireframing, pembuatan high-fidelity prototype, serta implementasi coding menggunakan kerangka kerja React. Pengujian kegunaan (usability testing) dievaluasi kepada 20 calon konsumen dan 5 admin UMKM menggunakan kuesioner System Usability Scale (SUS). Hasil evaluasi menunjukkan skor SUS rata-rata meningkat dari 54.2 (kategori Marginal-Low) pada rancangan awal menjadi 86.5 (kategori Acceptable-Excellent) setelah iterasi perbaikan rancangan visual dan efisiensi langkah transaksi pembelian barang."
  }
];
