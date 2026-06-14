
import { AppData, Semester, Subject, AchievementRubric, GraduationScheme } from './types';

export const calculateSemesterAverage = (semester: Semester, usePredictions = false, neededAvg = 0): number => {
  if (!semester || semester.subjects.length === 0) return 0;
  
  const scores = semester.subjects.map(s => {
    if (s.score > 0) return s.score;
    if (usePredictions && neededAvg > 0) return neededAvg;
    return 0;
  }).filter(v => v > 0);

  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return sum / semester.subjects.length;
};

export const getSemesterStats = (semester: Semester, neededAvg = 0) => {
  if (!semester || semester.subjects.length === 0) return { highest: 0, lowest: 0, variance: 0 };
  const scores = semester.subjects.map(s => s.score > 0 ? s.score : neededAvg).filter(s => s > 0);
  if (scores.length === 0) return { highest: 0, lowest: 0, variance: 0 };
  
  const highest = Math.max(...scores);
  const lowest = Math.min(...scores);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / scores.length;

  return { highest, lowest, variance: Math.sqrt(variance) };
};

export const calculateOverallAverage = (semesters: Semester[], neededAvg = 0): number => {
  const averages = semesters.map(s => calculateSemesterAverage(s, true, neededAvg)).filter(a => a > 0);
  if (averages.length === 0) return 0;
  return averages.reduce((acc, avg) => acc + avg, 0) / averages.length;
};

export const STORAGE_KEY = 'smart_rapor_pro_v3_core';

export const saveToStorage = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const loadFromStorage = (): AppData | null => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
};

export const defaultAchievementRubric: AchievementRubric[] = [
  { level: 'Internasional', rank: 'Juara 1', score: 100 },
  { level: 'Internasional', rank: 'Juara 2', score: 95 },
  { level: 'Internasional', rank: 'Juara 3', score: 90 },
  { level: 'Internasional', rank: 'Peserta', score: 85 },
  { level: 'Nasional', rank: 'Juara 1', score: 90 },
  { level: 'Nasional', rank: 'Juara 2', score: 85 },
  { level: 'Nasional', rank: 'Juara 3', score: 80 },
  { level: 'Nasional', rank: 'Peserta', score: 75 },
  { level: 'Provinsi', rank: 'Juara 1', score: 80 },
  { level: 'Provinsi', rank: 'Juara 2', score: 75 },
  { level: 'Provinsi', rank: 'Juara 3', score: 70 },
  { level: 'Provinsi', rank: 'Peserta', score: 65 },
  { level: 'Kab/Kota', rank: 'Juara 1', score: 70 },
  { level: 'Kab/Kota', rank: 'Juara 2', score: 65 },
  { level: 'Kab/Kota', rank: 'Juara 3', score: 60 },
  { level: 'Kab/Kota', rank: 'Peserta', score: 55 },
  { level: 'Sekolah', rank: 'Juara 1', score: 60 },
  { level: 'Sekolah', rank: 'Juara 2', score: 55 },
  { level: 'Sekolah', rank: 'Juara 3', score: 50 },
  { level: 'Sekolah', rank: 'Peserta', score: 45 },
];

