
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Download, Sun, Moon, X, Plus, TrendingUp, TrendingDown, Minus, Trophy, Target, Award, AlertCircle, BookOpen, Info, Upload, FileImage, FileSpreadsheet } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import Papa from 'papaparse';
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
      className={`bg-white dark:bg-slate-900 w-full ${maxWidth} rounded-3xl p-8 sm:p-12 shadow-2xl border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden`}
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
  const [activeModal, setActiveModal] = useState<'final' | 'about' | 'import' | null>(null);
  const [tempName, setTempName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const s1 = allSemesters.find(s => s.id === 1);
    if (!s1) return allSemesters;
    return allSemesters.map(s => {
      if (s.id === 1) return s;
      const newSubjects = s1.subjects.map(template => {
        let existing = s.subjects.find(sub => sub.id === template.id);
        if (!existing && template.name.trim() !== '') {
          existing = s.subjects.find(sub => sub.name.toLowerCase() === template.name.toLowerCase());
        }
        return existing ? { ...existing, name: template.name, id: template.id } : { id: template.id, name: template.name, score: 0, prediction: 0 };
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

  const completeSemestersCount = useMemo(() => data.semesters.filter(s => getSemesterStatus(s) === 'complete').length, [data.semesters, getSemesterStatus]);

  const neededAvg = useMemo(() => {
    let currentSum = 0;
    let currentCount = 0;
    let emptyCountInExisting = 0;

    data.semesters.forEach(s => {
      s.subjects.forEach(sub => {
        if (sub.score > 0) {
          currentSum += sub.score;
          currentCount++;
        } else {
          emptyCountInExisting++;
        }
      });
    });

    const baseSubjectCount = data.semesters[0]?.subjects?.length || 0;
    if (baseSubjectCount === 0) return data.targetAvg;

    const existingSemestersCount = data.semesters.length;
    const futureSemestersCount = Math.max(0, data.totalSemestersTarget - existingSemestersCount);
    
    const remainingSubjects = emptyCountInExisting + (futureSemestersCount * baseSubjectCount);
    
    if (remainingSubjects === 0) return 0;

    const totalExpectedSubjects = currentCount + remainingSubjects;
    const totalTargetSum = data.targetAvg * totalExpectedSubjects;

    const needed = (totalTargetSum - currentSum) / remainingSubjects;
    return Math.max(0, Math.min(100, needed));
  }, [data.targetAvg, data.totalSemestersTarget, data.semesters]);

  const overallAvg = useMemo(() => calculateOverallAverage(data.semesters, neededAvg), [data.semesters, neededAvg]);

  const hasValidationErrors = useMemo(() => {
    return data.semesters.some(sem => 
      sem.subjects.some(sub => 
        !sub.name.trim() || sub.score < 0 || sub.score > 100
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
          const scoreToUse = sub.score > 0 ? sub.score : neededAvg;
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
  }, [data.semesters, neededAvg]);

  const activeSemester = useMemo(() => data.semesters.find(s => s.id === activeSemesterId) || null, [data.semesters, activeSemesterId]);

  const chartData = useMemo(() => {
    return data.semesters.map(s => {
      const actualAvg = calculateSemesterAverage(s, false, neededAvg);
      const combinedAvg = calculateSemesterAverage(s, true, neededAvg);
      return {
        name: `SMT ${s.id}`,
        Actual: actualAvg > 0 ? parseFloat(actualAvg.toFixed(2)) : null,
        Combined: combinedAvg > 0 ? parseFloat(combinedAvg.toFixed(2)) : null,
        Target: data.targetAvg
      };
    });
  }, [data.semesters, data.targetAvg, neededAvg]);

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
    const templateSubjects = ['Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'IPA', 'IPS'].map(name => ({ id: generateId(), name }));
    setData(prev => {
      const updatedSems = prev.semesters.map(s => {
        const newSubjects = templateSubjects.map(t => ({
          id: t.id,
          name: t.name,
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
      const newSemesters = prev.semesters.map(s => ({
        ...s,
        subjects: s.subjects.filter(sub => sub.id !== subId)
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

  const processImportedSubjects = (parsedSubjects: { name: string, score: number }[]) => {
    if (parsedSubjects.length > 0) {
      setData(prev => {
        const newSemesters = [...prev.semesters];
        const activeSemIndex = newSemesters.findIndex(s => s.id === activeSemesterId);
        const s1Index = newSemesters.findIndex(s => s.id === 1);

        if (activeSemIndex !== -1 && s1Index !== -1) {
          const s1Subjects = [...newSemesters[s1Index].subjects];
          
          parsedSubjects.forEach(parsedSub => {
            let existingS1Sub = s1Subjects.find(s => s.name.toLowerCase() === parsedSub.name.toLowerCase());
            if (!existingS1Sub) {
              existingS1Sub = { id: generateId(), name: parsedSub.name, score: 0, prediction: 0 };
              s1Subjects.push(existingS1Sub);
            }
          });
          
          newSemesters[s1Index] = { ...newSemesters[s1Index], subjects: s1Subjects };
          const syncedSemesters = syncS1ToOthers(newSemesters);
          
          const finalActiveSubjects = syncedSemesters[activeSemIndex].subjects.map(sub => {
            const importedSub = parsedSubjects.find(s => s.name.toLowerCase() === sub.name.toLowerCase());
            if (importedSub) {
              return { ...sub, score: importedSub.score };
            }
            return sub;
          });
          
          syncedSemesters[activeSemIndex] = { ...syncedSemesters[activeSemIndex], subjects: finalActiveSubjects };
          return { ...prev, semesters: syncedSemesters };
        }
        return prev;
      });
      setActiveModal(null);
    } else {
      alert('Could not find any valid subjects and scores in the file. Please check the format.');
    }
    setIsImporting(false);
  };

  const parseImportedText = (text: string) => {
    const lines = text.split('\n');
    const parsedSubjects: { name: string, score: number }[] = [];
    
    lines.forEach(line => {
      const numbers = line.match(/\b\d{1,3}(?:\.\d+)?\b/g);
      if (numbers) {
        const possibleScores = numbers.map(Number).filter(n => n >= 0 && n <= 100);
        if (possibleScores.length > 0) {
          const score = possibleScores[possibleScores.length - 1];
          let name = line.replace(/\b\d{1,3}(?:\.\d+)?\b/g, '').replace(/[^a-zA-Z\s]/g, '').trim();
          
          if (name.length > 2) {
             name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
             parsedSubjects.push({ name: name.substring(0, 30), score });
          }
        }
      }
    });

    processImportedSubjects(parsedSubjects);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      if (file.type.startsWith('image/')) {
        setImportProgress(10);
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = error => reject(error);
        });
        setImportProgress(40);
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: [
            {
              inlineData: {
                mimeType: file.type,
                data: base64Data
              }
            },
            "Extract the subjects and their corresponding scores from this report card image. Return the result as a JSON array of objects, where each object has a 'name' (string) and a 'score' (number). If a score is not found or invalid, skip it. Ensure the subject names are clean and properly capitalized. Do not include any markdown formatting, just the raw JSON array."
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  score: { type: Type.NUMBER }
                },
                required: ["name", "score"]
              }
            }
          }
        });
        
        setImportProgress(90);
        if (response.text) {
          try {
            const parsedData = JSON.parse(response.text);
            processImportedSubjects(parsedData);
          } catch (e) {
            console.error("Failed to parse JSON from Gemini:", e);
            alert('Failed to parse data from image.');
            setIsImporting(false);
          }
        } else {
          alert('Failed to extract data from image.');
          setIsImporting(false);
        }
      } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        Papa.parse(file, {
          complete: (results) => {
            const text = results.data.map((row: any) => row.join(' ')).join('\n');
            parseImportedText(text);
          },
          error: (error) => {
            console.error('CSV Parsing Error:', error);
            alert('Failed to parse CSV file.');
            setIsImporting(false);
          }
        });
      } else {
        alert('Unsupported file type. Please upload an image or CSV file.');
        setIsImporting(false);
      }
    } catch (error) {
      console.error('Import Error:', error);
      alert('An error occurred during import.');
      setIsImporting(false);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const saveName = () => {
    if (tempName.trim()) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setData(prev => ({ ...prev, userName: tempName.trim() }));
      setShowWelcome(false);
      setTimeout(() => window.scrollTo(0, 0), 50);
    }
  };

  const ProgressRing = ({ value, target }: { value: number, target: number }) => {
    const percentage = Math.min(100, (value / target) * 100);
    return (
      <div className="relative w-28 h-28 md:w-32 md:h-32 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 drop-shadow-xl">
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
          </defs>
          <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-slate-800/50" />
          <motion.circle cx="50%" cy="50%" r="45%" stroke="url(#ringGradient)" strokeWidth="8" fill="transparent" strokeDasharray="283" strokeLinecap="round"
            initial={{ strokeDashoffset: 283 }} animate={{ strokeDashoffset: 283 - (283 * percentage) / 100 }}
            transition={{ duration: 1.5, ease: "easeOut" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl md:text-2xl font-black tech-font text-indigo-600 dark:text-indigo-400">{value.toFixed(1)}</span>
          <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Avg</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col transition-all">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass dark:glass border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 md:px-12 py-3 md:py-5 print-hide">
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
              className="p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-lg md:text-xl text-slate-600 dark:text-slate-300 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
              <Info size={20} />
            </button>
            <button onClick={() => setData(d => ({ ...d, language: d.language === 'id' ? 'en' : 'id' }))}
              className="p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-[10px] md:text-sm font-black uppercase text-slate-600 dark:text-slate-300 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
              {data.language.toUpperCase()}
            </button>
            <button onClick={() => setData(d => ({ ...d, theme: d.theme === 'dark' ? 'light' : 'dark' }))}
              className="p-2.5 md:p-3 rounded-xl md:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-lg md:text-xl text-slate-600 dark:text-slate-300 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
              {data.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div onClick={() => setShowWelcome(true)} className="flex items-center gap-2 p-1 md:p-1.5 pr-2 md:pr-4 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer h-10 md:h-12">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm md:text-base">
                {data.userName[0]?.toUpperCase() || '?'}
              </div>
              <span className="hidden sm:inline text-[10px] md:text-xs font-black uppercase tracking-tight max-w-[80px] md:max-w-[100px] truncate">{data.userName || t.guest}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 py-8 md:py-12 lg:py-16">
        
        {/* PRINT VIEW: Header & Summary */}
        <div className="hidden print-block print-container">
          <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tight uppercase mb-2">Smart<span className="text-indigo-600">Rapor</span></h1>
              <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">{t.detailedTranscript}</p>
            </div>
            <div className="text-right border-l-2 border-slate-200 pl-6">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.studentName}</p>
              <p className="text-xl font-black tracking-tight mb-2">{data.userName.toUpperCase()}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.dateOfIssue}</p>
              <p className="text-sm font-bold">{new Date().toLocaleDateString(data.language === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'long' })}</p>
            </div>
          </div>

          <div className="flex gap-12 mb-10 bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{t.targetAvg}</p>
              <p className="text-3xl font-black">{data.targetAvg.toFixed(1)}</p>
            </div>
            <div className="border-l-2 border-slate-200 pl-12">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{t.overallAvg}</p>
              <p className="text-3xl font-black text-indigo-600">{overallAvg.toFixed(1)}</p>
            </div>
            <div className="border-l-2 border-slate-200 pl-12">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Status</p>
              <p className={`text-xl font-black mt-1 ${overallAvg >= data.targetAvg ? 'text-emerald-600' : 'text-rose-600'}`}>
                {overallAvg >= data.targetAvg ? 'TARGET ACHIEVED' : 'NEEDS IMPROVEMENT'}
              </p>
            </div>
          </div>

          {/* PRINT VIEW: Chart */}
          <div className="mb-10 avoid-break">
            <h4 className="text-sm font-black uppercase tracking-widest mb-4 text-slate-800 border-b border-slate-300 pb-2">{t.performanceTrend}</h4>
            <div className="w-full flex justify-center">
              <AreaChart width={700} height={250} data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCombinedPrint" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActualPrint" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                <ReferenceLine y={data.targetAvg} stroke="#94a3b8" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="Combined" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorCombinedPrint)" isAnimationActive={false} />
                <Area type="monotone" dataKey="Actual" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorActualPrint)" isAnimationActive={false} />
              </AreaChart>
            </div>
          </div>

          {/* PRINT VIEW: Semester Detailed Tables */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {data.semesters.map((sem, idx) => {
              const status = getSemesterStatus(sem);
              if (status === 'empty') return null;
              return (
                <div key={sem.id} className="mb-4 avoid-break">
                  <h4 className="text-sm font-black uppercase tracking-widest mb-3 text-slate-800 border-b border-slate-300 pb-2">{t.semesterLabel} {sem.id.toString().padStart(2, '0')}</h4>
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="w-8 text-center pb-2">{t.noLabel}</th>
                        <th className="pb-2">{t.subjectName}</th>
                        <th className="w-16 text-center pb-2">{t.actualLabel}</th>
                        <th className="w-16 text-center pb-2">{t.requiredLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sem.subjects.map((sub, sIdx) => (
                        <tr key={sub.id}>
                          <td className="text-center text-slate-500 py-1.5">{sIdx + 1}</td>
                          <td className="uppercase font-bold py-1.5">{sub.name || '-'}</td>
                          <td className="text-center font-bold py-1.5">{sub.score || '-'}</td>
                          <td className="text-center font-bold text-indigo-600 py-1.5">{neededAvg.toFixed(1)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-slate-800">
                        <td colSpan={2} className="text-right uppercase text-[9px] font-black tracking-widest text-slate-500 py-2">{t.semesterSummary}</td>
                        <td colSpan={2} className="text-center font-black text-sm py-2">{calculateSemesterAverage(sem, true, neededAvg).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {/* PRINT VIEW: Subject Analysis Table */}
          {subjectAverages.length > 0 && (
            <div className="mb-10 avoid-break">
              <h4 className="text-sm font-black uppercase tracking-widest mb-4 text-slate-800 border-b border-slate-300 pb-2">{t.subjectAnalysisTable}</h4>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="w-10 text-center pb-2">{t.noLabel}</th>
                    <th className="pb-2">{t.subjectName}</th>
                    <th className="w-20 text-center pb-2">{t.overallAvg}</th>
                    <th className="w-20 text-center pb-2">{t.highestScore}</th>
                    <th className="w-20 text-center pb-2">{t.lowestScore}</th>
                    <th className="w-24 text-center pb-2">{t.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectAverages.map((sub, sIdx) => {
                    const isHealthy = sub.avg >= data.targetAvg;
                    return (
                      <tr key={sIdx}>
                        <td className="text-center text-slate-500 py-2">{sIdx + 1}</td>
                        <td className="uppercase font-bold py-2">{sub.name || '-'}</td>
                        <td className="text-center font-black py-2">{sub.avg > 0 ? sub.avg.toFixed(1) : '-'}</td>
                        <td className="text-center font-bold text-emerald-600 py-2">{sub.highest > 0 ? sub.highest.toFixed(1) : '-'}</td>
                        <td className="text-center font-bold text-rose-600 py-2">{sub.lowest > 0 && sub.lowest <= 100 ? sub.lowest.toFixed(1) : '-'}</td>
                        <td className="uppercase text-center text-[9px] font-black tracking-widest py-2">{sub.avg > 0 ? (isHealthy ? t.onTrack : t.needsFocus) : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PRINT VIEW: Evaluation & Motivation */}
          <div className="mt-12 pt-8 border-t-2 border-slate-800 avoid-break">
            <h4 className="text-sm font-black uppercase tracking-widest mb-4 text-slate-800">{t.evalSummaryTitle}</h4>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <p className="font-black text-indigo-600 uppercase tracking-widest mb-2 text-sm">
                {overallAvg >= data.targetAvg ? t.evalExcellentTitle : overallAvg >= data.targetAvg - 5 ? t.evalDevelopingTitle : t.evalNeedsImprovementTitle}
              </p>
              <p className="text-slate-700 italic text-sm leading-relaxed font-medium">
                "{overallAvg >= data.targetAvg ? t.evalExcellentDesc : overallAvg >= data.targetAvg - 5 ? t.evalDevelopingDesc : t.evalNeedsImprovementDesc}"
              </p>
            </div>
          </div>
        </div>

        {/* WEB VIEW HERO */}
        <header className="relative mb-10 sm:mb-12 md:mb-16 print-hide">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none"></div>
          <div className="absolute top-0 right-20 w-48 h-48 bg-purple-500/10 dark:bg-purple-500/20 blur-[80px] rounded-full pointer-events-none"></div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-3 sm:mb-4 leading-tight z-10">
            {t.welcome},<br /><span className="gradient-text">{data.userName || t.explorer}</span>.
          </motion.h2>
          <p className="relative text-slate-500 dark:text-slate-400 text-sm sm:text-base md:text-lg font-medium max-w-2xl z-10">{t.heroDesc}</p>
        </header>

        {/* WEB VIEW DASHBOARD */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-12 md:mb-16 print-hide">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 md:gap-12 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-900 dark:text-white transition-transform duration-700 group-hover:scale-110 group-hover:rotate-12">
              <TrendingUp size={120} strokeWidth={1} />
            </div>
            <div className="w-full md:w-auto text-center md:text-left z-10">
              <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">{t.targetAvg}</span>
              <div className="flex items-center justify-center md:justify-start gap-3 mt-2 sm:mt-3">
                <input type="number" value={data.targetAvg === 0 ? '' : data.targetAvg} onChange={e => setData(d => ({ ...d, targetAvg: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))}
                  className="w-20 sm:w-24 md:w-32 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 rounded-2xl p-3 md:p-4 text-2xl sm:text-3xl md:text-4xl font-bold text-center outline-none transition-all" />
                <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-300">/ 100</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-6 sm:mt-8">
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
            className="bg-slate-950 dark:bg-indigo-950 rounded-3xl p-6 sm:p-8 md:p-10 text-white shadow-xl flex flex-col justify-between border border-slate-800 dark:border-indigo-900/50 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none"></div>
            <div className="relative z-10">
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
            <button onClick={handleReset} className="relative z-10 w-full py-4 mt-8 bg-white/10 hover:bg-white/20 rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-colors backdrop-blur-sm">
              {t.resetData}
            </button>
          </motion.div>
        </section>

        {/* WEB VIEW CHART */}
        <section className="mb-10 sm:mb-12 md:mb-16 print-hide">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/50 dark:border-slate-800/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight uppercase">{t.performanceTrend}</h3>
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t.actualVsTarget}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">
                <div className="flex items-center gap-1.5 sm:gap-2"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-indigo-600"></div> {t.combinedAvgLabel}</div>
                <div className="flex items-center gap-1.5 sm:gap-2"><div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-300 dark:bg-slate-700"></div> {t.targetLabel}</div>
              </div>
            </div>
            <div className="h-56 sm:h-64 md:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCombined" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={data.theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: data.theme === 'dark' ? '#64748b' : '#94a3b8', fontWeight: 700 }} dy={10} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: data.theme === 'dark' ? '#64748b' : '#94a3b8', fontWeight: 700 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: data.theme === 'dark' ? '#0f172a' : '#ffffff', color: data.theme === 'dark' ? '#f8fafc' : '#0f172a', fontWeight: 700 }}
                    itemStyle={{ fontWeight: 700 }}
                  />
                  <ReferenceLine y={data.targetAvg} stroke={data.theme === 'dark' ? '#334155' : '#cbd5e1'} strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="Combined" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorCombined)" activeDot={{ r: 8 }} />
                  <Area type="monotone" dataKey="Actual" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorActual)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </section>

        {/* WEB VIEW EDITOR */}
        <section className="mb-12 md:mb-16 print-hide">
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-6 sm:mb-8">
            {data.semesters.map(s => {
              const active = activeSemesterId === s.id;
              const status = getSemesterStatus(s);
              return (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  key={s.id} 
                  onClick={() => setActiveSemesterId(s.id)}
                  className={`flex-shrink-0 px-4 sm:px-6 md:px-8 py-3 md:py-4 rounded-2xl md:rounded-3xl font-bold text-[9px] sm:text-[10px] md:text-xs uppercase tracking-widest transition-colors border-2 ${
                    active ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-indigo-400'
                  }`}>
                  SMT {s.id} {status === 'complete' && '✓'}
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeSemesterId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/50 dark:border-slate-800/50">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 mb-8 md:mb-12">
                <div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight uppercase">{t.semesterLabel} {activeSemesterId}</h3>
                  <p className="text-[9px] sm:text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 sm:mt-2">
                    {activeSemesterId === 1 ? t.masterData : t.strategyPrediction}
                  </p>
                </div>
              </div>

              <div className="space-y-4 sm:space-y-6 md:space-y-8">
                {activeSemester?.subjects.length === 0 ? (
                  <div className="py-10 sm:py-12 md:py-16 flex flex-col items-center justify-center gap-4 sm:gap-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="text-center max-w-md mx-auto px-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <BookOpen size={24} className="sm:w-8 sm:h-8" />
                      </div>
                      <h4 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-slate-800 dark:text-slate-200 uppercase tracking-tight">{t.howToUseTitle}</h4>
                      <ol className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 text-left space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                        <li className="flex gap-3 sm:gap-4 items-start"><span className="font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full shrink-0 text-[10px] sm:text-xs">1</span> <span className="pt-0.5 leading-relaxed">{t.step1}</span></li>
                        <li className="flex gap-3 sm:gap-4 items-start"><span className="font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full shrink-0 text-[10px] sm:text-xs">2</span> <span className="pt-0.5 leading-relaxed">{t.step2}</span></li>
                        <li className="flex gap-3 sm:gap-4 items-start"><span className="font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full shrink-0 text-[10px] sm:text-xs">3</span> <span className="pt-0.5 leading-relaxed">{t.step3}</span></li>
                      </ol>
                    </div>
                    {activeSemesterId === 1 && (
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto px-4">
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setActiveModal('import')} 
                          className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-2xl font-bold shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] sm:text-xs">
                          <Upload size={16} className="sm:w-[18px] sm:h-[18px]" /> Import Data
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleUseTemplate} 
                          className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-2xl font-bold shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] sm:text-xs">
                          <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> {t.useTemplate}
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleAddSubject} 
                          className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] sm:text-xs">
                          <Plus size={16} className="sm:w-[18px] sm:h-[18px]" /> {t.addSubject}
                        </motion.button>
                      </div>
                    )}
                    {activeSemesterId !== 1 && (
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto px-4 justify-center">
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setActiveModal('import')} 
                          className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-sm hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 uppercase tracking-widest text-[10px] sm:text-xs">
                          <Upload size={16} className="sm:w-[18px] sm:h-[18px]" /> Import Data
                        </motion.button>
                      </div>
                    )}
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {activeSemester?.subjects.map((sub, i) => {
                      const isPredictionNeeded = sub.score === 0;

                      return (
                        <motion.div key={sub.id} layout initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} transition={{ duration: 0.2 }}
                          className="flex flex-col md:flex-row items-center gap-4 md:gap-6 bg-white dark:bg-slate-950 p-4 sm:p-5 md:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 group hover:border-indigo-400/50 hover:shadow-md transition-all">
                          
                          <div className="flex flex-col gap-1 flex-grow w-full">
                            <div className="flex items-center gap-3 md:gap-6 w-full">
                              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${sub.score > 0 ? 'bg-emerald-500' : 'bg-indigo-400 animate-pulse'}`}></div>
                              <input type="text" value={sub.name} readOnly={activeSemesterId !== 1}
                                onChange={e => handleUpdateSubject(sub.id, 'name', e.target.value)}
                                placeholder={t.subjectPlaceholder}
                                className="bg-transparent font-bold text-base sm:text-lg md:text-xl outline-none w-full focus:text-indigo-600 uppercase" />
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:gap-3 w-full sm:w-auto">
                              {/* ACTUAL SCORE */}
                              <div className="flex flex-col w-full sm:w-24 md:w-28">
                                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 mb-1 uppercase truncate">{t.scoreLabel}</span>
                                <input type="number" value={sub.score || ''} onChange={e => handleUpdateSubject(sub.id, 'score', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                  className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl py-2.5 sm:py-3 text-center font-bold text-lg sm:text-xl focus:border-indigo-600 outline-none transition-all" placeholder="0" />
                              </div>

                              {/* REQUIRED SCORE */}
                              <div className="flex flex-col w-full sm:w-24 md:w-28">
                                <span className="text-[9px] sm:text-[10px] font-bold text-indigo-400 mb-1 uppercase truncate">{t.requiredLabel}</span>
                                <div className="w-full bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-xl py-2.5 sm:py-3 text-center font-bold text-lg sm:text-xl">
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
                  </AnimatePresence>
                )}
                
                {/* Add Subject Button at Bottom */}
                {activeSemester?.subjects && activeSemester.subjects.length > 0 && (
                  <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-center gap-4 mt-6 sm:mt-8 pt-2 sm:pt-4">
                    {activeSemesterId === 1 && (
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddSubject} 
                        className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
                        <Plus size={16} strokeWidth={3} /> {t.addSubject}
                      </motion.button>
                    )}
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveModal('import')} 
                      className="w-full sm:w-auto px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">
                      <Upload size={16} strokeWidth={3} /> Import Data
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </section>

        {/* DIAGNOSIS TABLE SECTION */}
        <section className="mb-12 sm:mb-16 md:mb-24 print-hide">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
            <div className="p-5 sm:p-6 md:p-8 border-b border-slate-100 dark:border-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
              <h4 className="text-lg sm:text-xl font-bold uppercase tracking-tight">{t.diagnosisTable}</h4>
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.print()} 
                className="w-full md:w-auto px-6 md:px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest transition-colors print-hide flex items-center justify-center gap-2">
                <Download size={16} strokeWidth={3} /> {t.exportPdf}
              </motion.button>
            </div>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 uppercase text-[9px] md:text-[10px]">
                    <th className="px-4 sm:px-6 py-4 font-bold tracking-widest text-slate-400">{t.semesterLabel}</th>
                    <th className="px-4 sm:px-6 py-4 font-bold tracking-widest text-slate-400">{t.actualAvgLabel}</th>
                    <th className="px-4 sm:px-6 py-4 font-bold tracking-widest text-slate-400">{t.combinedAvgLabel}</th>
                    <th className="px-4 sm:px-6 py-4 font-bold tracking-widest text-slate-400">{t.peakPerformance}</th>
                    <th className="px-4 sm:px-6 py-4 font-bold tracking-widest text-slate-400">{t.stability}</th>
                    <th className="px-4 sm:px-6 py-4 font-bold tracking-widest text-slate-400">{t.progressLabel}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.semesters.map(s => {
                    const actualAvg = calculateSemesterAverage(s, false, neededAvg);
                    const combinedAvg = calculateSemesterAverage(s, true, neededAvg);
                    const stats = getSemesterStats(s, neededAvg);
                    const status = getSemesterStatus(s);
                    const isHealthy = stats.variance < 5 && combinedAvg > data.targetAvg;
                    
                    return (
                      <tr key={s.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors">
                        <td className="px-4 sm:px-6 py-4 sm:py-5 font-bold text-base sm:text-lg">{s.id.toString().padStart(2, '0')}</td>
                        <td className="px-4 sm:px-6 py-4 sm:py-5 font-bold text-base sm:text-lg text-slate-400">
                          {actualAvg > 0 ? actualAvg.toFixed(1) : '---'}
                        </td>
                        <td className="px-4 sm:px-6 py-4 sm:py-5 font-bold text-xl sm:text-2xl text-indigo-600">
                          {combinedAvg > 0 ? combinedAvg.toFixed(1) : '---'}
                        </td>
                        <td className="px-4 sm:px-6 py-4 sm:py-5 font-bold text-base sm:text-lg text-emerald-600">
                          {stats.highest > 0 ? stats.highest.toFixed(1) : '---'}
                        </td>
                        <td className="px-4 sm:px-6 py-4 sm:py-5">
                          {combinedAvg > 0 ? (
                            <span className={`text-[9px] sm:text-[10px] font-bold uppercase px-2 sm:px-3 py-1 rounded-full ${isHealthy ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20'}`}>
                              {isHealthy ? t.stable : t.volatile}
                            </span>
                          ) : '---'}
                        </td>
                        <td className="px-4 sm:px-6 py-4 sm:py-5">
                          <div className={`h-1.5 sm:h-2 w-16 sm:w-20 rounded-full overflow-hidden ${status === 'complete' ? 'bg-emerald-100' : 'bg-slate-100 dark:bg-slate-800'}`}>
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
          <section className="mb-12 sm:mb-16 md:mb-24 print-hide">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
              <div className="p-5 sm:p-6 md:p-8 border-b border-slate-100 dark:border-slate-800/50">
                <h4 className="text-lg sm:text-xl font-bold uppercase tracking-tight">{t.subjectAnalysisTable}</h4>
              </div>
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 uppercase text-[9px] md:text-[10px]">
                      <th className="px-4 sm:px-6 py-4 font-bold tracking-widest text-slate-400">{t.subjectName}</th>
                      <th className="px-4 sm:px-6 py-4 font-bold tracking-widest text-slate-400">{t.overallAvg}</th>
                      <th className="px-4 sm:px-6 py-4 font-bold tracking-widest text-slate-400">{t.highestScore}</th>
                      <th className="px-4 sm:px-6 py-4 font-bold tracking-widest text-slate-400">{t.lowestScore}</th>
                      <th className="px-4 sm:px-6 py-4 font-bold tracking-widest text-slate-400">{t.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {subjectAverages.map((sub, idx) => {
                      const isHealthy = sub.avg >= data.targetAvg;
                      return (
                        <tr key={idx} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors">
                          <td className="px-4 sm:px-6 py-4 sm:py-5 font-bold uppercase text-xs sm:text-sm">{sub.name}</td>
                          <td className="px-4 sm:px-6 py-4 sm:py-5 font-bold text-lg sm:text-xl text-indigo-600">
                            {sub.avg > 0 ? sub.avg.toFixed(1) : '---'}
                          </td>
                          <td className="px-4 sm:px-6 py-4 sm:py-5 font-bold text-base sm:text-lg text-emerald-600">
                            {sub.highest > 0 ? sub.highest.toFixed(1) : '---'}
                          </td>
                          <td className="px-4 sm:px-6 py-4 sm:py-5 font-bold text-base sm:text-lg text-rose-500">
                            {sub.lowest > 0 && sub.lowest <= 100 ? sub.lowest.toFixed(1) : '---'}
                          </td>
                          <td className="px-4 sm:px-6 py-4 sm:py-5">
                            {sub.avg > 0 ? (
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] sm:text-[10px] font-bold uppercase px-2 sm:px-3 py-1 rounded-full ${isHealthy ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/20'}`}>
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
        <section className="mb-16 sm:mb-20 md:mb-24 print-hide">
          <div className="max-w-xl mx-auto mb-12 sm:mb-16 text-center px-4">
            <motion.button 
              whileHover={isCalculating || hasValidationErrors ? {} : { scale: 1.02, y: -5 }}
              whileTap={isCalculating || hasValidationErrors ? {} : { scale: 0.98 }}
              disabled={isCalculating || hasValidationErrors} 
              onClick={runCalculation}
              className={`w-full py-5 sm:py-6 md:py-8 rounded-2xl sm:rounded-3xl font-bold text-lg sm:text-xl md:text-2xl shadow-xl transition-all flex items-center justify-center gap-2 sm:gap-3 relative overflow-hidden ${
                isCalculating || hasValidationErrors ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-2xl'
              }`}>
              {isCalculating ? (
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-5 h-5 sm:w-6 sm:h-6 border-4 border-slate-400 border-t-transparent rounded-full"
                />
              ) : (
                <Download size={20} className="sm:w-6 sm:h-6" />
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
            <p className="mt-4 sm:mt-6 text-[10px] sm:text-xs font-bold text-slate-400 leading-relaxed">
              {t.calcDesc}
            </p>
          </div>
        </section>
      </main>

      {/* Popups */}
      <AnimatePresence>
        {showWelcome && (
          <Modal onClose={() => {}} maxWidth="max-w-md">
            <div className="text-center py-2 sm:py-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 sm:mb-8 text-white shadow-2xl">
                <Award size={32} strokeWidth={2} className="sm:w-10 sm:h-10" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 tracking-tighter uppercase">{t.welcome}</h2>
              <p className="text-slate-400 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest mb-8 sm:mb-10 px-4 sm:px-6 leading-relaxed">{t.subtitle}</p>
              <div className="space-y-4 sm:space-y-6">
                <input autoFocus type="text" value={tempName} onChange={e => setTempName(e.target.value)}
                  placeholder={t.enterName}
                  className="w-full p-5 sm:p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xl sm:text-2xl font-bold text-center outline-none focus:ring-4 ring-indigo-500/20 border-2 border-slate-200 dark:border-slate-700 transition-all"
                  onKeyDown={e => e.key === 'Enter' && tempName.trim() && saveName()} />
                <button onClick={saveName} disabled={!tempName.trim()}
                  className={`w-full py-4 sm:py-5 rounded-2xl font-bold uppercase tracking-[0.2em] shadow-lg text-sm sm:text-base transition-all ${
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
            <div className="text-center py-2 sm:py-4">
              <div className="flex justify-center mb-8 sm:mb-10 text-indigo-600">
                {overallAvg >= data.targetAvg ? <Trophy size={64} strokeWidth={1.5} className="sm:w-20 sm:h-20" /> : <Target size={64} strokeWidth={1.5} className="sm:w-20 sm:h-20" />}
              </div>
              <h3 className="text-3xl sm:text-4xl font-bold text-indigo-600 mb-2 uppercase tracking-tighter">{data.userName}</h3>
              <h4 className="text-lg sm:text-xl font-bold uppercase tracking-widest mb-8 sm:mb-12">{overallAvg >= data.targetAvg ? t.finalSuccess : t.finalFail}</h4>
              
              <div className="relative p-8 sm:p-10 md:p-14 bg-slate-950 text-white rounded-3xl shadow-2xl mb-8 sm:mb-12 border-t-[8px] border-indigo-600 overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 sm:w-40 sm:h-40 bg-indigo-500/20 blur-3xl rounded-full"></div>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 mb-6 sm:mb-8">{t.combinedScore}</p>
                <div className="text-7xl sm:text-8xl md:text-[10rem] font-bold text-indigo-400 leading-none tracking-tighter">{overallAvg.toFixed(1)}</div>
                <p className="mt-6 sm:mt-8 text-[10px] sm:text-xs font-bold opacity-40 uppercase tracking-[0.2em]">{t.roadmapStrategy}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { window.print(); setActiveModal(null); }} 
                  className="py-5 sm:py-6 bg-slate-100 dark:bg-slate-800 rounded-3xl font-bold uppercase tracking-widest text-xs sm:text-sm md:text-base hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  {t.downloadPdf}
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveModal(null)} 
                  className="py-5 sm:py-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-3xl font-bold uppercase tracking-[0.3em] shadow-xl text-base sm:text-lg hover:shadow-2xl transition-all">
                  {t.back}
                </motion.button>
              </div>
            </div>
          </Modal>
        )}

        {activeModal === 'import' && (
          <Modal onClose={() => !isImporting && setActiveModal(null)} maxWidth="max-w-md">
            <div className="text-center py-2 sm:py-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 sm:mb-8 text-white shadow-2xl">
                <Upload size={32} strokeWidth={2} className="sm:w-10 sm:h-10" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 tracking-tighter uppercase">Import Data</h2>
              <p className="text-slate-400 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest mb-8 sm:mb-10 px-4 sm:px-6 leading-relaxed">
                Upload Image or CSV to extract subjects and scores
              </p>
              
              <div className="space-y-4 sm:space-y-6">
                <input 
                  type="file" 
                  accept="image/*,.csv" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  disabled={isImporting}
                />
                
                {isImporting ? (
                  <div className="py-8">
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                      Processing... {importProgress > 0 ? `${importProgress}%` : ''}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => fileInputRef.current?.click()} 
                      className="py-5 sm:py-6 bg-slate-100 dark:bg-slate-800 rounded-3xl font-bold uppercase tracking-widest text-xs sm:text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex flex-col items-center justify-center gap-2">
                      <FileImage size={24} className="text-indigo-600" />
                      <span>Upload Image</span>
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => fileInputRef.current?.click()} 
                      className="py-5 sm:py-6 bg-slate-100 dark:bg-slate-800 rounded-3xl font-bold uppercase tracking-widest text-xs sm:text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet size={24} className="text-indigo-600" />
                      <span>Upload CSV</span>
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}

        {activeModal === 'about' && (
          <Modal onClose={() => setActiveModal(null)} maxWidth="max-w-xl">
            <div className="py-2 sm:py-4 text-left">
              <div className="flex items-center gap-4 mb-6 sm:mb-8 border-b border-slate-100 dark:border-slate-800 pb-4 sm:pb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <Info size={20} strokeWidth={2.5} className="sm:w-6 sm:h-6" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight uppercase">{t.aboutTitle}</h2>
              </div>
              
              <div className="space-y-6 sm:space-y-8">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-400 mb-2 sm:mb-3">{t.aboutPurpose}</h3>
                  <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                    {t.aboutPurposeDesc}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-slate-400 mb-2 sm:mb-3">{t.aboutTech}</h3>
                  <div className="flex flex-wrap gap-2">
                    {['React', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Recharts', 'Lucide Icons'].map(tech => (
                      <span key={tech} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs sm:text-sm font-bold">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 sm:mt-10 pt-4 sm:pt-6 border-t border-slate-100 dark:border-slate-800 text-right">
                <button onClick={() => setActiveModal(null)} className="w-full sm:w-auto px-8 py-3 sm:py-4 bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs sm:text-sm hover:-translate-y-1 transition-all">
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
