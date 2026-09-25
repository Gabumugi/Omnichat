import React, { useState } from 'react';
import { PROJECT_STRUCTURE_TREE, DEPLOYMENT_GUIDE_MARKDOWN } from '../lib/docs';
import { SUPABASE_SQL_SCHEMA } from '../lib/sqlSchema';
import {
  BookOpen,
  Database,
  Server,
  FolderTree,
  Terminal,
  Copy,
  Check,
  X,
  FileCode,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface ArchitectureDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureDocsModal: React.FC<ArchitectureDocsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'tree' | 'sql' | 'api' | 'deploy'>('tree');
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const API_DOCUMENTATION = `
# LinguaPulse Core API Specification

## 1. Authentication (Passwordless Email OTP)
POST /api/auth/otp/send
  Payload:  { "email": "user@example.com" }
  Response: { "success": true, "message": "...", "previewOtp": "123456", "expiresInSeconds": 300 }

POST /api/auth/otp/verify
  Payload:  { "email": "user@example.com", "otp": "123456" }
  Response: { "success": true, "token": "pulse_sess_...", "user": { ... }, "isNewUser": false }

GET /api/auth/me
  Headers:  Authorization: Bearer <token>
  Response: { "user": { ... } }

PUT /api/auth/profile
  Headers:  Authorization: Bearer <token>
  Payload:  { "name": "...", "nativeLanguage": "ja", "avatarUrl": "..." }
  Response: { "user": { ... } }

## 2. Rooms & Real-Time Presence
GET /api/rooms
  Response: { "rooms": [ ... ] }

POST /api/rooms
  Headers:  Authorization: Bearer <token>
  Payload:  { "title": "Tokyo & Berlin Sync", "topic": "..." }
  Response: { "room": { "id": "...", "inviteCode": "PULSE-1234", ... } }

GET /api/rooms/:id
  Response: { "room": { ... }, "messages": [ ... ] }

POST /api/rooms/:id/join
  Headers:  Authorization: Bearer <token>
  Response: { "room": { ... } }

## 3. Multilingual Message Translation & Broadcast
POST /api/rooms/:id/messages
  Headers:  Authorization: Bearer <token>
  Payload:  { "text": "Hello world" }
  Process:
    1. Checks monthly word quota (Free: 5k words, Pro: 500k words)
    2. Identifies all distinct participant native languages in room
    3. Translates text concurrently into all target languages via Gemini 2.5 Flash
    4. Records message in room history with { [langCode]: translatedText } map
    5. Broadcasts "message:new" payload over WebSocket to all room participants
  Response: { "message": { ... }, "quotaUsed": 140, "quotaRemaining": 4860 }

## 4. Message History & Search
GET /api/rooms/:id/messages?before=<isoDate>&limit=20&search=<keyword>
  Query:
    - before: Retrieve historical messages created prior to this timestamp (infinite scroll)
    - limit: Page size (default 20, max 50)
    - search: Case-insensitive keyword search across originalText, senderName, and all translations
  Response: { "messages": [ ... ], "hasMore": true, "totalCount": 42 }

DELETE /api/rooms/:id/messages/:messageId
  Headers:  Authorization: Bearer <token>
  Permissions: Message Author, Room Creator, or Admin
  Response: { "success": true }

## 5. Moderation, Bans & Safety
POST /api/rooms/:id/participants/:userId/kick
  Headers:  Authorization: Bearer <token>
  Payload:  { "reason": "Disruptive behavior" }
  Response: { "success": true, "room": { ... } }

POST /api/rooms/:id/participants/:userId/ban
  Headers:  Authorization: Bearer <token>
  Payload:  { "reason": "Repeated policy violation" }
  Effect:   Persists ban in room_bans table. Banned user is immediately disconnected and cannot rejoin.
  Response: { "success": true, "room": { ... } }

POST /api/rooms/:id/banned/:userId/unban
  Headers:  Authorization: Bearer <token>
  Response: { "success": true, "room": { ... } }

POST /api/rooms/:id/messages/:messageId/report
  Headers:  Authorization: Bearer <token>
  Payload:  { "reason": "Harassment or Hate Speech", "details": "..." }
  Response: { "success": true, "report": { "id": "...", "status": "pending" } }

GET /api/reports?roomId=<id>
  Headers:  Authorization: Bearer <token>
  Response: { "reports": [ ... ] }

POST /api/reports/:id/action
  Headers:  Authorization: Bearer <token>
  Payload:  { "action": "dismiss" | "delete_message" | "kick_user" | "ban_user" }
  Response: { "success": true, "message": "..." }

## 6. WebSocket Gateway
WS /ws?roomId=<id>&token=<sessionToken>
  Events Broadcast & Handled:
    - { type: "init", payload: { room, messages, participants } }
    - { type: "message:new", payload: ChatMessage }
    - { type: "message:deleted", payload: { messageId, roomId } }
    - { type: "user:joined", payload: { userId, name, nativeLanguage } }
    - { type: "user:left", payload: { userId } }
    - { type: "user:kicked", payload: { userId, userName, reason } }
    - { type: "user:banned", payload: { userId, userName, reason } }
    - { type: "user:unbanned", payload: { userId } }
    - { type: "report:new", payload: MessageReport }
    - { type: "typing:update", payload: { userName, isTyping } }
    - { type: "error", payload: { code: "USER_BANNED", message: "..." } }
`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl h-[88vh] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                LinguaPulse Architecture & Engineering Reference
              </h2>
              <p className="text-xs text-slate-400">
                Full-stack specification, Supabase SQL schema, WebSocket pipeline, and deployment
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

        {/* Tab navigation */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-800 bg-slate-950/60 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('tree')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'tree'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Project Structure</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'sql'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Supabase SQL Schema</span>
          </button>

          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'api'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>API & WebSockets</span>
          </button>

          <button
            onClick={() => setActiveTab('deploy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'deploy'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Deployment Guide</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950/80 font-mono text-xs">
          {activeTab === 'tree' && (
            <div>
              <div className="flex items-center justify-between mb-3 text-slate-400 font-sans">
                <span className="text-xs">File hierarchy & architecture layers:</span>
                <button
                  onClick={() => handleCopy(PROJECT_STRUCTURE_TREE, 'tree')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[11px] transition-colors cursor-pointer"
                >
                  {copied === 'tree' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied === 'tree' ? 'Copied' : 'Copy Tree'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl border border-slate-800 bg-slate-900 text-indigo-300/90 overflow-x-auto whitespace-pre leading-relaxed">
                {PROJECT_STRUCTURE_TREE}
              </pre>
            </div>
          )}

          {activeTab === 'sql' && (
            <div>
              <div className="flex items-center justify-between mb-3 text-slate-400 font-sans">
                <span className="text-xs">Supabase PostgreSQL Schema with RLS Policies:</span>
                <button
                  onClick={() => handleCopy(SUPABASE_SQL_SCHEMA, 'sql')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  {copied === 'sql' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied === 'sql' ? 'Copied SQL' : 'Copy SQL Script'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl border border-slate-800 bg-slate-900 text-emerald-300/90 overflow-x-auto whitespace-pre leading-relaxed">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            </div>
          )}

          {activeTab === 'api' && (
            <div>
              <div className="flex items-center justify-between mb-3 text-slate-400 font-sans">
                <span className="text-xs">REST API Routes & Real-Time WebSocket Protocol:</span>
                <button
                  onClick={() => handleCopy(API_DOCUMENTATION, 'api')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[11px] transition-colors cursor-pointer"
                >
                  {copied === 'api' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied === 'api' ? 'Copied' : 'Copy API Spec'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl border border-slate-800 bg-slate-900 text-cyan-300/90 overflow-x-auto whitespace-pre leading-relaxed">
                {API_DOCUMENTATION}
              </pre>
            </div>
          )}

          {activeTab === 'deploy' && (
            <div>
              <div className="flex items-center justify-between mb-3 text-slate-400 font-sans">
                <span className="text-xs">Production Deployment (.env & commands):</span>
                <button
                  onClick={() => handleCopy(DEPLOYMENT_GUIDE_MARKDOWN, 'deploy')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[11px] transition-colors cursor-pointer"
                >
                  {copied === 'deploy' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied === 'deploy' ? 'Copied' : 'Copy Guide'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl border border-slate-800 bg-slate-900 text-amber-200/90 overflow-x-auto whitespace-pre leading-relaxed font-mono">
                {DEPLOYMENT_GUIDE_MARKDOWN}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