export const defaultGraduationSchemes: GraduationScheme[] = [
  {
    id: 'snbp-2026',
    name: 'SNBP 2026 — Default Nasional',
    components: [
      { id: 'c1', type: 'rapor', label: 'Nilai Rapor', enabled: true, weight: 50, aggregation: 'average', items: [] },
      { id: 'c2', type: 'tka', label: 'Tes Kemampuan Akademik (TKA)', enabled: true, weight: 30, aggregation: 'average', items: [] },
      { id: 'c3', type: 'supporting', label: 'Mapel Pendukung Prodi', enabled: true, weight: 10, aggregation: 'average', items: [] },
      { id: 'c4', type: 'achievement', label: 'Prestasi / Sertifikat', enabled: true, weight: 10, aggregation: 'highest', items: [] },
      { id: 'c5', type: 'tpa', label: 'Tes Potensi Akademik (TPA)', enabled: false, weight: 0, aggregation: 'manual', manualScore: 0, items: [] },
    ]
  },
  {
    id: 'spmb-jatim',
    name: 'SPMB Jatim SMA — Prestasi Akademik',
    components: [
      { id: 'c1', type: 'rapor', label: 'Nilai Rapor', enabled: true, weight: 60, aggregation: 'average', items: [] },
      { id: 'c2', type: 'tka', label: 'Tes Kemampuan Akademik (TKA)', enabled: true, weight: 40, aggregation: 'average', items: [] },
      { id: 'c3', type: 'supporting', label: 'Mapel Pendukung Prodi', enabled: false, weight: 0, aggregation: 'average', items: [] },
      { id: 'c4', type: 'achievement', label: 'Prestasi / Sertifikat', enabled: false, weight: 0, aggregation: 'highest', items: [] },
      { id: 'c5', type: 'tpa', label: 'Tes Potensi Akademik (TPA)', enabled: false, weight: 0, aggregation: 'manual', manualScore: 0, items: [] },
    ]
  },
  {
    id: 'custom',
    name: 'Custom / Mandiri',
    components: [
      { id: 'c1', type: 'rapor', label: 'Nilai Rapor', enabled: true, weight: 0, aggregation: 'average', items: [] },
      { id: 'c2', type: 'tka', label: 'Tes Kemampuan Akademik (TKA)', enabled: true, weight: 0, aggregation: 'average', items: [] },
      { id: 'c3', type: 'supporting', label: 'Mapel Pendukung Prodi', enabled: true, weight: 0, aggregation: 'average', items: [] },
      { id: 'c4', type: 'achievement', label: 'Prestasi / Sertifikat', enabled: true, weight: 0, aggregation: 'highest', items: [] },
      { id: 'c5', type: 'tpa', label: 'Tes Potensi Akademik (TPA)', enabled: true, weight: 0, aggregation: 'manual', manualScore: 0, items: [] },
    ]
  }
];

export const calculateFinalScore = (scheme: GraduationScheme, overallRaporAvg: number): {
  total: number;
  breakdown: { id: string; label: string; score: number; weight: number; contribution: number }[];
  isWeightValid: boolean;
} => {
  const enabled = scheme.components.filter(c => c.enabled);
  const totalWeight = enabled.reduce((a, c) => a + c.weight, 0);

  const breakdown = enabled.map(c => {
    let score = 0;
    if (c.type === 'rapor') {
      score = overallRaporAvg;
    } else if (c.aggregation === 'manual') {
      score = c.manualScore ?? 0;
    } else if (c.aggregation === 'highest') {
      score = c.items.length > 0 ? Math.max(...c.items.map(i => i.score)) : 0;
    } else if (c.aggregation === 'sum_capped') {
      score = Math.min(100, c.items.reduce((a, i) => a + i.score, 0));
    } else {
      score = c.items.length > 0 ? c.items.reduce((a, i) => a + i.score, 0) / c.items.length : 0;
    }

    return { id: c.id, label: c.label, score, weight: c.weight, contribution: (score * c.weight) / 100 };
  });

  const total = breakdown.reduce((a, b) => a + b.contribution, 0);
  return { total, breakdown, isWeightValid: Math.abs(totalWeight - 100) < 0.01 };
};

