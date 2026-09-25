import React, { useState } from 'react';
import { api } from '../lib/api';
import { Room } from '../types';
import { PlusCircle, Hash, MessageSquare, Users, Sparkles, X } from 'lucide-react';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (newRoom: Room) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onRoomCreated,
}) => {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a room title');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await api.createRoom({
        title: title.trim(),
        topic: topic.trim() || undefined,
      });
      onRoomCreated(res.room);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 sm:p-7 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <PlusCircle className="w-4 h-4" />
            <span>New Multilingual Room</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Create Real-Time Translation Room</h2>
          <p className="text-xs text-slate-400 mt-1">
            Invite colleagues across different countries. Each person will read and speak in their own native language.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Room Title <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Hash className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cross-Border Product Sync"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-700 bg-slate-950 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Topic or Context (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <MessageSquare className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Discussing Q4 localization and design guidelines"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-700 bg-slate-950 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">Instant Invite Code Generation:</span>
              <p className="mt-0.5">
                A shareable link and 6-character code will be generated automatically for participants to enter with 1-click.
              </p>
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
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Launch Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
