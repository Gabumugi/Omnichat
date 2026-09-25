import React, { useState, useRef } from 'react';
import { User } from '../types';
import { SUPPORTED_LANGUAGES } from '../lib/constants';
import { api } from '../lib/api';
import {
  User as UserIcon,
  Globe,
  Upload,
  Camera,
  Sparkles,
  Check,
  Search,
  X,
  FileText,
  Shield,
  RefreshCw,
} from 'lucide-react';

interface UserProfileModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (updatedUser: User) => void;
}

const PRESET_AVATARS = [
  {
    name: 'Executive Studio',
    url: '/src/assets/images/linguapulse_avatar_maria_1790295499574.jpg',
  },
  {
    name: 'Designer Studio',
    url: '/src/assets/images/linguapulse_avatar_kenji_1790295509160.jpg',
  },
  {
    name: 'Gradient Cyan',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    name: 'Minimal Dark',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    name: 'Nordic Indigo',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onProfileUpdated,
}) => {
  const [name, setName] = useState(user.name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [nativeLanguage, setNativeLanguage] = useState(user.nativeLanguage || 'en');
  const [langSearch, setLangSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorNotice('Image size must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAvatarUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorNotice('Display name cannot be empty');
      return;
    }

    setIsSaving(true);
    setErrorNotice(null);
    try {
      const res = await api.updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        avatarUrl,
        nativeLanguage,
      });
      onProfileUpdated(res.user);
      setSuccessNotice('Profile updated successfully!');
      setTimeout(() => {
        setSuccessNotice(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredLangs = SUPPORTED_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.code.toLowerCase().includes(langSearch.toLowerCase())
  );

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === nativeLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 sm:p-8 flex flex-col relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <UserIcon className="w-4 h-4" />
            <span>Profile & Identity Settings</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Your LinguaPulse Profile</h2>
          <p className="text-xs text-slate-400 mt-1">
            Your display name and avatar will appear next to all your translated messages in chat rooms.
          </p>
        </div>

        {errorNotice && (
          <div className="mb-4 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
            {errorNotice}
          </div>
        )}

        {successNotice && (
          <div className="mb-4 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{successNotice}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Avatar Upload & Selection Section */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">User Avatar</label>
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl border border-slate-800 bg-slate-950/60">
              {/* Avatar Preview */}
              <div className="relative group">
                <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-indigo-500/50 overflow-hidden flex items-center justify-center text-xl font-bold text-indigo-300 shadow-md">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    name.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-medium transition-opacity cursor-pointer"
                >
                  <Camera className="w-4 h-4 mb-0.5" />
                  <span>Upload</span>
                </button>
              </div>

              {/* Upload Controls & Presets */}
              <div className="flex-1 space-y-2.5 text-center sm:text-left">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Upload Custom Image</span>
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-rose-400 text-xs transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Preset Avatars Row */}
                <div>
                  <span className="block text-[10px] text-slate-500 mb-1.5">Or choose a preset studio avatar:</span>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    {PRESET_AVATARS.map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setAvatarUrl(preset.url)}
                        title={preset.name}
                        className={`w-8 h-8 rounded-full overflow-hidden border transition-all cursor-pointer ${
                          avatarUrl === preset.url
                            ? 'border-indigo-400 scale-110 shadow-md shadow-indigo-500/30 ring-2 ring-indigo-500/40'
                            : 'border-slate-700 hover:border-slate-500 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Display Name Input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Display Name <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kenji Sato"
                className="w-full pl-10 pr-3.5 py-2 rounded-lg border border-slate-700 bg-slate-950 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Bio / Status Input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Bio / Role Description (Optional)
            </label>
            <div className="relative">
              <div className="absolute top-2.5 left-3.5 pointer-events-none text-slate-500">
                <FileText className="w-4 h-4" />
              </div>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. Lead Systems Architect @ Tokyo Hub. Building real-time distributed platforms."
                className="w-full pl-10 pr-3.5 py-2 rounded-lg border border-slate-700 bg-slate-950 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Native Language Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Default Native Language
              </label>
              <span className="text-xs text-indigo-300">
                Active: {currentLangObj.flag} {currentLangObj.name} ({currentLangObj.nativeName})
              </span>
            </div>

            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={langSearch}
                onChange={(e) => setLangSearch(e.target.value)}
                placeholder="Search languages..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
              {filteredLangs.map((lang) => {
                const isSelected = nativeLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setNativeLanguage(lang.code)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/15 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-sm">{lang.flag}</span>
                      <span className="text-xs truncate font-medium">{lang.nativeName}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Message Chat Bubble Preview */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80">
            <span className="block text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Chat Interface Message Preview:
            </span>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-xs font-semibold text-indigo-300 shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  name.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-white">{name || 'Your Display Name'}</span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span>{currentLangObj.flag}</span>
                    <span>{currentLangObj.name}</span>
                  </span>
                  <span className="text-[10px] text-slate-600">Just now</span>
                </div>
                <div className="p-3 rounded-2xl rounded-tl-sm bg-slate-800 border border-slate-700 text-xs text-slate-200">
                  {bio || 'Hello world! My messages are translated in real-time across all participant languages.'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
