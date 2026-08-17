import React from 'react';
import { motion } from 'motion/react';
import { History, Flame, GraduationCap, Sparkles, ShieldCheck, Cpu } from 'lucide-react';
import studyAiLogo from '../assets/images/study_ai_logo_1785811864515.jpg';
import { AppState } from '../types';

interface HeaderProps {
  state: AppState;
  isPowerOn: boolean;
  onTogglePower: () => void;
  onOpenHistory: () => void;
  historyCount: number;
  studyStreak: number;
  onIncrementStreak: () => void;
  percentCompleted: number;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  isPowerOn,
  onTogglePower,
  onOpenHistory,
  historyCount,
  studyStreak,
  onIncrementStreak,
  percentCompleted,
}) => {
  return (
    <header className="w-full max-w-7xl mx-auto py-4 sm:py-5 flex flex-col md:flex-row justify-between items-center gap-4 z-20 border-b border-white/[0.08] pb-5 transition-all">
      {/* Brand & Status */}
      <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-3.5">
          <div 
            className="relative group cursor-pointer" 
            onClick={onTogglePower}
            title={isPowerOn ? "સિસ્ટમ બંધ કરો (Power Off)" : "સિસ્ટમ શરૂ કરો (Power On)"}
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 rounded-2xl blur-md opacity-60 group-hover:opacity-100 transition duration-500 animate-pulse" />
            <img 
              src={studyAiLogo} 
              alt="Study AI Logo" 
              referrerPolicy="no-referrer"
              className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-white/20 shadow-2xl bg-black transition-transform group-hover:scale-105"
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {isPowerOn && (
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    state === 'speaking' ? 'bg-purple-400' : 'bg-emerald-400'
                  }`} />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  isPowerOn 
                    ? state === 'speaking' 
                      ? 'bg-purple-400 shadow-[0_0_8px_#c084fc]' 
                      : 'bg-emerald-400 shadow-[0_0_8px_#34d399]' 
                    : 'bg-white/20'
                }`} />
              </span>
              <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-white/60 flex items-center gap-1">
                <Cpu size={10} className="text-cyan-400" />
                SYS_STATUS: <strong className={isPowerOn ? 'text-cyan-300' : 'text-white/40'}>{state}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider bg-gradient-to-r from-white via-cyan-100 to-amber-200 bg-clip-text text-transparent uppercase font-sans">
                STUDY AI
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded-full uppercase tracking-wider">
                <Sparkles size={10} /> v2.5 PRO
              </span>
            </div>

            <span className="text-[9px] sm:text-[10px] font-mono tracking-widest text-white/50 uppercase">
              SMART LEARNING • MALE AI TEACHER • TOPPER REVISION
            </span>
          </div>
        </div>

        {/* Mobile Quick Power Trigger */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={onOpenHistory}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-cyan-300 relative"
            title="ઇતિહાસ"
          >
            <History size={18} />
            {historyCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Stats and Badges */}
      <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 w-full md:w-auto">
        {/* Study Streak Badge */}
        <div 
          onClick={onIncrementStreak}
          className="flex items-center gap-2 bg-white/[0.03] hover:bg-white/[0.07] px-3 py-2 rounded-2xl border border-white/10 backdrop-blur-md cursor-pointer transition-all active:scale-95 group shadow-sm"
          title="Study Streak વધારવા માટે ક્લિક કરો"
        >
          <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
            <Flame size={16} className="animate-pulse" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">Study Streak</span>
            <span className="text-xs font-bold text-amber-300 font-sans">{studyStreak} દિવસો 🔥</span>
          </div>
        </div>

        {/* Syllabus Progress Badge */}
        <div className="hidden sm:flex items-center gap-2 bg-white/[0.03] px-3 py-2 rounded-2xl border border-white/10 backdrop-blur-md shadow-sm">
          <div className="p-1.5 rounded-xl bg-blue-500/20 text-blue-400">
            <GraduationCap size={16} />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">સિલેબસ કવરેજ</span>
            <span className="text-xs font-bold text-blue-300 font-sans">{percentCompleted}% પૂર્ણ</span>
          </div>
        </div>

        {/* Session History Drawer Button */}
        <button
          type="button"
          onClick={onOpenHistory}
          className="hidden md:flex items-center gap-2.5 bg-white/[0.03] hover:bg-white/[0.08] active:scale-95 px-3.5 py-2 rounded-2xl border border-white/10 backdrop-blur-md transition-all duration-300 group cursor-pointer shadow-sm"
          title="સત્ર ઇતિહાસ અને વાર્તાલાપ નોંધો (Session History)"
        >
          <div className="relative flex items-center justify-center">
            <History size={18} className="text-cyan-400 group-hover:rotate-12 transition-transform" />
            {historyCount > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 bg-purple-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border border-black shadow-lg animate-pulse">
                {historyCount}
              </span>
            )}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">સત્ર ઇતિહાસ</span>
            <span className="text-xs font-semibold text-cyan-200">નોંધો ({historyCount}/3)</span>
          </div>
        </button>

        {/* Developer Badge */}
        <div className="text-right bg-gradient-to-br from-white/[0.05] to-white/[0.02] px-3.5 py-2 rounded-2xl border border-white/10 backdrop-blur-md shadow-sm">
          <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-1 justify-end">
            <ShieldCheck size={11} className="text-amber-400" /> ડેવલપર
          </div>
          <div className="text-xs font-bold text-amber-300 tracking-wide font-sans">
            જીગર (JIGAR)
          </div>
        </div>
      </div>
    </header>
  );
};
