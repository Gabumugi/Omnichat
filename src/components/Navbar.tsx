import React from 'react';
import { User } from '../types';
import { SUPPORTED_LANGUAGES } from '../lib/constants';
import { Globe, Shield, Sparkles, LogOut, Terminal, Zap, BookOpen } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  activeView: 'dashboard' | 'room' | 'login' | 'docs';
  setActiveView: (view: 'dashboard' | 'room' | 'login' | 'docs') => void;
  onOpenPricing: () => void;
  onOpenDocs: () => void;
  onOpenLanguageSelector: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeView,
  setActiveView,
  onOpenPricing,
  onOpenDocs,
  onOpenLanguageSelector,
  onOpenProfile,
  onLogout,
}) => {
  const currentLang = currentUser
    ? SUPPORTED_LANGUAGES.find((l) => l.code === currentUser.nativeLanguage) || SUPPORTED_LANGUAGES[0]
    : null;

  const quotaPercent = currentUser
    ? Math.min(100, Math.round((currentUser.wordsTranslatedThisMonth / currentUser.wordQuota) * 100))
    : 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-sm shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                <Globe className="w-4 h-4 text-indigo-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-indigo-200 transition-colors">
              LinguaPulse
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`hover:text-white transition-colors cursor-pointer ${
              activeView === 'dashboard' ? 'text-indigo-400 font-semibold' : ''
            }`}
          >
            Rooms
          </button>
          <button
            onClick={onOpenPricing}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
          >
            <span>Pricing</span>
            {currentUser?.tier === 'pro' && (
              <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                PRO
              </span>
            )}
          </button>
          <button
            onClick={onOpenDocs}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Architecture & SQL</span>
          </button>
        </nav>

        {/* Zone 3: Primary actions & User status */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <>
              {/* Word Quota Usage Meter */}
              <button
                onClick={onOpenPricing}
                title="Monthly translated word quota"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-colors text-xs text-slate-300 group"
              >
                <Zap className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                <div className="flex items-center gap-1.5 font-mono tabular-nums">
                  <span className="font-semibold text-slate-200">
                    {currentUser.wordsTranslatedThisMonth.toLocaleString()}
                  </span>
                  <span className="text-slate-500">/</span>
                  <span className="text-slate-400">
                    {currentUser.tier === 'pro' ? '∞' : currentUser.wordQuota.toLocaleString()}
                  </span>
                </div>
                <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden ml-1">
                  <div
                    className={`h-full rounded-full ${
                      quotaPercent > 85 ? 'bg-rose-500' : quotaPercent > 60 ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${quotaPercent}%` }}
                  />
                </div>
              </button>

              {/* Native Language Selector Button */}
              {currentLang && (
                <button
                  onClick={onOpenLanguageSelector}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-xs text-slate-200 transition-colors cursor-pointer"
                  title={`Your native language is ${currentLang.name}. Click to change.`}
                >
                  <span className="text-sm">{currentLang.flag}</span>
                  <span className="font-medium hidden sm:inline">{currentLang.nativeName}</span>
                </button>
              )}

              {/* User Avatar, Profile Button & Logout */}
              <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer group text-left"
                  title="Edit profile & avatar"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-xs font-semibold text-indigo-300 group-hover:border-indigo-400 transition-colors">
                    {currentUser.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      currentUser.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="hidden sm:inline text-xs font-medium text-slate-200 group-hover:text-white truncate max-w-[100px]">
                    {currentUser.name}
                  </span>
                </button>
                <button
                  onClick={onLogout}
                  title="Sign out"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-md transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setActiveView('login')}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 shadow-sm shadow-indigo-600/30 transition-all cursor-pointer whitespace-nowrap"
            >
              Sign In with OTP
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
