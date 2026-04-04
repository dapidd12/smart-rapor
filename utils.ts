
import { AppData, Semester, Subject } from './types';

export const calculateSemesterAverage = (semester: Semester, usePredictions = false): number => {
  if (!semester || semester.subjects.length === 0) return 0;
  
  const scores = semester.subjects.map(s => {
    // Gunakan nilai aktual jika ada, jika tidak (dan usePredictions true) gunakan prediksi user
    if (s.score > 0) return s.score;
    if (usePredictions && s.prediction > 0) return s.prediction;
    return 0;
  }).filter(v => v > 0);

  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return sum / semester.subjects.length;
};

export const getSemesterStats = (semester: Semester) => {
  if (!semester || semester.subjects.length === 0) return { highest: 0, lowest: 0, variance: 0 };
  const scores = semester.subjects.map(s => s.score > 0 ? s.score : s.prediction).filter(s => s > 0);
  if (scores.length === 0) return { highest: 0, lowest: 0, variance: 0 };
  
  const highest = Math.max(...scores);
  const lowest = Math.min(...scores);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / scores.length;

  return { highest, lowest, variance: Math.sqrt(variance) };
};

export const calculateOverallAverage = (semesters: Semester[]): number => {
  const averages = semesters.map(s => calculateSemesterAverage(s, true)).filter(a => a > 0);
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

export const translations: Record<'id' | 'en', any> = {
  id: {
    welcome: "Selamat Datang",
    subtitle: "Pantau Nilai & Rencanakan Target Belajarmu",
    enterName: "Siapa namamu?",
    start: "Mulai Sekarang",
    targetAvg: "Target Nilai Akhir",
    totalSemesters: "Jumlah Semester",
    neededAvg: "Nilai Minimal yang Dibutuhkan",
    addSubject: "Tambah Pelajaran",
    calculate: "Lihat Hasil & Cetak",
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
    predictionLabel: "Target Kamu",
    requiredLabel: "Nilai yang Dibutuhkan",
    myPrediction: "Target Kamu",
    stability: "Kestabilan Nilai",
    errorNameRequired: "Nama pelajaran tidak boleh kosong",
    errorScoreRange: "Nilai harus antara 0 - 100",
    errorScoreEmpty: "Nilai tidak boleh kosong",
    emptyState: "Belum ada pelajaran.",
    emptyStateDesc: "Tambahkan pelajaran satu per satu atau gunakan daftar pelajaran umum.",
    useTemplate: "Gunakan Daftar Umum",
    stable: "Stabil",
    volatile: "Naik Turun",
    onTrack: "Aman",
    needsFocus: "Perlu Ditingkatkan",
    heroDesc: "Pantau nilai dan atur strategi belajarmu agar bisa mencapai target kelulusan impian.",
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
    combinedAvgLabel: "Rata-rata Saat Ini",
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
    deleteLabel: "Hapus"
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
    deleteLabel: "Delete"
  }
};
