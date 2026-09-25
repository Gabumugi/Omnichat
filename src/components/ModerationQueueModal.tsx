import React, { useState, useEffect } from 'react';
import { Room, MessageReport, BannedUser } from '../types';
import { api } from '../lib/api';
import {
  ShieldAlert,
  UserX,
  Trash2,
  CheckCircle,
  Ban,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  X,
  MessageSquare,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface ModerationQueueModalProps {
  room: Room;
  isOpen: boolean;
  onClose: () => void;
  onUserBannedOrKicked?: () => void;
  onMessageDeleted?: (messageId: string) => void;
}

export const ModerationQueueModal: React.FC<ModerationQueueModalProps> = ({
  room,
  isOpen,
  onClose,
  onUserBannedOrKicked,
  onMessageDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'banned'>('reports');
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>(room.bannedUsers || []);
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadModerationData() {
      setIsLoading(true);
      try {
        const res = await api.getReports(room.id);
        setReports(res.reports || []);
        // Refresh room details for banned users
        const roomRes = await api.getRoom(room.id);
        setBannedUsers(roomRes.room.bannedUsers || []);
      } catch (err) {
        console.error('Failed to load moderation data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadModerationData();
  }, [isOpen, room.id]);

  if (!isOpen) return null;

  const handleAction = async (
    reportId: string,
    action: 'dismiss' | 'delete_message' | 'kick_user' | 'ban_user'
  ) => {
    setActionInProgress(reportId);
    setStatusMessage(null);
    try {
      const res = await api.resolveReport(reportId, action);
      setStatusMessage(res.message);

      // Refresh reports list
      const updatedReports = await api.getReports(room.id);
      setReports(updatedReports.reports || []);

      // Refresh room
      const roomRes = await api.getRoom(room.id);
      setBannedUsers(roomRes.room.bannedUsers || []);

      if (action === 'delete_message') {
        const report = reports.find((r) => r.id === reportId);
        if (report && onMessageDeleted) onMessageDeleted(report.messageId);
      }

      if (action === 'kick_user' || action === 'ban_user') {
        if (onUserBannedOrKicked) onUserBannedOrKicked();
      }
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUnban = async (userId: string) => {
    setActionInProgress(`unban_${userId}`);
    try {
      await api.unbanUser(room.id, userId);
      setBannedUsers((prev) => prev.filter((b) => b.userId !== userId));
      setStatusMessage('User unbanned successfully and can now rejoin.');
      if (onUserBannedOrKicked) onUserBannedOrKicked();
    } catch (err: any) {
      alert(err.message || 'Failed to unban user');
    } finally {
      setActionInProgress(null);
    }
  };

  const pendingReports = reports.filter((r) => r.status === 'pending');
  const resolvedReports = reports.filter((r) => r.status !== 'pending');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl h-[85vh] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Moderation Center: {room.title}
              </h2>
              <p className="text-xs text-slate-400">
                Review flagged messages, enforce community standards, and manage room bans.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-slate-800 bg-slate-950/30 text-xs">
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Reported Messages</span>
            {pendingReports.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono">
                {pendingReports.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('banned')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              activeTab === 'banned'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Banned Users</span>
            <span className="font-mono text-[10px] text-slate-400">
              ({bannedUsers.length})
            </span>
          </button>
        </div>

        {statusMessage && (
          <div className="mx-5 mt-3 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-xs">Loading moderation queue...</span>
            </div>
          ) : activeTab === 'reports' ? (
            reports.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-500/60 mb-2" />
                <h3 className="text-sm font-semibold text-slate-300">Clean Moderation Queue</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  No messages have been reported in this room. All discussions comply with guidelines.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Pending Reports */}
                {pendingReports.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-2.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Action Required ({pendingReports.length})</span>
                    </h3>
                    <div className="space-y-3">
                      {pendingReports.map((report) => (
                        <div
                          key={report.id}
                          className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/15 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-bold text-white">{report.senderName}</span>
                                <span className="text-slate-500">reported by</span>
                                <span className="text-slate-300 font-medium">{report.reportedByName}</span>
                              </div>
                              <div className="mt-1 text-xs text-rose-300 font-medium">
                                Reason: {report.reason}
                              </div>
                            </div>
                            <span className="font-mono text-[10px] text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(report.createdAt).toLocaleTimeString()}
                            </span>
                          </div>

                          {/* Message Excerpt */}
                          <div className="p-3 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-300 italic font-serif">
                            "{report.messageSnippet}"
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                            <button
                              onClick={() => handleAction(report.id, 'dismiss')}
                              disabled={actionInProgress === report.id}
                              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                            >
                              Dismiss Report
                            </button>

                            <button
                              onClick={() => handleAction(report.id, 'delete_message')}
                              disabled={actionInProgress === report.id}
                              className="px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Message</span>
                            </button>

                            <button
                              onClick={() => handleAction(report.id, 'kick_user')}
                              disabled={actionInProgress === report.id}
                              className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Kick Sender</span>
                            </button>

                            <button
                              onClick={() => handleAction(report.id, 'ban_user')}
                              disabled={actionInProgress === report.id}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Ban Sender</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolved Reports History */}
                {resolvedReports.length > 0 && (
                  <div className="pt-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Resolved / Dismissed Reports ({resolvedReports.length})
                    </h3>
                    <div className="space-y-2">
                      {resolvedReports.map((report) => (
                        <div
                          key={report.id}
                          className="p-3 rounded-lg border border-slate-800 bg-slate-950/50 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="truncate">
                            <span className="font-semibold text-slate-300">{report.senderName}</span>
                            <span className="text-slate-500 mx-1.5">·</span>
                            <span className="text-slate-400 truncate">{report.reason}</span>
                            <div className="text-[11px] text-indigo-400 mt-0.5">
                              Status: {report.actionTaken || report.status}
                            </div>
                          </div>
                          <span className="font-mono text-[10px] text-slate-500 shrink-0">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            /* Banned Users Tab */
            bannedUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <UserCheck className="w-10 h-10 mx-auto text-emerald-500/60 mb-2" />
                <h3 className="text-sm font-semibold text-slate-300">No Banned Users</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  There are currently no banned users in this room. Room creators can ban abusive participants directly from the participant list or moderation queue.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {bannedUsers.map((banned) => (
                  <div
                    key={banned.userId}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-sm font-bold text-rose-400">
                        {banned.avatarUrl ? (
                          <img
                            src={banned.avatarUrl}
                            alt={banned.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover grayscale opacity-70"
                          />
                        ) : (
                          banned.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{banned.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] uppercase font-mono">
                            Banned
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Reason: {banned.reason}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                          Banned by {banned.bannedBy} on {new Date(banned.bannedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleUnban(banned.userId)}
                      disabled={actionInProgress === `unban_${banned.userId}`}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-300 text-xs font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Unban User</span>
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
