import React, { useState } from 'react';
import { Room, User } from '../types';
import { SUPPORTED_LANGUAGES } from '../lib/constants';
import {
  Plus,
  Users,
  MessageSquare,
  ArrowRight,
  Search,
  Key,
  Globe,
  Zap,
  TrendingUp,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface DashboardViewProps {
  user: User;
  rooms: Room[];
  onSelectRoom: (roomId: string) => void;
  onOpenCreateRoom: () => void;
  onJoinByCode: (code: string) => void;
  onOpenPricing: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  rooms,
  onSelectRoom,
  onOpenCreateRoom,
  onJoinByCode,
  onOpenPricing,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteInput, setInviteInput] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);

  const filteredRooms = rooms.filter(
    (room) =>
      room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (room.topic && room.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
      room.inviteCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteInput.trim()) {
      setInviteError('Please enter a room invite code');
      return;
    }
    setInviteError(null);
    onJoinByCode(inviteInput.trim());
  };

  // Resolve language flags for participants
  const getParticipantFlags = (participants: Room['participants']) => {
    const flags = participants.map((p) => {
      const lang = SUPPORTED_LANGUAGES.find((l) => l.code === p.nativeLanguage);
      return { flag: lang?.flag || '🌐', langName: lang?.name || p.nativeLanguage };
    });
    // Remove duplicates
    return Array.from(new Map(flags.map((item) => [item.flag, item])).values());
  };

  const userLang = SUPPORTED_LANGUAGES.find((l) => l.code === user.nativeLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Hero Showcase with Generated Visual Asset */}
      <div className="relative rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
          {/* Left Text Zone */}
          <div className="p-6 sm:p-8 lg:p-10 lg:col-span-7 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-Time Multilingual Pulse Engine</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white text-balance leading-tight">
              Connect Globally. Speak Locally.
            </h1>
            <p className="mt-3 text-sm text-slate-300 max-w-xl leading-relaxed">
              Every message you send in {userLang.name} is translated in sub-second latency to every participant’s native language. Real-time WebSockets powered by Gemini neural translation.
            </p>

            {/* Quick Actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={onOpenCreateRoom}
                className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Room</span>
              </button>

              <button
                onClick={onOpenPricing}
                className="px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Usage: {user.wordsTranslatedThisMonth.toLocaleString()} words</span>
              </button>
            </div>
          </div>

          {/* Right Image Banner Zone */}
          <div className="relative lg:col-span-5 h-64 lg:h-full min-h-[220px] overflow-hidden">
            <img
              src="/src/assets/images/linguapulse_hero_banner_1790295490789.jpg"
              alt="Global real-time multilingual communication"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-slate-900 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Translated Words</span>
            <Zap className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            {user.wordsTranslatedThisMonth.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {user.tier === 'pro' ? 'Unlimited Pro Quota' : `Free Quota: ${user.wordQuota.toLocaleString()} words`}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Your Native Language</span>
            <Globe className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white flex items-center gap-2">
            <span>{userLang.flag}</span>
            <span>{userLang.nativeName}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            All messages rendered into {userLang.name}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Active Multilingual Rooms</span>
            <MessageSquare className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            {rooms.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Available live collaboration spaces</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Supported Languages</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-white">
            {SUPPORTED_LANGUAGES.length}+
          </div>
          <div className="mt-1 text-[11px] text-slate-500">With sub-50ms neural translation</div>
        </div>
      </div>

      {/* Join via Invite Code Bar & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Rooms */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rooms by title, topic, or code..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-800 bg-slate-900 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Join by Invite Code Form */}
        <form onSubmit={handleJoinSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Key className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
              placeholder="Invite code (e.g. PULSE-TECH-2026)"
              className="pl-8 pr-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-xs text-white uppercase placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            Join Room
          </button>
        </form>
      </div>

      {inviteError && (
        <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
          {inviteError}
        </div>
      )}

      {/* Active Rooms Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Active Real-Time Rooms</h2>
          <span className="text-xs text-slate-400">
            {filteredRooms.length} room{filteredRooms.length === 1 ? '' : 's'} available
          </span>
        </div>

        {filteredRooms.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30">
            <Globe className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">No rooms found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create the first room to start chatting across languages with instant real-time translation.
            </p>
            <button
              onClick={onOpenCreateRoom}
              className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Room</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((room) => {
              const flags = getParticipantFlags(room.participants);
              return (
                <div
                  key={room.id}
                  onClick={() => onSelectRoom(room.id)}
                  className="group p-5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-indigo-500/50 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Title and Invite Code */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                        {room.title}
                      </h3>
                      <span className="font-mono text-[10px] tracking-wider text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                        {room.inviteCode}
                      </span>
                    </div>

                    {/* Topic */}
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                      {room.topic || 'Real-time collaborative chat room with automated translation.'}
                    </p>
                  </div>

                  {/* Footer: Languages, Participants & Action */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5" title="Languages spoken in this room">
                      <span className="text-xs text-slate-500">Languages:</span>
                      <div className="flex items-center -space-x-1">
                        {flags.map((item, i) => (
                          <span
                            key={i}
                            title={item.langName}
                            className="inline-block text-sm"
                          >
                            {item.flag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-slate-400">
                      <span className="flex items-center gap-1 text-[11px] font-mono tabular-nums">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        {room.participants.length}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-mono tabular-nums">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                        {room.messageCount}
                      </span>
                      <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
