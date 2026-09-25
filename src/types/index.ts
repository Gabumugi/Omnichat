/**
 * LinguaPulse Domain Types & Interfaces
 */

export interface User {
  id: string;
  email: string;
  name: string;
  nativeLanguage: string; // ISO 639-1 code e.g. "en", "es", "fr", "ja"
  avatarUrl?: string;
  bio?: string;
  role?: 'admin' | 'user';
  createdAt: string;
  wordsTranslatedThisMonth: number;
  wordQuota: number; // Free: 5000, Pro: 500000 (effectively unlimited)
  tier: 'free' | 'pro';
}

export interface OTPToken {
  email: string;
  otp: string; // 6-digit code
  expiresAt: number; // Epoch timestamp
  attempts: number;
}

export interface RoomParticipant {
  userId: string;
  name: string;
  nativeLanguage: string;
  avatarUrl?: string;
  isOnline: boolean;
  lastActive: string;
  isCreator?: boolean;
}

export interface BannedUser {
  userId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  bannedAt: string;
  reason: string;
  bannedBy: string;
}

export interface MessageReport {
  id: string;
  roomId: string;
  messageId: string;
  messageSnippet: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  reportedBy: string;
  reportedByName: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  actionTaken?: string;
}

export interface Room {
  id: string;
  title: string;
  topic?: string;
  createdBy: string;
  creatorName: string;
  inviteCode: string;
  createdAt: string;
  participants: RoomParticipant[];
  bannedUsers?: BannedUser[];
  messageCount: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderLanguage: string; // original language code
  originalText: string;
  // Dynamic translations cache: targetLangCode -> translatedText
  translations: Record<string, string>;
  wordCount: number;
  createdAt: string;
  isReported?: boolean;
  deleted?: boolean;
}

export interface TranslationRequest {
  text: string;
  sourceLang?: string;
  targetLangs: string[];
}

export interface TranslationResponse {
  sourceLang: string;
  translations: Record<string, string>;
  wordCount: number;
}

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  direction: 'ltr' | 'rtl';
  voiceCode?: string; // Web Speech API lang code e.g. "es-ES", "ja-JP"
}

export interface WSMessagePayload {
  type:
    | 'init'
    | 'user:joined'
    | 'user:left'
    | 'message:new'
    | 'message:deleted'
    | 'typing:update'
    | 'user:kicked'
    | 'user:banned'
    | 'user:unbanned'
    | 'report:new'
    | 'error';
  payload: any;
}

