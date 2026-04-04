
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Download, Sun, Moon, X, Plus, TrendingUp, TrendingDown, Minus, Trophy, Target, Award, AlertCircle, BookOpen, Info } from 'lucide-react';
import { AppData, Semester, Subject } from './types';
import { 
  calculateSemesterAverage, 
  calculateOverallAverage, 
  getSemesterStats,
  saveToStorage, 
  loadFromStorage,
  translations 
} from './utils';

const generateId = () => Math.random().toString(36).substring(2, 11);

const INITIAL_DATA: AppData = {
  userName: '',
  semesters: Array.from({ length: 6 }, (_, i) => ({ id: i + 1, subjects: [] })),
  targetAvg: 85,
  totalSemestersTarget: 6,
  theme: 'light',
  language: 'id'
};

const Modal = ({ children, onClose, maxWidth = 'max-w-xl' }: { children?: React.ReactNode, onClose: () => void, maxWidth?: string }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 print-hide"
    onClick={onClose}>
    <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
      className={`bg-white dark:bg-slate-900 w-full ${maxWidth} rounded-[2.5rem] p-8 sm:p-12 shadow-3xl border border-slate-200 dark:border-slate-800 relative overflow-hidden`}
      onClick={e => e.stopPropagation()}>
      <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
      <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:scale-110 transition-all text-slate-500">✕</button>
      {children}
    </motion.div>
  </motion.div>
);

