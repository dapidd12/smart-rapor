
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

export interface ScoreItem {
  id: string;
  name: string;
  score: number;
  meta?: string;
  level?: string; // e.g., 'Provinsi', 'Nasional' for achievements
  rank?: string;  // e.g., 'Juara 1' for achievements
}

export type ComponentType = 'rapor' | 'tka' | 'tpa' | 'achievement' | 'supporting' | 'custom';

export interface ScoreComponent {
  id: string;
  type: ComponentType;
  label: string;
  enabled: boolean;
  weight: number;
  scoringMethod?: 'weight' | 'bonus_points' | 'bonus_percentage';
  aggregation: 'average' | 'sum_capped' | 'highest' | 'manual';
  manualScore?: number;
  items: ScoreItem[];
}

export interface GraduationScheme {
  id: string;
  name: string;
  region?: string;
  components: ScoreComponent[];
}

export interface AchievementRubric {
  level: string;
  rank: string;
  score: number;
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
  graduationScheme: GraduationScheme;
  achievementRubric: AchievementRubric[];
  schemeDataVersion: number;
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
  graduationScheme: string;
  finalScoreEstimate: string;
  selectPreset: string;
  weightLabel: string;
  weightWarning: string;
  autoBalance: string;
  tkaSubjectCount: string;
  addTkaSubject: string;
  tpaScore: string;
  achievementList: string;
  addAchievement: string;
  achievementLevel: string;
  achievementRank: string;
  supportingSubjects: string;
  saveAsMyScheme: string;
  schemeDisclaimer: string;
  raporPlan: string;
  graduationPlan: string;
  raporScore: string;
  overallAvg: string;
  contribution: string;
  achievementRubric: string;
  score: string;
  cancel: string;
  save: string;
  level: string;
  rank: string;
  actions: string;
};
