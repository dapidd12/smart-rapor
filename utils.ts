
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
    subtitle: "Analisis Rapor Pintar & Perencanaan Strategis",
    enterName: "Siapa namamu?",
    start: "Masuk ke Dashboard",
    targetAvg: "Target Nilai Akhir",
    totalSemesters: "Target Semester",
    neededAvg: "Target Minimal",
    addSubject: "Tambah Mapel",
    calculate: "Lihat Kesimpulan & Cetak",
    calculating: "Menyiapkan Laporan...",
    finalSuccess: "Target Tercapai! 🎓",
    finalFail: "Terus Berusaha! 🔥",
    avgScore: "Rata-rata",
    highest: "Tertinggi",
    lowest: "Terendah",
    exportPdf: "Ekspor PDF",
    analysisTable: "Ringkasan Laporan Akademik",
    diagnosisTable: "Diagnosis Performa Semester",
    subjectAnalysisTable: "Analisis Mata Pelajaran",
    subjectName: "Mata Pelajaran",
    overallAvg: "Rata-rata Keseluruhan",
    highestScore: "Nilai Tertinggi",
    lowestScore: "Nilai Terendah",
    status: "Status",
    statusComplete: "Lengkap",
    statusPartial: "Belum Lengkap",
    statusEmpty: "Kosong",
    resetData: "Reset Semua Data",
    predictionLabel: "Target Kamu",
    requiredLabel: "Butuh Nilai",
    myPrediction: "Target Kamu",
    stability: "Konsistensi",
    errorNameRequired: "Nama mata pelajaran wajib diisi",
    errorScoreRange: "Nilai harus antara 0 - 100",
    errorScoreEmpty: "Nilai tidak boleh kosong",
    emptyState: "Belum ada mata pelajaran.",
    emptyStateDesc: "Mulai dengan menambahkan mata pelajaran satu per satu atau gunakan template umum.",
    useTemplate: "Gunakan Template Umum",
    stable: "Stabil",
    volatile: "Naik Turun",
    onTrack: "Aman",
    needsFocus: "Perlu Fokus",
    heroDesc: "Pantau nilai dan atur strategi belajarmu agar bisa mencapai target kelulusan impian.",
    calcDesc: "Lihat hasil akhir dari gabungan nilai asli dan target yang sudah kamu buat.",
    combinedScore: "Rata-rata Akhir",
    roadmapStrategy: "Strategi Belajar",
    downloadPdf: "Unduh PDF",
    back: "Kembali",
    masterData: "Data Nilai Asli",
    strategyPrediction: "Strategi & Target Nilai",
    subjectPlaceholder: "Nama Mapel",
    scoreLabel: "Nilai Asli",
    predLabel: "Target Kamu",
    performanceTrend: "Grafik Performa",
    actualVsTarget: "Nilai Asli vs Target",
    combinedAvgLabel: "Rata-rata Saat Ini",
    targetLabel: "Target",
    configLabel: "Pengaturan",
    roadmapTargetLabel: "Durasi Belajar",
    minTargetPerSmt: "Minimal Nilai Per SMT",
    detailedTranscript: "Transkrip Akademik Detail",
    strategicForecast: "Perencanaan Strategis & Forecast AI",
    studentName: "Nama Siswa",
    dateOfIssue: "Tanggal Diterbitkan",
    semesterSummary: "Ringkasan Semester",
    actualLabel: "Aktual",
    noLabel: "No",
    semesterLabel: "Semester",
    actualAvgLabel: "Rata-rata Aktual",
    peakPerformance: "Performa Puncak",
    progressLabel: "Progres"
  },
  en: {
    welcome: "Welcome",
    subtitle: "Smart Grade Analytics & Strategic Planning",
    enterName: "What is your name?",
    start: "Go to Dashboard",
    targetAvg: "Final Target Score",
    totalSemesters: "Semester Target",
    neededAvg: "Min Target",
    addSubject: "Add Subject",
    calculate: "View Summary & Print",
    calculating: "Preparing Report...",
    finalSuccess: "Target Achieved! 🎓",
    finalFail: "Keep Pushing! 🔥",
    avgScore: "Average",
    highest: "Highest",
    lowest: "Lowest",
    exportPdf: "Export PDF",
    analysisTable: "Academic Report Summary",
    diagnosisTable: "Semester Performance Diagnosis",
    subjectAnalysisTable: "Subject Analysis",
    subjectName: "Subject Name",
    overallAvg: "Overall Average",
    highestScore: "Highest Score",
    lowestScore: "Lowest Score",
    status: "Status",
    statusComplete: "Complete",
    statusPartial: "Incomplete",
    statusEmpty: "Empty",
    resetData: "Reset All Data",
    predictionLabel: "Your Target",
    requiredLabel: "Needed Score",
    myPrediction: "Your Target",
    stability: "Consistency",
    errorNameRequired: "Subject name is required",
    errorScoreRange: "Score must be between 0 - 100",
    errorScoreEmpty: "Score cannot be empty",
    emptyState: "No subjects added yet.",
    emptyStateDesc: "Start by adding subjects one by one or use the common template.",
    useTemplate: "Use Common Template",
    stable: "Stable",
    volatile: "Volatile",
    onTrack: "On Track",
    needsFocus: "Needs Focus",
    heroDesc: "Monitor your grades and set your study strategy to achieve your dream graduation target.",
    calcDesc: "View the final result combining your actual scores and the targets you've set.",
    combinedScore: "Final Average",
    roadmapStrategy: "Study Strategy",
    downloadPdf: "Download PDF",
    back: "Back",
    masterData: "Actual Score Data",
    strategyPrediction: "Strategy & Target Score",
    subjectPlaceholder: "Subject Name",
    scoreLabel: "Actual Score",
    predLabel: "Your Target",
    performanceTrend: "Performance Chart",
    actualVsTarget: "Actual vs Target",
    combinedAvgLabel: "Current Average",
    targetLabel: "Target",
    configLabel: "Settings",
    roadmapTargetLabel: "Study Duration",
    minTargetPerSmt: "Min Score Per SMT",
    detailedTranscript: "Detailed Academic Transcript",
    strategicForecast: "Strategic Planning & AI Forecast",
    studentName: "Student Name",
    dateOfIssue: "Date of Issue",
    semesterSummary: "Semester Summary",
    actualLabel: "Actual",
    noLabel: "No",
    semesterLabel: "Semester",
    actualAvgLabel: "Actual Avg",
    peakPerformance: "Peak Performance",
    progressLabel: "Progress"
  }
};
