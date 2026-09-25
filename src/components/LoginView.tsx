import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { User } from '../types';
import { Mail, KeyRound, ArrowRight, CheckCircle2, ShieldCheck, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

interface LoginViewProps {
  onSuccess: (user: User, isNewUser: boolean) => void;
  onCancel?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess, onCancel }) => {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [previewOtp, setPreviewOtp] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (step !== 'otp' || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const handleSendOtp = async (targetEmail: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await api.sendOtp(targetEmail);
      if (res.previewOtp) {
        setPreviewOtp(res.previewOtp);
      }
      setStep('otp');
      setTimeLeft(300);
      setSuccessNotice(`A 6-digit code has been dispatched to ${targetEmail}`);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otp;
    if (!code || code.length < 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const res = await api.verifyOtp(email, code);
      onSuccess(res.user, res.isNewUser);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Demo Persona Fast-Login
  const handleQuickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    handleSendOtp(demoEmail);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Anti-slop clean container */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3">
              {step === 'email' ? <Mail className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {step === 'email' ? 'Welcome to LinguaPulse' : 'Verify Your Email'}
            </h1>
            <p className="mt-1.5 text-xs text-slate-400">
              {step === 'email'
                ? 'Passwordless instant sign-in. Enter your email to receive a secure 6-digit OTP.'
                : `Enter the code sent to ${email}`}
            </p>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="mb-4 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && step === 'otp' && (
            <div className="mb-4 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Step 1: Email Form */}
          {step === 'email' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email) handleSendOtp(email);
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-700 bg-slate-950 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Continue with Passwordless OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Demo Personas for Instant Interactive Testing */}
              <div className="pt-4 mt-4 border-t border-slate-800">
                <span className="block text-[11px] font-medium text-slate-400 mb-2">
                  Or test immediately with a multi-language demo persona:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('alex.engineer@example.com')}
                    className="p-2 text-left rounded-lg border border-slate-800 bg-slate-950/60 hover:border-indigo-500/50 hover:bg-indigo-950/20 transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300">
                      🇺🇸 Alex Vance
                    </div>
                    <div className="text-[10px] text-slate-500">English Native</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo('kenji.sato@example.com')}
                    className="p-2 text-left rounded-lg border border-slate-800 bg-slate-950/60 hover:border-indigo-500/50 hover:bg-indigo-950/20 transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300">
                      🇯🇵 Kenji Sato
                    </div>
                    <div className="text-[10px] text-slate-500">Japanese Native</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo('maria.gonzalez@example.com')}
                    className="p-2 text-left rounded-lg border border-slate-800 bg-slate-950/60 hover:border-indigo-500/50 hover:bg-indigo-950/20 transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300">
                      🇪🇸 María G.
                    </div>
                    <div className="text-[10px] text-slate-500">Spanish Native</div>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === 'otp' && (
            <div className="space-y-4">
              {/* Simulated Email Delivery Envelope Preview */}
              {previewOtp && (
                <div className="p-3.5 rounded-lg border border-indigo-500/30 bg-indigo-950/30">
                  <div className="flex items-center justify-between text-xs text-indigo-300 mb-1.5">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Mock Email Inbox Preview
                    </span>
                    <span className="font-mono tabular-nums text-[11px] text-indigo-400">
                      Expires in {formatTime(timeLeft)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Security code dispatched to <span className="text-slate-200">{email}</span>:
                  </p>
                  <div className="flex items-center justify-between bg-slate-950/80 px-3 py-2 rounded border border-slate-800">
                    <span className="font-mono text-base font-bold tracking-widest text-indigo-300">
                      {previewOtp}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setOtp(previewOtp);
                        handleVerifyOtp(previewOtp);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                    >
                      Auto-Fill & Verify
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="otp" className="block text-xs font-medium text-slate-300 mb-1.5">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <input
                    id="otp"
                    type="text"
                    maxLength={6}
                    autoFocus
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.5em] font-mono font-bold text-lg py-3 rounded-lg border border-slate-700 bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>Code expires in {formatTime(timeLeft)}</span>
                  <button
                    type="button"
                    onClick={() => handleSendOtp(email)}
                    disabled={isLoading}
                    className="text-indigo-400 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="flex-1 py-2.5 px-4 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Change Email
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyOtp()}
                  disabled={isLoading || otp.length < 6 || timeLeft <= 0}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify & Enter</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security Trust Note */}
        <div className="mt-4 text-center text-xs text-slate-500">
          <span>Enterprise-grade Row Level Security · Supabase & WebSockets · End-to-end Neural Translation</span>
        </div>
      </div>
    </div>
  );
};