const App: React.FC = () => {
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [activeSemesterId, setActiveSemesterId] = useState<number>(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [activeModal, setActiveModal] = useState<'final' | null>(null);
  const [tempName, setTempName] = useState('');

  const t = useMemo(() => translations[data.language], [data.language]);

  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      setData(saved);
      setTempName(saved.userName || '');
      if (!saved.userName) setShowWelcome(true);
    } else {
      setShowWelcome(true);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', data.theme === 'dark');
    if (isLoaded) saveToStorage(data);
  }, [data.theme, data, isLoaded]);

  const syncS1ToOthers = useCallback((allSemesters: Semester[]) => {
    const s1 = allSemesters[0];
    if (!s1) return allSemesters;
    return allSemesters.map(s => {
      if (s.id === 1) return s;
      const newSubjects = s1.subjects.map(template => {
        const existing = s.subjects.find(sub => sub.name === template.name);
        return existing ? { ...existing, name: template.name } : { id: generateId(), name: template.name, score: 0, prediction: 0 };
      });
      return { ...s, subjects: newSubjects };
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const targetCount = Math.max(1, Math.min(12, data.totalSemestersTarget));
    if (data.semesters.length !== targetCount) {
      setData(prev => {
        let currentSems = [...prev.semesters];
        if (currentSems.length < targetCount) {
          const toAdd = targetCount - currentSems.length;
          const newSems = Array.from({ length: toAdd }, (_, i) => ({ id: currentSems.length + i + 1, subjects: [] }));
          currentSems = [...currentSems, ...newSems];
        } else {
          currentSems = currentSems.slice(0, targetCount);
        }
        return { ...prev, semesters: syncS1ToOthers(currentSems) };
      });
    }
  }, [data.totalSemestersTarget, isLoaded, syncS1ToOthers]);

  const getSemesterStatus = useCallback((semester: Semester) => {
    if (!semester || semester.subjects.length === 0) return 'empty';
    const scoredCount = semester.subjects.filter(s => s.score > 0).length;
    if (scoredCount === 0) return 'empty';
    if (scoredCount < semester.subjects.length) return 'partial';
    return 'complete';
  }, []);

  const overallAvg = useMemo(() => calculateOverallAverage(data.semesters), [data.semesters]);
  const completeSemestersCount = useMemo(() => data.semesters.filter(s => getSemesterStatus(s) === 'complete').length, [data.semesters, getSemesterStatus]);

  const neededAvg = useMemo(() => {
    const remaining = data.totalSemestersTarget - completeSemestersCount;
    if (remaining <= 0) return data.targetAvg;
    const targetTotalSum = data.targetAvg * data.totalSemestersTarget;
    const currentSumOfAverages = data.semesters
      .filter(s => getSemesterStatus(s) === 'complete')
      .reduce((acc, sem) => acc + calculateSemesterAverage(sem), 0);
    const needed = (targetTotalSum - currentSumOfAverages) / remaining;
    return Math.max(0, Math.min(100, needed));
  }, [data.targetAvg, data.totalSemestersTarget, completeSemestersCount, data.semesters, getSemesterStatus]);

  const hasValidationErrors = useMemo(() => {
    return data.semesters.some(sem => 
      sem.subjects.some(sub => 
        !sub.name.trim() || sub.score < 0 || sub.score > 100 || sub.prediction < 0 || sub.prediction > 100
      )
    );
  }, [data.semesters]);

  const subjectAverages = useMemo(() => {
    if (!data.semesters[0] || data.semesters[0].subjects.length === 0) return [];
    
    return data.semesters[0].subjects.map(subjectTemplate => {
      let totalScore = 0;
      let count = 0;
      let highest = 0;
      let lowest = 100;
      
      data.semesters.forEach(sem => {
        const sub = sem.subjects.find(s => s.name === subjectTemplate.name);
        if (sub) {
          const scoreToUse = sub.score > 0 ? sub.score : (sub.prediction > 0 ? sub.prediction : 0);
          if (scoreToUse > 0) {
            totalScore += scoreToUse;
            count++;
            if (scoreToUse > highest) highest = scoreToUse;
            if (scoreToUse < lowest) lowest = scoreToUse;
          }
        }
      });
      
      const avg = count > 0 ? totalScore / count : 0;
      
      return {
        name: subjectTemplate.name,
        avg,
        highest: count > 0 ? highest : 0,
        lowest: count > 0 ? lowest : 0,
        count
      };
    }).filter(s => s.name.trim() !== '');
  }, [data.semesters]);

  const activeSemester = useMemo(() => data.semesters.find(s => s.id === activeSemesterId) || null, [data.semesters, activeSemesterId]);

  const chartData = useMemo(() => {
    return data.semesters.map(s => {
      const actualAvg = calculateSemesterAverage(s, false);
      const combinedAvg = calculateSemesterAverage(s, true);
      return {
        name: `SMT ${s.id}`,
        Actual: actualAvg > 0 ? parseFloat(actualAvg.toFixed(2)) : null,
        Combined: combinedAvg > 0 ? parseFloat(combinedAvg.toFixed(2)) : null,
        Target: data.targetAvg
      };
    });
  }, [data.semesters, data.targetAvg]);

  const handleUpdateSubject = (subId: string, field: keyof Subject, value: string | number) => {
    setData(prev => {
      const updatedSems = prev.semesters.map(s => {
        if (s.id === activeSemesterId) {
          return { ...s, subjects: s.subjects.map(sub => sub.id === subId ? { ...sub, [field]: value } : sub) };
        }
        return s;
      });
      return activeSemesterId === 1 && field === 'name' ? { ...prev, semesters: syncS1ToOthers(updatedSems) } : { ...prev, semesters: updatedSems };
    });
  };

  const handleAddSubject = () => {
    setData(prev => {
      const newId = generateId();
      const updatedSems = prev.semesters.map(s => ({
        ...s,
        subjects: [...s.subjects, { id: newId, name: '', score: 0, prediction: 0 }]
      }));
      return { ...prev, semesters: updatedSems };
    });
  };

  const handleUseTemplate = () => {
    const templateSubjects = ['Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'IPA', 'IPS'];
    setData(prev => {
      const updatedSems = prev.semesters.map(s => {
        const newSubjects = templateSubjects.map(name => ({
          id: generateId(),
          name,
          score: 0,
          prediction: 0
        }));
        return { ...s, subjects: [...s.subjects, ...newSubjects] };
      });
      return { ...prev, semesters: updatedSems };
    });
  };

  const handleDeleteSubject = (subId: string) => {
    setData(prev => {
      const targetSem = prev.semesters.find(s => s.id === activeSemesterId);
      const targetSub = targetSem?.subjects.find(s => s.id === subId);
      if (!targetSub) return prev;
      const newSemesters = prev.semesters.map(s => ({
        ...s,
        subjects: s.subjects.filter(sub => activeSemesterId === 1 ? sub.name !== targetSub.name : sub.id !== subId)
      }));
      return { ...prev, semesters: newSemesters };
    });
  };

  const handleReset = () => {
    if (window.confirm(t.confirmReset)) {
      setData(INITIAL_DATA);
      setTempName('');
      setShowWelcome(true);
    }
  };

  const runCalculation = async () => {
    if (hasValidationErrors) return;
    setIsCalculating(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsCalculating(false);
    setActiveModal('final');
  };

  const saveName = () => {
    if (tempName.trim()) {
      setData(prev => ({ ...prev, userName: tempName.trim() }));
      setShowWelcome(false);
    }
  };

  const ProgressRing = ({ value, target }: { value: number, target: number }) => {
    const percentage = Math.min(100, (value / target) * 100);
    return (
      <div className="relative w-28 h-28 md:w-32 md:h-32 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90">
          <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-slate-800" />
          <motion.circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="283"
            initial={{ strokeDashoffset: 283 }} animate={{ strokeDashoffset: 283 - (283 * percentage) / 100 }}
            className="text-indigo-600" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl md:text-2xl font-black tech-font">{value.toFixed(1)}</span>
          <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Current</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col transition-all">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass dark:glass border-b border-slate-200 dark:border-slate-800 px-4 md:px-12 py-4 md:py-5 print-hide">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Award size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black tracking-tight leading-none uppercase">Smart<span className="text-indigo-600">Rapor</span></h1>
              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Study Planner</span>
            </div>
          </motion.div>
          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={() => setActiveModal('about')}
              className="p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-lg md:text-xl text-slate-600 dark:text-slate-300 w-11 h-11 md:w-12 md:h-12 flex items-center justify-center">
              <Info size={20} />
            </button>
            <button onClick={() => setData(d => ({ ...d, language: d.language === 'id' ? 'en' : 'id' }))}
              className="p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-xs md:text-sm font-black uppercase text-slate-600 dark:text-slate-300 w-11 h-11 md:w-12 md:h-12 flex items-center justify-center">
              {data.language.toUpperCase()}
            </button>
            <button onClick={() => setData(d => ({ ...d, theme: d.theme === 'dark' ? 'light' : 'dark' }))}
              className="p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-lg md:text-xl text-slate-600 dark:text-slate-300 w-11 h-11 md:w-12 md:h-12 flex items-center justify-center">
              {data.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div onClick={() => setShowWelcome(true)} className="flex items-center gap-2 p-1 md:p-1.5 pr-3 md:pr-4 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer h-11 md:h-12">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm md:text-base">
                {data.userName[0]?.toUpperCase() || '?'}
              </div>
              <span className="hidden sm:inline text-xs font-black uppercase tracking-tight max-w-[100px] truncate">{data.userName || t.guest}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 md:px-12 py-8 md:py-16">
        
        {/* PRINT VIEW: Header & Summary */}
        <div className="hidden print-block print-container">
          <div className="flex justify-between items-end border-b border-slate-300 pb-4 mb-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase mb-1">Smart<span className="text-indigo-600">Rapor</span></h1>
              <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">{t.detailedTranscript}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-slate-500 uppercase">{t.studentName}</p>
              <p className="text-lg font-bold tracking-tight">{data.userName.toUpperCase()}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">{t.dateOfIssue}</p>
              <p className="text-xs font-bold">{new Date().toLocaleDateString(data.language === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'full' })}</p>
            </div>
          </div>

          <div className="flex gap-8 mb-6">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">{t.targetAvg}</p>
              <p className="text-2xl font-black">{data.targetAvg.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">{t.overallAvg}</p>
              <p className="text-2xl font-black text-indigo-600">{overallAvg.toFixed(1)}</p>
            </div>
          </div>

          {/* PRINT VIEW: Semester Detailed Tables */}
          {data.semesters.map((sem, idx) => {
            const status = getSemesterStatus(sem);
            if (status === 'empty') return null;
            return (
              <div key={sem.id} className="mb-6">
                <h4 className="text-base font-bold uppercase mb-2 text-slate-800">{t.semesterLabel} {sem.id.toString().padStart(2, '0')}</h4>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="w-12 text-center">{t.noLabel}</th>
                      <th>{t.subjectName}</th>
                      <th className="w-24 text-center">{t.actualLabel}</th>
                      <th className="w-24 text-center">{t.myPrediction}</th>
                      <th className="w-24 text-center">{t.requiredLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sem.subjects.map((sub, sIdx) => (
                      <tr key={sub.id}>
                        <td className="text-center text-slate-500">{sIdx + 1}</td>
                        <td className="uppercase font-bold">{sub.name || '-'}</td>
                        <td className="text-center">{sub.score || '-'}</td>
                        <td className="text-center">{sub.prediction || '-'}</td>
                        <td className="text-center bg-slate-50 dark:bg-slate-900 font-bold">{neededAvg.toFixed(1)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold bg-slate-50 dark:bg-slate-800">
                      <td colSpan={2} className="text-right uppercase text-[10px] tracking-widest text-slate-500">{t.semesterSummary}</td>
                      <td colSpan={3} className="text-center text-base">{calculateSemesterAverage(sem, true).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* PRINT VIEW: Subject Analysis Table */}
          {subjectAverages.length > 0 && (
            <div className="mb-6">
              <h4 className="text-base font-bold uppercase mb-2 text-slate-800">{t.subjectAnalysisTable}</h4>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="w-12 text-center">{t.noLabel}</th>
                    <th>{t.subjectName}</th>
                    <th className="w-24 text-center">{t.overallAvg}</th>
                    <th className="w-24 text-center">{t.highestScore}</th>
                    <th className="w-24 text-center">{t.lowestScore}</th>
                    <th className="w-32 text-center">{t.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectAverages.map((sub, sIdx) => {
                    const isHealthy = sub.avg >= data.targetAvg;
                    return (
                      <tr key={sIdx}>
                        <td className="text-center text-slate-500">{sIdx + 1}</td>
                        <td className="uppercase font-bold">{sub.name || '-'}</td>
                        <td className="text-center font-bold">{sub.avg > 0 ? sub.avg.toFixed(1) : '-'}</td>
                        <td className="text-center">{sub.highest > 0 ? sub.highest : '-'}</td>
                        <td className="text-center">{sub.lowest > 0 && sub.lowest <= 100 ? sub.lowest : '-'}</td>
                        <td className="uppercase text-center text-[10px] font-bold tracking-widest">{sub.avg > 0 ? (isHealthy ? t.onTrack : t.needsFocus) : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PRINT VIEW: Evaluation & Motivation */}
          <div className="mt-8 pt-6 border-t border-slate-300 avoid-break">
            <h4 className="text-base font-bold uppercase mb-2 text-slate-800">{t.evalSummaryTitle}</h4>
            <div className="bg-slate-50 p-4 border border-slate-200">
              <p className="font-bold text-indigo-600 uppercase mb-1">
                {overallAvg >= data.targetAvg ? t.evalExcellentTitle : overallAvg >= data.targetAvg - 5 ? t.evalDevelopingTitle : t.evalNeedsImprovementTitle}
              </p>
              <p className="text-slate-700 italic text-sm">
                "{overallAvg >= data.targetAvg ? t.evalExcellentDesc : overallAvg >= data.targetAvg - 5 ? t.evalDevelopingDesc : t.evalNeedsImprovementDesc}"
              </p>
            </div>
          </div>
        </div>

        {/* WEB VIEW HERO */}
        <header className="mb-12 md:mb-16 print-hide">
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-6xl font-bold tracking-tight mb-4 leading-tight">
            {t.welcome},<br /><span className="gradient-text">{data.userName || t.explorer}</span>.
          </motion.h2>
          <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg font-medium max-w-2xl">{t.heroDesc}</p>
        </header>

        {/* WEB VIEW DASHBOARD */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12 md:mb-16 print-hide">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-900 dark:text-white">
              <TrendingUp size={120} strokeWidth={1} />
            </div>
            <div className="w-full md:w-auto text-center md:text-left z-10">
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{t.targetAvg}</span>
              <div className="flex items-center justify-center md:justify-start gap-3 mt-3">
                <input type="number" value={data.targetAvg} onChange={e => setData(d => ({ ...d, targetAvg: parseFloat(e.target.value) || 0 }))}
                  className="w-24 md:w-32 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 rounded-2xl p-3 md:p-4 text-3xl md:text-4xl font-bold text-center outline-none transition-all" />
                <span className="text-3xl md:text-4xl font-bold text-slate-300">/ 100</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">{t.minTargetPerSmt}</span>
                  <span className="text-xl md:text-2xl font-bold text-indigo-600">{neededAvg.toFixed(1)}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">{t.status}</span>
                  <span className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{completeSemestersCount}/{data.totalSemestersTarget} SMT</span>
                </div>
              </div>
            </div>
            <ProgressRing value={overallAvg} target={data.targetAvg} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-slate-950 dark:bg-indigo-600 rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 text-white shadow-2xl flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{t.configLabel}</span>
              <h3 className="text-2xl font-bold mt-2 mb-8">{t.roadmapTargetLabel}</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-3">{t.totalSemesters}</label>
                  <input type="range" min="1" max="12" value={data.totalSemestersTarget} onChange={e => setData(d => ({ ...d, totalSemestersTarget: parseInt(e.target.value) }))}
                    className="w-full h-2 md:h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white" />
                  <div className="text-right font-bold mt-2 text-sm">{data.totalSemestersTarget} SMT</div>
                </div>
              </div>
            </div>
            <button onClick={handleReset} className="w-full py-4 mt-8 bg-white/10 hover:bg-white/20 rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-colors">
              {t.resetData}
            </button>
          </motion.div>
        </section>

        {/* WEB VIEW CHART */}
        <section className="mb-12 md:mb-16 print-hide">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h3 className="text-2xl font-bold tracking-tight uppercase">{t.performanceTrend}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.actualVsTarget}</p>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-600"></div> {t.combinedAvgLabel}</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700"></div> {t.targetLabel}</div>
              </div>
            </div>
            <div className="h-64 md:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={data.theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: data.theme === 'dark' ? '#64748b' : '#94a3b8', fontWeight: 700 }} dy={10} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: data.theme === 'dark' ? '#64748b' : '#94a3b8', fontWeight: 700 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: data.theme === 'dark' ? '#0f172a' : '#ffffff', color: data.theme === 'dark' ? '#f8fafc' : '#0f172a', fontWeight: 700 }}
                    itemStyle={{ fontWeight: 700 }}
                  />
                  <ReferenceLine y={data.targetAvg} stroke={data.theme === 'dark' ? '#334155' : '#cbd5e1'} strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="Combined" stroke="#4f46e5" strokeWidth={4} dot={{ r: 6, strokeWidth: 2 }} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="Actual" stroke="#10b981" strokeWidth={4} dot={{ r: 6, strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </section>

        {/* WEB VIEW EDITOR */}
        <section className="mb-16 print-hide">
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-8">
            {data.semesters.map(s => {
              const active = activeSemesterId === s.id;
              const status = getSemesterStatus(s);
              return (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  key={s.id} 
                  onClick={() => setActiveSemesterId(s.id)}
                  className={`flex-shrink-0 px-6 md:px-8 py-3 md:py-4 rounded-2xl md:rounded-3xl font-bold text-[10px] md:text-xs uppercase tracking-widest transition-colors border-2 ${
                    active ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-indigo-400'
                  }`}>
                  SMT {s.id} {status === 'complete' && '✓'}
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeSemesterId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] p-6 md:p-14 shadow-2xl border border-slate-100 dark:border-slate-800">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 md:mb-12">
                <div>
                  <h3 className="text-3xl md:text-4xl font-bold tracking-tight uppercase">{t.semesterLabel} {activeSemesterId}</h3>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                    {activeSemesterId === 1 ? t.masterData : t.strategyPrediction}
                  </p>
                </div>
                {activeSemesterId === 1 && (
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddSubject} 
                    className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl md:rounded-[1.5rem] font-bold text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                    <Plus size={16} strokeWidth={3} /> {t.addSubject}
                  </motion.button>
                )}
              </div>

              <div className="space-y-6 md:space-y-8">
                {activeSemester?.subjects.length === 0 ? (
                  <div className="py-12 md:py-16 flex flex-col items-center justify-center gap-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] text-slate-400">
                    <div className="text-center max-w-md mx-auto px-4">
                      <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BookOpen size={32} />
                      </div>
                      <h4 className="text-xl font-bold mb-6 text-slate-800 dark:text-slate-200 uppercase tracking-tight">{t.howToUseTitle}</h4>
                      <ol className="text-sm text-slate-600 dark:text-slate-400 text-left space-y-4 mb-8">
                        <li className="flex gap-4 items-start"><span className="font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 w-6 h-6 flex items-center justify-center rounded-full shrink-0">1</span> <span className="pt-0.5 leading-relaxed">{t.step1}</span></li>
                        <li className="flex gap-4 items-start"><span className="font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 w-6 h-6 flex items-center justify-center rounded-full shrink-0">2</span> <span className="pt-0.5 leading-relaxed">{t.step2}</span></li>
                        <li className="flex gap-4 items-start"><span className="font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 w-6 h-6 flex items-center justify-center rounded-full shrink-0">3</span> <span className="pt-0.5 leading-relaxed">{t.step3}</span></li>
                      </ol>
                    </div>
                    {activeSemesterId === 1 && (
                      <div className="flex flex-col sm:flex-row gap-4 mt-2 w-full sm:w-auto px-4">
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleUseTemplate} 
                          className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-2xl font-bold shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                          <Plus size={18} /> {t.useTemplate}
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleAddSubject} 
                          className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-md hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                          <Plus size={18} /> {t.addSubject}
                        </motion.button>
                      </div>
                    )}
                  </div>
                ) : activeSemester?.subjects.map((sub, i) => {
                  const isPredictionNeeded = sub.score === 0;

                  return (
                    <motion.div key={sub.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      className="flex flex-col md:flex-row items-center gap-4 md:gap-6 bg-slate-50 dark:bg-slate-950 p-5 md:p-7 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 group hover:border-indigo-400 transition-all">
                      
                      <div className="flex flex-col gap-1 flex-grow w-full">
                        <div className="flex items-center gap-4 md:gap-6 w-full">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${sub.score > 0 ? 'bg-emerald-500' : 'bg-indigo-400 animate-pulse'}`}></div>
                          <input type="text" value={sub.name} readOnly={activeSemesterId !== 1}
                            onChange={e => handleUpdateSubject(sub.id, 'name', e.target.value)}
                            placeholder={t.subjectPlaceholder}
                            className="bg-transparent font-bold text-lg md:text-xl outline-none w-full focus:text-indigo-600 uppercase" />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-row sm:gap-3 w-full sm:w-auto">
                          {/* ACTUAL SCORE */}
                          <div className="flex flex-col w-full sm:w-28">
                            <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase truncate">{t.scoreLabel}</span>
                            <input type="number" value={sub.score || ''} onChange={e => handleUpdateSubject(sub.id, 'score', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                              className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl py-3 text-center font-bold text-xl focus:border-indigo-600 outline-none transition-all" placeholder="0" />
                          </div>

                          {/* USER PREDICTION */}
                          <div className="flex flex-col w-full sm:w-28">
                            <span className="text-[10px] font-bold text-indigo-400 mb-1 uppercase truncate">{t.predLabel}</span>
                            <input type="number" value={sub.prediction || ''} onChange={e => handleUpdateSubject(sub.id, 'prediction', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                              className="w-full bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-100 dark:border-indigo-800 rounded-xl py-3 text-center font-bold text-xl focus:border-indigo-500 outline-none transition-all" placeholder="0" />
                          </div>

                          {/* AI TARGET */}
                          <div className="flex flex-col w-full sm:w-28">
                            <span className="text-[10px] font-bold text-emerald-500 mb-1 uppercase truncate">{t.requiredLabel}</span>
                            <div className="w-full bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-xl py-3 text-center font-bold text-xl">
                              {neededAvg.toFixed(1)}
                            </div>
                          </div>
                        </div>

                        {activeSemesterId === 1 && (
                          <motion.button 
                            whileHover={{ scale: 1.1, color: '#f43f5e' }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteSubject(sub.id)} 
                            className="w-full sm:w-auto mt-2 sm:mt-0 p-3 text-slate-400 bg-white dark:bg-slate-800 sm:bg-transparent rounded-xl sm:rounded-none border-2 border-slate-200 dark:border-slate-700 sm:border-none transition-colors flex items-center justify-center gap-2">
                            <X size={20} strokeWidth={3} /> <span className="sm:hidden font-bold text-xs uppercase tracking-widest">{t.deleteLabel}</span>
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </section>

        {/* DIAGNOSIS TABLE SECTION */}
        <section className="mb-24 print-hide">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-8 md:p-10 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
              <h4 className="text-xl md:text-2xl font-bold uppercase tracking-tight">{t.diagnosisTable}</h4>
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.print()} 
                className="px-6 md:px-8 py-3 md:py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-bold text-[10px] md:text-xs uppercase tracking-widest transition-colors print-hide flex items-center gap-2">
                <Download size={16} strokeWidth={3} /> {t.exportPdf}
              </motion.button>
            </div>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 uppercase text-[9px] md:text-[10px]">
                    <th className="px-8 md:px-10 py-6 md:py-8 font-bold tracking-widest text-slate-400">{t.semesterLabel}</th>
                    <th className="px-8 md:px-10 py-6 md:py-8 font-bold tracking-widest text-slate-400">{t.actualAvgLabel}</th>
                    <th className="px-8 md:px-10 py-6 md:py-8 font-bold tracking-widest text-slate-400">{t.combinedAvgLabel}</th>
                    <th className="px-8 md:px-10 py-6 md:py-8 font-bold tracking-widest text-slate-400">{t.peakPerformance}</th>
                    <th className="px-8 md:px-10 py-6 md:py-8 font-bold tracking-widest text-slate-400">{t.stability}</th>
                    <th className="px-8 md:px-10 py-6 md:py-8 font-bold tracking-widest text-slate-400">{t.progressLabel}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.semesters.map(s => {
                    const actualAvg = calculateSemesterAverage(s, false);
                    const combinedAvg = calculateSemesterAverage(s, true);
                    const stats = getSemesterStats(s);
                    const status = getSemesterStatus(s);
                    const isHealthy = stats.variance < 5 && combinedAvg > data.targetAvg;
                    
                    return (
                      <tr key={s.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors">
                        <td className="px-8 md:px-10 py-6 md:py-8 font-bold text-xl md:text-2xl">{s.id.toString().padStart(2, '0')}</td>
                        <td className="px-8 md:px-10 py-6 md:py-8 font-bold text-xl md:text-2xl text-slate-400">
                          {actualAvg > 0 ? actualAvg.toFixed(1) : '---'}
                        </td>
                        <td className="px-8 md:px-10 py-6 md:py-8 font-bold text-3xl md:text-4xl text-indigo-600">
                          {combinedAvg > 0 ? combinedAvg.toFixed(1) : '---'}
                        </td>
                        <td className="px-8 md:px-10 py-6 md:py-8 font-bold text-xl md:text-2xl text-emerald-600">
                          {stats.highest > 0 ? stats.highest : '---'}
                        </td>
                        <td className="px-8 md:px-10 py-6 md:py-8">
                          {combinedAvg > 0 ? (
                            <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${isHealthy ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20'}`}>
                              {isHealthy ? t.stable : t.volatile}
                            </span>
                          ) : '---'}
                        </td>
                        <td className="px-8 md:px-10 py-6 md:py-8">
                          <div className={`h-2 w-20 md:w-24 rounded-full overflow-hidden ${status === 'complete' ? 'bg-emerald-100' : 'bg-slate-100 dark:bg-slate-800'}`}>
                            <div className={`h-full transition-all duration-1000 ${status === 'complete' ? 'bg-emerald-500 w-full' : status === 'partial' ? 'bg-amber-500 w-1/2' : 'w-0'}`}></div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SUBJECT ANALYSIS TABLE SECTION */}
        {subjectAverages.length > 0 && (
          <section className="mb-24 print-hide">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-8 md:p-10 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xl md:text-2xl font-bold uppercase tracking-tight">{t.subjectAnalysisTable}</h4>
              </div>
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 uppercase text-[9px] md:text-[10px]">
                      <th className="px-8 md:px-10 py-6 md:py-8 font-bold tracking-widest text-slate-400">{t.subjectName}</th>
                      <th className="px-8 md:px-10 py-6 md:py-8 font-bold tracking-widest text-slate-400">{t.overallAvg}</th>
                      <th className="px-8 md:px-10 py-6 md:py-8 font-bold tracking-widest text-slate-400">{t.highestScore}</th>
                      <th className="px-8 md:px-10 py-6 md:py-8 font-bold tracking-widest text-slate-400">{t.lowestScore}</th>
                      <th className="px-8 md:px-10 py-6 md:py-8 font-bold tracking-widest text-slate-400">{t.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {subjectAverages.map((sub, idx) => {
                      const isHealthy = sub.avg >= data.targetAvg;
                      return (
                        <tr key={idx} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors">
                          <td className="px-8 md:px-10 py-6 md:py-8 font-bold uppercase text-sm md:text-base">{sub.name}</td>
                          <td className="px-8 md:px-10 py-6 md:py-8 font-bold text-2xl md:text-3xl text-indigo-600">
                            {sub.avg > 0 ? sub.avg.toFixed(1) : '---'}
                          </td>
                          <td className="px-8 md:px-10 py-6 md:py-8 font-bold text-xl md:text-2xl text-emerald-600">
                            {sub.highest > 0 ? sub.highest : '---'}
                          </td>
                          <td className="px-8 md:px-10 py-6 md:py-8 font-bold text-xl md:text-2xl text-rose-500">
                            {sub.lowest > 0 && sub.lowest <= 100 ? sub.lowest : '---'}
                          </td>
                          <td className="px-8 md:px-10 py-6 md:py-8">
                            {sub.avg > 0 ? (
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${isHealthy ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/20'}`}>
                                  {isHealthy ? t.onTrack : t.needsFocus}
                                </span>
                              </div>
                            ) : '---'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* WEB VIEW SUMMARY ACTION */}
        <section className="mb-24 print-hide">
          <div className="max-w-xl mx-auto mb-16 text-center px-4">
            <motion.button 
              whileHover={isCalculating || hasValidationErrors ? {} : { scale: 1.02, y: -5 }}
              whileTap={isCalculating || hasValidationErrors ? {} : { scale: 0.98 }}
              disabled={isCalculating || hasValidationErrors} 
              onClick={runCalculation}
              className={`w-full py-6 md:py-8 rounded-[2rem] font-bold text-xl md:text-2xl shadow-xl transition-colors flex items-center justify-center gap-3 relative overflow-hidden ${
                isCalculating || hasValidationErrors ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}>
              {isCalculating ? (
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-6 h-6 border-4 border-slate-400 border-t-transparent rounded-full"
                />
              ) : (
                <Download size={24} />
              )}
              {isCalculating ? t.calculating : t.calculate}
              
              {/* Futuristic shine effect */}
              {!isCalculating && !hasValidationErrors && (
                <motion.div 
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                  animate={{ translateX: ['-100%', '200%'] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", repeatDelay: 3 }}
                />
              )}
            </motion.button>
            <p className="mt-6 text-xs font-bold text-slate-400 leading-relaxed">
              {t.calcDesc}
            </p>
          </div>
        </section>
      </main>

      {/* Popups */}
      <AnimatePresence>
        {showWelcome && (
          <Modal onClose={() => {}} maxWidth="max-w-md">
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-8 text-white shadow-2xl">
                <Award size={40} strokeWidth={2} />
              </div>
              <h2 className="text-3xl font-bold mb-3 tracking-tighter uppercase">{t.welcome}</h2>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-10 px-6 leading-relaxed">{t.subtitle}</p>
              <div className="space-y-6">
                <input autoFocus type="text" value={tempName} onChange={e => setTempName(e.target.value)}
                  placeholder={t.enterName}
                  className="w-full p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] text-2xl font-bold text-center outline-none focus:ring-8 ring-indigo-500/10 border-2 border-slate-100 dark:border-slate-700 transition-all"
                  onKeyDown={e => e.key === 'Enter' && tempName.trim() && saveName()} />
                <button onClick={saveName} disabled={!tempName.trim()}
                  className={`w-full py-6 rounded-[2rem] font-bold uppercase tracking-[0.3em] shadow-xl text-lg transition-all ${
                    tempName.trim() ? 'bg-indigo-600 text-white hover:-translate-y-1' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}>
                  {t.start}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {activeModal === 'final' && (
          <Modal onClose={() => setActiveModal(null)} maxWidth="max-w-2xl">
            <div className="text-center py-4">
              <div className="flex justify-center mb-10 text-indigo-600">
                {overallAvg >= data.targetAvg ? <Trophy size={80} strokeWidth={1.5} /> : <Target size={80} strokeWidth={1.5} />}
              </div>
              <h3 className="text-4xl font-bold text-indigo-600 mb-2 uppercase tracking-tighter">{data.userName}</h3>
              <h4 className="text-xl font-bold uppercase tracking-widest mb-12">{overallAvg >= data.targetAvg ? t.finalSuccess : t.finalFail}</h4>
              
              <div className="relative p-12 md:p-16 bg-slate-950 text-white rounded-[3.5rem] md:rounded-[4.5rem] shadow-3xl mb-12 border-t-[12px] border-indigo-600 overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 blur-3xl rounded-full"></div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 mb-8">{t.combinedScore}</p>
                <div className="text-8xl md:text-[10rem] font-bold text-indigo-400 leading-none tracking-tighter">{overallAvg.toFixed(1)}</div>
                <p className="mt-8 text-xs font-bold opacity-40 uppercase tracking-[0.2em]">{t.roadmapStrategy}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={() => { window.print(); setActiveModal(null); }} className="py-6 bg-slate-100 dark:bg-slate-800 rounded-3xl font-bold uppercase tracking-widest text-sm md:text-base hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">{t.downloadPdf}</button>
                <button onClick={() => setActiveModal(null)} className="py-6 bg-indigo-600 text-white rounded-3xl font-bold uppercase tracking-[0.3em] shadow-2xl text-lg hover:-translate-y-1 transition-all">{t.back}</button>
              </div>
            </div>
          </Modal>
        )}

        {activeModal === 'about' && (
          <Modal onClose={() => setActiveModal(null)} maxWidth="max-w-xl">
            <div className="py-4 text-left">
              <div className="flex items-center gap-4 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <Info size={24} strokeWidth={2.5} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight uppercase">{t.aboutTitle}</h2>
              </div>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">{t.aboutPurpose}</h3>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {t.aboutPurposeDesc}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">{t.aboutTech}</h3>
                  <div className="flex flex-wrap gap-2">
                    {['React', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Recharts', 'Lucide Icons'].map(tech => (
                      <span key={tech} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 text-right">
                <button onClick={() => setActiveModal(null)} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-widest text-sm hover:-translate-y-1 transition-all">
                  {t.closeLabel}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <footer className="py-12 md:py-16 text-center print-hide border-t border-slate-200 dark:border-slate-800 mt-12 md:mt-20">
        <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.5em] text-slate-400 mb-2">SmartRapor &copy; 2025 • Study Planner</p>
        <p className="text-[10px] md:text-xs font-bold text-slate-400">
          Developed by <a href="https://tesporto-nine.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600 transition-colors">KaiDev</a> &amp; <a href="https://portofolio-rizky-s.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600 transition-colors">Rizky.SDev</a>
        </p>
      </footer>
    </div>
  );
};

export default App;
