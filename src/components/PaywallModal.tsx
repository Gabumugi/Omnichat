import React, { useState } from 'react';
import { User } from '../types';
import { PRICING_TIERS, FREE_WORD_QUOTA, PRO_WORD_QUOTA } from '../lib/constants';
import { api } from '../lib/api';
import { Zap, Check, Sparkles, X, ShieldCheck, CreditCard, RefreshCw } from 'lucide-react';

interface PaywallModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onUpgraded: (user: User) => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  user,
  isOpen,
  onClose,
  onUpgraded,
}) => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const res = await api.upgradeToPro();
      setSuccessMessage(res.message);
      onUpgraded(res.user);
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Upgrade failed:', err);
    } finally {
      setIsUpgrading(false);
    }
  };

  const percentageUsed = Math.min(
    100,
    Math.round((user.wordsTranslatedThisMonth / user.wordQuota) * 100)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
            <Zap className="w-3.5 h-3.5" />
            <span>Translation Quota & Subscriptions</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Scale Your Global Communication
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Every translated word across participants consumes neural translation bandwidth. Upgrade to Pro for unthrottled global access.
          </p>
        </div>

        {/* Live Quota Usage Meter */}
        <div className="mb-8 p-5 rounded-xl border border-slate-800 bg-slate-950/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-300">Current Monthly Translation Usage:</span>
              <span className="text-xs uppercase font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                {user.tier} tier
              </span>
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-300">
              <strong className="text-white">{user.wordsTranslatedThisMonth.toLocaleString()}</strong> /{' '}
              {user.tier === 'pro' ? 'Unlimited' : `${user.wordQuota.toLocaleString()} words`}
            </div>
          </div>

          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentageUsed >= 90
                  ? 'bg-rose-500'
                  : percentageUsed >= 70
                  ? 'bg-amber-500'
                  : 'bg-indigo-500'
              }`}
              style={{ width: `${percentageUsed}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Quota resets every calendar month</span>
            <span>{percentageUsed}% consumed</span>
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tiers Comparison Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PRICING_TIERS.map((tier) => {
            const isCurrent = user.tier === tier.id;

            return (
              <div
                key={tier.id}
                className={`rounded-xl p-6 border flex flex-col justify-between transition-all ${
                  tier.highlighted
                    ? 'border-indigo-500 bg-gradient-to-b from-indigo-950/40 to-slate-900 shadow-lg shadow-indigo-500/10'
                    : 'border-slate-800 bg-slate-900/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                    {tier.highlighted && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500 text-white shadow-sm">
                        Recommended
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 mb-4">{tier.description}</p>

                  <div className="mb-5 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-mono tabular-nums text-white">
                      {tier.price}
                    </span>
                    <span className="text-xs text-slate-500">{tier.cadence}</span>
                  </div>

                  <div className="space-y-2.5 pt-4 border-t border-slate-800">
                    {tier.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800">
                  {isCurrent ? (
                    <div className="w-full py-2.5 rounded-lg border border-slate-700 bg-slate-800/60 text-center text-xs font-semibold text-slate-300">
                      Your Current Plan
                    </div>
                  ) : (
                    <button
                      onClick={handleUpgrade}
                      disabled={isUpgrading}
                      className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isUpgrading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing Stripe Upgrade...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Upgrade to Pro ($24/mo)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Billing Trust Note */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-[11px] text-slate-500">
          <span>Stripe Billing Simulator · Instant activation · Cancel anytime with zero lock-in</span>
        </div>
      </div>
    </div>
  );
};
