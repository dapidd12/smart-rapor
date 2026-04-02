
export interface Subject {
  id: string;
  name: string;
  score: number;
  prediction: number; // Prediksi mandiri dari user
}

export interface Semester {
  id: number;
  subjects: Subject[];
}

export interface AppPreferences {
  theme: 'dark' | 'light';
  language: 'id' | 'en';
}

export interface AppData extends AppPreferences {
  userName: string;
  semesters: Semester[];
  targetAvg: number;
  totalSemestersTarget: number;
}

export type TranslationKeys = {
  welcome: string;
  subtitle: string;
  enterName: string;
  start: string;
  targetAvg: string;
  totalSemesters: string;
  neededAvg: string;
  addSubject: string;
  calculate: string;
  calculating: string;
  finalSuccess: string;
  finalFail: string;
  avgScore: string;
  highest: string;
  lowest: string;
  exportPdf: string;
  analysisTable: string;
  diagnosisTable: string;
  statusComplete: string;
  statusPartial: string;
  statusEmpty: string;
  resetData: string;
  predictionLabel: string;
  requiredLabel: string;
  myPrediction: string;
  stability: string;
  errorNameRequired: string;
  errorScoreRange: string;
  errorScoreEmpty: string;
};
