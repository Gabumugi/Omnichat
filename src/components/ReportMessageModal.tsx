import React, { useState } from 'react';
import { ChatMessage } from '../types';
import { api } from '../lib/api';
import { Flag, AlertTriangle, Check, X, ShieldAlert, RefreshCw } from 'lucide-react';

interface ReportMessageModalProps {
  message: ChatMessage | null;
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
  onReportSubmitted: (report: any) => void;
}

const REPORT_REASONS = [
  'Harassment or Hate Speech',
  'Spam or Promotional Abuse',
  'Inappropriate or Offensive Language',
  'Misinformation or Defamation',
  'Severe Translation Hallucination / Distortion',
  'Other Policy Violation',
];

export const ReportMessageModal: React.FC<ReportMessageModalProps> = ({
  message,
  roomId,
  isOpen,
  onClose,
  onReportSubmitted,
}) => {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !message) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.reportMessage(roomId, message.id, {
        reason: selectedReason,
        details: details.trim() || undefined,
      });
      setIsSuccess(true);
      onReportSubmitted(res.report);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit message report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 sm:p-7 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Flag className="w-4 h-4" />
            <span>Safety & Moderation</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Report Inappropriate Message</h2>
          <p className="text-xs text-slate-400 mt-1">
            Our moderation team and the room administrator will review this report and take corrective action.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {isSuccess ? (
          <div className="py-6 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">Report Submitted</h3>
            <p className="text-xs text-slate-400">
              Thank you for keeping LinguaPulse collaborative and safe.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Reported Message Excerpt */}
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950 text-xs">
              <div className="text-[11px] text-slate-500 mb-1 flex items-center justify-between">
                <span>Message by: <strong className="text-slate-300">{message.senderName}</strong></span>
                <span className="font-mono text-[10px]">{new Date(message.createdAt).toLocaleTimeString()}</span>
              </div>
              <p className="text-slate-200 italic line-clamp-3 font-serif">"{message.originalText}"</p>
            </div>

            {/* Violation Category */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Reason for Reporting
              </label>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                      selectedReason === r
                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r}
                      checked={selectedReason === r}
                      onChange={() => setSelectedReason(r)}
                      className="accent-indigo-600"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Optional Details */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Additional Context (Optional)
              </label>
              <textarea
                rows={2}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide any additional details or context..."
                className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-950 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
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
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