export const translations: Record<'id' | 'en', any> = {
  id: {
    welcome: "Selamat Datang",
    subtitle: "Aplikasi pintar untuk merencanakan dan melacak target nilai rapormu",
    enterName: "Siapa namamu?",
    start: "Mulai Sekarang",
    targetAvg: "Target Rata-rata Lulus",
    totalSemesters: "Berapa Semester Kamu Belajar?",
    neededAvg: "Nilai Minimal yang Harus Dicapai",
    addSubject: "Tambah Pelajaran",
    calculate: "Lihat Hasil & Cetak Laporan",
    calculating: "Menyiapkan Laporan...",
    finalSuccess: "Target Tercapai! 🎓",
    finalFail: "Terus Berusaha! 🔥",
    avgScore: "Rata-rata",
    highest: "Tertinggi",
    lowest: "Terendah",
    exportPdf: "Simpan sebagai PDF",
    analysisTable: "Ringkasan Nilai",
    diagnosisTable: "Perkembangan Nilai per Semester",
    subjectAnalysisTable: "Rincian Nilai per Pelajaran",
    subjectName: "Pelajaran",
    overallAvg: "Rata-rata Total",
    highestScore: "Nilai Tertinggi",
    lowestScore: "Nilai Terendah",
    status: "Status",
    statusComplete: "Lengkap",
    statusPartial: "Belum Lengkap",
    statusEmpty: "Kosong",
    resetData: "Hapus Semua Data",
    confirmReset: "Apakah kamu yakin ingin menghapus semua data? Data yang dihapus tidak bisa dikembalikan.",
    predictionLabel: "Target Nilai Kamu",
    requiredLabel: "Harus Dapat Nilai",
    myPrediction: "Target Kamu",
    stability: "Kestabilan Nilai",
    errorNameRequired: "Nama pelajaran tidak boleh kosong",
    errorScoreRange: "Nilai harus antara 0 - 100",
    errorScoreEmpty: "Nilai tidak boleh kosong",
    graduationScheme: "Skema Kelulusan",
    finalScoreEstimate: "Skor Akhir Estimasi",
    selectPreset: "Pilih Skema Awal",
    weightLabel: "Bobot (%)",
    weightWarning: "Total bobot belum 100%",
    autoBalance: "Samakan ke 100%",
    tkaSubjectCount: "Jumlah Mapel TKA",
    addTkaSubject: "Tambah Mapel TKA",
    tpaScore: "Skor TPA",
    achievementList: "Daftar Sertifikat & Prestasi",
    addAchievement: "Tambah Prestasi",
    achievementLevel: "Tingkat",
    achievementRank: "Peringkat",
    supportingSubjects: "Mapel Pendukung Prodi",
    saveAsMyScheme: "Simpan sebagai Skema Saya",
    schemeDisclaimer: "Bobot resmi ditentukan masing-masing PTN/Dinas Pendidikan. Sesuaikan dengan pengumuman daerah/PTN tujuanmu.",
    raporPlan: "Rencana Rapor",
    graduationPlan: "Skema Kelulusan",
    raporScore: "Nilai Rapor",
    overallAvg: "Rata-rata Total",
    contribution: "Kontribusi",
    achievementRubric: "Rubrik Prestasi",
    score: "Skor",
    cancel: "Batal",
    save: "Simpan",
    level: "Tingkat",
    rank: "Peringkat",
    actions: "Aksi",
    emptyState: "Belum ada pelajaran di semester ini.",
    emptyStateDesc: "Tambahkan pelajaran satu per satu atau gunakan daftar pelajaran umum agar lebih cepat.",
    useTemplate: "Gunakan Daftar Umum",
    stable: "Stabil",
    volatile: "Naik Turun",
    onTrack: "Aman",
    needsFocus: "Perlu Ditingkatkan",
    heroDesc: "Pantau nilaimu dan atur strategi belajar agar bisa lulus dengan nilai yang kamu impikan.",
    calcDesc: "Lihat hasil akhir dari gabungan nilai asli dan target yang sudah kamu buat.",
    combinedScore: "Rata-rata Akhir",
    roadmapStrategy: "Rencana Belajar",
    downloadPdf: "Simpan PDF",
    back: "Kembali",
    masterData: "Nilai Asli Kamu",
    strategyPrediction: "Target Nilai Selanjutnya",
    subjectPlaceholder: "Nama Pelajaran",
    scoreLabel: "Nilai Asli",
    predLabel: "Target Kamu",
    performanceTrend: "Grafik Perkembangan",
    actualVsTarget: "Nilai Asli vs Target",
    combinedAvgLabel: "Rata-rata Keseluruhan",
    targetLabel: "Target",
    configLabel: "Pengaturan",
    roadmapTargetLabel: "Lama Belajar",
    minTargetPerSmt: "Minimal Nilai per Semester",
    detailedTranscript: "Rincian Nilai Lengkap",
    strategicForecast: "Perkiraan Nilai & Target",
    studentName: "Nama Siswa",
    dateOfIssue: "Tanggal Dibuat",
    semesterSummary: "Ringkasan Semester",
    actualLabel: "Nilai Asli",
    noLabel: "No",
    semesterLabel: "Semester",
    actualAvgLabel: "Rata-rata Asli",
    peakPerformance: "Nilai Terbaik",
    progressLabel: "Perkembangan",
    guest: "Tamu",
    explorer: "Pelajar",
    deleteLabel: "Hapus",
    howToUseTitle: "Cara Menggunakan Aplikasi",
    step1: "Isi target rata-rata nilai kelulusanmu dan berapa semester kamu akan belajar di bagian atas.",
    step2: "Pilih semester, lalu masukkan nama mata pelajaran dan nilai asli yang sudah kamu dapatkan.",
    step3: "Untuk semester yang belum ada nilainya, sistem akan otomatis menghitung berapa nilai yang harus kamu capai agar target kelulusanmu terpenuhi.",
    aboutTitle: "Tentang Aplikasi",
    aboutPurpose: "Tujuan Proyek",
    aboutPurposeDesc: "Smart Rapor dirancang untuk membantu siswa melacak nilai mereka, memprediksi target masa depan, dan merencanakan strategi belajar untuk mencapai nilai kelulusan yang diinginkan dengan mudah.",
    aboutTech: "Teknologi yang Digunakan",
    closeLabel: "Tutup",
    evalSummaryTitle: "Catatan Evaluasi & Motivasi",
    evalExcellentTitle: "Sangat Berkembang",
    evalExcellentDesc: "Luar biasa! Kamu telah mencapai atau bahkan melampaui target yang ditetapkan. Pertahankan dedikasi dan semangat belajarmu. Masa depan yang cerah menantimu!",
    evalDevelopingTitle: "Berkembang",
    evalDevelopingDesc: "Kerja bagus! Kamu sudah berada di jalur yang tepat dan sangat dekat dengan targetmu. Sedikit dorongan ekstra dan fokus yang lebih tajam akan membawamu mencapai tujuan.",
    evalNeedsImprovementTitle: "Perlu Ditingkatkan",
    evalNeedsImprovementDesc: "Jangan menyerah! Setiap ahli pernah menjadi pemula. Evaluasi kembali strategi belajarmu, perbanyak latihan, dan jangan ragu untuk meminta bantuan. Kamu pasti bisa bangkit!"
  },
  en: {
    welcome: "Welcome",
    subtitle: "Track Grades & Plan Your Study Targets",
    enterName: "What is your name?",
    start: "Start Now",
    targetAvg: "Final Target Score",
    totalSemesters: "Total Semesters",
    neededAvg: "Score Needed",
    addSubject: "Add Subject",
    calculate: "View Results & Print",
    calculating: "Preparing Report...",
    finalSuccess: "Target Achieved! 🎓",
    finalFail: "Keep Pushing! 🔥",
    avgScore: "Average",
    highest: "Highest",
    lowest: "Lowest",
    exportPdf: "Save as PDF",
    analysisTable: "Grade Summary",
    diagnosisTable: "Semester Progress",
    subjectAnalysisTable: "Subject Details",
    subjectName: "Subject Name",
    overallAvg: "Total Average",
    highestScore: "Highest Score",
    lowestScore: "Lowest Score",
    status: "Status",
    statusComplete: "Complete",
    statusPartial: "Incomplete",
    statusEmpty: "Empty",
    resetData: "Delete All Data",
    confirmReset: "Are you sure you want to delete all data? This action cannot be undone.",
    predictionLabel: "Your Target",
    requiredLabel: "Score Needed",
    myPrediction: "Your Target",
    stability: "Grade Stability",
    errorNameRequired: "Subject name cannot be empty",
    errorScoreRange: "Score must be between 0 - 100",
    errorScoreEmpty: "Score cannot be empty",
    graduationScheme: "Graduation Scheme",
    finalScoreEstimate: "Final Score Estimate",
    selectPreset: "Select Initial Scheme",
    weightLabel: "Weight (%)",
    weightWarning: "Total weight is not 100%",
    autoBalance: "Balance to 100%",
    tkaSubjectCount: "TKA Subject Count",
    addTkaSubject: "Add TKA Subject",
    tpaScore: "TPA Score",
    achievementList: "Certificates & Achievements",
    addAchievement: "Add Achievement",
    achievementLevel: "Level",
    achievementRank: "Rank",
    supportingSubjects: "Supporting Subjects",
    saveAsMyScheme: "Save as My Scheme",
    schemeDisclaimer: "Official weights are determined by each university. Adjust according to your target university's announcement.",
    raporPlan: "Rapor Plan",
    graduationPlan: "Graduation Scheme",
    raporScore: "Rapor Score",
    overallAvg: "Overall Average",
    contribution: "Contribution",
    achievementRubric: "Achievement Rubric",
    score: "Score",
    cancel: "Cancel",
    save: "Save",
    level: "Level",
    rank: "Rank",
    actions: "Actions",
    emptyState: "No subjects added yet.",
    emptyStateDesc: "Add subjects one by one or use the common list.",
    useTemplate: "Use Common List",
    stable: "Stable",
    volatile: "Volatile",
    onTrack: "On Track",
    needsFocus: "Needs Improvement",
    heroDesc: "Monitor your grades and set your study strategy to achieve your dream graduation target.",
    calcDesc: "View the final result combining your actual scores and the targets you've set.",
    combinedScore: "Final Average",
    roadmapStrategy: "Study Plan",
    downloadPdf: "Save PDF",
    back: "Back",
    masterData: "Your Actual Scores",
    strategyPrediction: "Next Target Scores",
    subjectPlaceholder: "Subject Name",
    scoreLabel: "Actual Score",
    predLabel: "Your Target",
    performanceTrend: "Progress Chart",
    actualVsTarget: "Actual vs Target",
    combinedAvgLabel: "Current Average",
    targetLabel: "Target",
    configLabel: "Settings",
    roadmapTargetLabel: "Study Duration",
    minTargetPerSmt: "Min Score Per SMT",
    detailedTranscript: "Full Grade Details",
    strategicForecast: "Score Forecast & Targets",
    studentName: "Student Name",
    dateOfIssue: "Date Created",
    semesterSummary: "Semester Summary",
    actualLabel: "Actual Score",
    noLabel: "No",
    semesterLabel: "Semester",
    actualAvgLabel: "Actual Average",
    peakPerformance: "Best Score",
    progressLabel: "Progress",
    guest: "Guest",
    explorer: "Explorer",
    deleteLabel: "Delete",
    howToUseTitle: "How to Use",
    step1: "Set your final target score and total semesters at the top.",
    step2: "Add your subjects and enter your actual scores.",
    step3: "Enter your target score, and we will calculate the minimum score you need.",
    aboutTitle: "About Application",
    aboutPurpose: "Project Purpose",
    aboutPurposeDesc: "Smart Rapor Pro is designed to help students track their grades, forecast future targets, and plan their study strategies to achieve their desired graduation score.",
    aboutTech: "Technologies Used",
    closeLabel: "Close",
    evalSummaryTitle: "Evaluation & Motivation Note",
    evalExcellentTitle: "Highly Developing",
    evalExcellentDesc: "Outstanding! You have achieved or even exceeded your target. Keep up the dedication and enthusiasm. A bright future awaits you!",
    evalDevelopingTitle: "Developing",
    evalDevelopingDesc: "Great job! You are on the right track and very close to your target. A little extra push and sharper focus will get you there.",
    evalNeedsImprovementTitle: "Needs Improvement",
    evalNeedsImprovementDesc: "Don't give up! Every expert was once a beginner. Re-evaluate your study strategy, practice more, and don't hesitate to ask for help. You can do this!"
  }
};
