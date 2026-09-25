import React, { useState } from 'react';
import { User, LanguageInfo } from '../types';
import { SUPPORTED_LANGUAGES } from '../lib/constants';
import { api } from '../lib/api';
import { Globe, Check, Search, Sparkles, User as UserIcon } from 'lucide-react';

interface OnboardingModalProps {
  user: User;
  isOpen: boolean;
  onComplete: (updatedUser: User) => void;
  onClose?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  user,
  isOpen,
  onComplete,
  onClose,
}) => {
  const [selectedLang, setSelectedLang] = useState<string>(user.nativeLanguage || 'en');
  const [name, setName] = useState<string>(user.name || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.updateProfile({
        name: name.trim() || user.name,
        nativeLanguage: selectedLang,
      });
      onComplete(res.user);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSelectedObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 sm:p-7 overflow-hidden">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Globe className="w-4 h-4" />
            <span>Profile & Native Language</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Configure Your Language Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Incoming messages from participants speaking other languages will be translated into your native language in real-time.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name Input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Your Display Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Elena Rostova"
                required
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Language Search & Grid */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Select Your Native Language
              </label>
              {currentSelectedObj && (
                <span className="text-xs text-indigo-300">
                  Selected: {currentSelectedObj.flag} {currentSelectedObj.name}
                </span>
              )}
            </div>

            {/* Filter Search */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search languages..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Language Selection List */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
              {filteredLanguages.map((lang) => {
                const isSelected = selectedLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSelectedLang(lang.code)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-sm shadow-indigo-500/20'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-base">{lang.flag}</span>
                      <div className="truncate">
                        <div className="text-xs font-medium leading-none truncate">{lang.nativeName}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">{lang.name}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Profile...' : 'Save & Enter Rooms'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
