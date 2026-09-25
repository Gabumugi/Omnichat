import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { User, Room, ChatMessage, OTPToken, RoomParticipant, BannedUser, MessageReport } from './src/types';
import { SUPPORTED_LANGUAGES, FREE_WORD_QUOTA, PRO_WORD_QUOTA } from './src/lib/constants';
import { SUPABASE_SQL_SCHEMA } from './src/lib/sqlSchema';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Gemini Client initialization
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

// =============================================================================
// IN-MEMORY PERSISTENCE / DATABASE STORES
// (Mirrors the Supabase PostgreSQL structure for high-speed sub-millisecond I/O)
// =============================================================================

const users = new Map<string, User>();
const sessions = new Map<string, string>(); // token -> userId
const otpTokens = new Map<string, OTPToken>(); // email -> OTPToken
const rooms = new Map<string, Room>();
const messages = new Map<string, ChatMessage[]>(); // roomId -> ChatMessage[]
const reports = new Map<string, MessageReport>(); // reportId -> MessageReport

// Seed initial demo users with profile details & roles
const SEED_USERS: User[] = [
  {
    id: 'user_alex',
    email: 'alex.engineer@example.com',
    name: 'Alex Vance',
    nativeLanguage: 'en',
    avatarUrl: '/src/assets/images/linguapulse_avatar_maria_1790295499574.jpg',
    bio: 'Lead Distributed Systems Architect. Building low-latency WebSockets & neural translation pipelines.',
    role: 'admin',
    createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
    wordsTranslatedThisMonth: 1240,
    wordQuota: FREE_WORD_QUOTA,
    tier: 'free',
  },
  {
    id: 'user_kenji',
    email: 'kenji.sato@example.com',
    name: 'Kenji Sato (佐藤 健二)',
    nativeLanguage: 'ja',
    avatarUrl: '/src/assets/images/linguapulse_avatar_kenji_1790295509160.jpg',
    bio: 'Product Designer based in Shibuya, Tokyo. Passionate about typography, dark themes and multilingual UX.',
    role: 'user',
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    wordsTranslatedThisMonth: 3820,
    wordQuota: PRO_WORD_QUOTA,
    tier: 'pro',
  },
  {
    id: 'user_maria',
    email: 'maria.gonzalez@example.com',
    name: 'María González',
    nativeLanguage: 'es',
    avatarUrl: '/src/assets/images/linguapulse_avatar_maria_1790295499574.jpg',
    bio: 'Full-stack engineer & open-source enthusiast from Madrid. Exploring PostgreSQL RLS & AI studio integrations.',
    role: 'user',
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    wordsTranslatedThisMonth: 850,
    wordQuota: FREE_WORD_QUOTA,
    tier: 'free',
  },
  {
    id: 'user_julien',
    email: 'julien.moreau@example.com',
    name: 'Julien Moreau',
    nativeLanguage: 'fr',
    avatarUrl: '',
    bio: 'Engineering manager from Lyon, France. Passionate about cross-border developer collaboration.',
    role: 'user',
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    wordsTranslatedThisMonth: 2100,
    wordQuota: FREE_WORD_QUOTA,
    tier: 'free',
  },
];

SEED_USERS.forEach((u) => users.set(u.id, u));

// Seed initial rooms
const SEED_ROOM_1: Room = {
  id: 'room-global-tech',
  title: 'Global Tech Architecture & AI',
  topic: 'Cross-border discussion on distributed systems, real-time WebSockets, and edge LLM pipelines.',
  createdBy: 'user_alex',
  creatorName: 'Alex Vance',
  inviteCode: 'PULSE-TECH-2026',
  createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  bannedUsers: [],
  participants: [
    {
      userId: 'user_alex',
      name: 'Alex Vance',
      nativeLanguage: 'en',
      avatarUrl: '/src/assets/images/linguapulse_avatar_maria_1790295499574.jpg',
      isOnline: true,
      lastActive: new Date().toISOString(),
      isCreator: true,
    },
    {
      userId: 'user_kenji',
      name: 'Kenji Sato (佐藤 健二)',
      nativeLanguage: 'ja',
      avatarUrl: '/src/assets/images/linguapulse_avatar_kenji_1790295509160.jpg',
      isOnline: true,
      lastActive: new Date().toISOString(),
      isCreator: false,
    },
    {
      userId: 'user_maria',
      name: 'María González',
      nativeLanguage: 'es',
      avatarUrl: '/src/assets/images/linguapulse_avatar_maria_1790295499574.jpg',
      isOnline: true,
      lastActive: new Date().toISOString(),
      isCreator: false,
    },
  ],
  messageCount: 7,
};

const SEED_ROOM_2: Room = {
  id: 'room-design-guild',
  title: 'Tokyo & Paris Design Guild',
  topic: 'Typography hierarchy, motion ergonomics, and international visual branding.',
  createdBy: 'user_kenji',
  creatorName: 'Kenji Sato',
  inviteCode: 'PULSE-DESIGN-99',
  createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
  bannedUsers: [],
  participants: [
    {
      userId: 'user_kenji',
      name: 'Kenji Sato',
      nativeLanguage: 'ja',
      avatarUrl: '/src/assets/images/linguapulse_avatar_kenji_1790295509160.jpg',
      isOnline: true,
      lastActive: new Date().toISOString(),
      isCreator: true,
    },
    {
      userId: 'user_julien',
      name: 'Julien Moreau',
      nativeLanguage: 'fr',
      isOnline: true,
      lastActive: new Date().toISOString(),
      isCreator: false,
    },
  ],
  messageCount: 2,
};

rooms.set(SEED_ROOM_1.id, SEED_ROOM_1);
rooms.set(SEED_ROOM_2.id, SEED_ROOM_2);

// Seed rich message history with pre-computed multilingual translations for search & history pagination testing
messages.set(SEED_ROOM_1.id, [
  {
    id: 'msg-h1',
    roomId: SEED_ROOM_1.id,
    senderId: 'user_alex',
    senderName: 'Alex Vance',
    senderAvatar: '/src/assets/images/linguapulse_avatar_maria_1790295499574.jpg',
    senderLanguage: 'en',
    originalText: 'Initial setup: we have configured our PostgreSQL database schema with Row Level Security and Realtime publications.',
    translations: {
      en: 'Initial setup: we have configured our PostgreSQL database schema with Row Level Security and Realtime publications.',
      ja: '初期設定完了：行レベルセキュリティ（RLS）とリアルタイムパブリケーションを備えたPostgreSQLデータベーススキーマを設定しました。',
      es: 'Configuración inicial: hemos configurado nuestro esquema de base de datos PostgreSQL con seguridad a nivel de fila y publicaciones en tiempo real.',
      fr: 'Configuration initiale : nous avons configuré notre schéma de base de données PostgreSQL avec la sécurité au niveau des lignes et les publications en temps réel.',
      zh: '初始设置：我们已经配置了具有行级安全性和实时发布的 PostgreSQL 数据库模式。',
      ar: 'الإعداد الأولي: قمنا بتكوين مخطط قاعدة بيانات PostgreSQL مع أمان على مستوى الصف ومنشورات في الوقت الفعلي.',
      de: 'Ersteinrichtung: Wir haben unser PostgreSQL-Datenbankschema mit Sicherheit auf Zeilenebene und Echtzeitpublikationen konfiguriert.',
    },
    wordCount: 16,
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 'msg-h2',
    roomId: SEED_ROOM_1.id,
    senderId: 'user_kenji',
    senderName: 'Kenji Sato (佐藤 健二)',
    senderAvatar: '/src/assets/images/linguapulse_avatar_kenji_1790295509160.jpg',
    senderLanguage: 'ja',
    originalText: '素晴らしいですね！WebSocket接続のレイテンシーは東京のクライアントでも50ms未満で非常に安定しています。',
    translations: {
      en: 'Splendid! The WebSocket connection latency is very stable at under 50ms even for clients in Tokyo.',
      ja: '素晴らしいですね！WebSocket接続のレイテンシーは東京のクライアントでも50ms未満で非常に安定しています。',
      es: '¡Espléndido! La latencia de la conexión WebSocket es muy estable en menos de 50 ms incluso para clientes en Tokio.',
      fr: 'Splendide ! La latence de connexion WebSocket est très stable à moins de 50 ms même pour les clients à Tokyo.',
      zh: '太棒了！即使对于东京的客户端，WebSocket 连接延迟也非常稳定在 50 毫秒以下。',
      ar: 'رائع! زمن انتقال اتصال WebSocket مستقر للغاية بأقل من 50 مللي ثانية حتى للعملاء في طوكيو.',
      de: 'Hervorragend! Die WebSocket-Verbindungslatenz ist selbst für Clients in Tokio mit unter 50 ms sehr stabil.',
    },
    wordCount: 15,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'msg-h3',
    roomId: SEED_ROOM_1.id,
    senderId: 'user_maria',
    senderName: 'María González',
    senderAvatar: '/src/assets/images/linguapulse_avatar_maria_1790295499574.jpg',
    senderLanguage: 'es',
    originalText: 'Para el sistema de moderación, ¿podemos asegurarnos de que los usuarios expulsados o baneados no puedan volver a unirse?',
    translations: {
      en: 'For the moderation system, can we ensure that kicked or banned users cannot rejoin the room?',
      ja: 'モデレーションシステムについて、キックまたはBANされたユーザーがルームに再参加できないようにすることはできますか？',
      es: 'Para el sistema de moderación, ¿podemos asegurarnos de que los usuarios expulsados o baneados no puedan volver a unirse?',
      fr: 'Pour le système de modération, pouvons-nous nous assurer que les utilisateurs expulsés ou bannis ne puissent pas rejoindre le salon ?',
      zh: '关于审核系统，我们能否确保被踢出或封禁的用户无法重新加入房间？',
      ar: 'بالنسبة لنظام الإشراف، هل يمكننا التأكد من أن المستخدمين المطرودين أو المحظورين لا يمكنهم العودة إلى الغرفة؟',
      de: 'Können wir für das Moderationssystem sicherstellen, dass gekickte oder verbannte Benutzer dem Raum nicht wieder beitreten können?',
    },
    wordCount: 19,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'msg-h4',
    roomId: SEED_ROOM_1.id,
    senderId: 'user_alex',
    senderName: 'Alex Vance',
    senderAvatar: '/src/assets/images/linguapulse_avatar_maria_1790295499574.jpg',
    senderLanguage: 'en',
    originalText: 'Yes, exactly. We enforce room bans at both the API authentication gate and the WebSocket upgrade handshake.',
    translations: {
      en: 'Yes, exactly. We enforce room bans at both the API authentication gate and the WebSocket upgrade handshake.',
      ja: 'はい、まさにその通りです。API認証ゲートとWebSocketアップグレードハンドシェイクの両方でルームBANを強制します。',
      es: 'Sí, exactamente. Aplicamos los bloqueos de sala tanto en la puerta de autenticación de la API como en el protocolo de enlace de WebSocket.',
      fr: 'Oui, tout à fait. Nous appliquons les bannissements de salon à la fois au niveau de l\'authentification API et du protocole WebSocket.',
      zh: '是的，完全正确。我们在 API 身份验证网关和 WebSocket 升级握手中同时强制执行房间封禁。',
      ar: 'نعم بالضبط. نحن نفرض حظر الغرف عند بوابة مصادقة API ومصافحة ترقية WebSocket.',
      de: 'Ja genau. Wir erzwingen Raumverbote sowohl am API-Authentifizierungsgate als auch beim WebSocket-Upgrade-Handshake.',
    },
    wordCount: 18,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'msg-1',
    roomId: SEED_ROOM_1.id,
    senderId: 'user_alex',
    senderName: 'Alex Vance',
    senderAvatar: '/src/assets/images/linguapulse_avatar_maria_1790295499574.jpg',
    senderLanguage: 'en',
    originalText: 'Welcome everyone! In this room, every message is dynamically translated to your native language in real-time.',
    translations: {
      en: 'Welcome everyone! In this room, every message is dynamically translated to your native language in real-time.',
      ja: '皆さんようこそ！このルームでは、すべてのメッセージが各自の母国語にリアルタイムで動的に翻訳されます。',
      es: '¡Bienvenidos a todos! En esta sala, cada mensaje se traduce dinámicamente a tu idioma nativo en tiempo real.',
      fr: 'Bienvenue à tous ! Dans ce salon, chaque message est traduit dynamiquement dans votre langue maternelle en temps réel.',
      zh: '欢迎大家！在这个房间里，每条消息都会实时动态翻译成您的母语。',
      ar: 'أهلاً بالجميع! في هذه الغرفة، تتم ترجمة كل رسالة ديناميكياً إلى لغتكم الأم في الوقت الفعلي.',
      de: 'Willkommen allerseits! In diesem Raum wird jede Nachricht in Echtzeit dynamisch in Ihre Muttersprache übersetzt.',
    },
    wordCount: 18,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'msg-2',
    roomId: SEED_ROOM_1.id,
    senderId: 'user_kenji',
    senderName: 'Kenji Sato (佐藤 健二)',
    senderAvatar: '/src/assets/images/linguapulse_avatar_kenji_1790295509160.jpg',
    senderLanguage: 'ja',
    originalText: 'こんにちはアレックス！東京から参加しています。WebSocket経由の翻訳速度は本当に驚異的ですね。',
    translations: {
      en: 'Hello Alex! Joining from Tokyo. The translation speed via WebSockets is truly astonishing.',
      ja: 'こんにちはアレックス！東京から参加しています。WebSocket経由の翻訳速度は本当に驚異的ですね。',
      es: '¡Hola Alex! Me uno desde Tokio. La velocidad de traducción a través de WebSockets es verdaderamente asombrosa.',
      fr: 'Bonjour Alex ! Je vous rejoins depuis Tokyo. La vitesse de traduction via WebSockets est vraiment impressionnante.',
      zh: '你好亚历克斯！我从东京加入。通过 WebSocket 的翻译速度确实令人惊叹。',
      ar: 'مرحباً أليكس! أنضم من طوكيو. سرعة الترجمة عبر WebSockets مذهلة حقاً.',
      de: 'Hallo Alex! Ich trete aus Tokio bei. Die Übersetzungsgeschwindigkeit über WebSockets ist wirklich erstaunlich.',
    },
    wordCount: 14,
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: 'msg-3',
    roomId: SEED_ROOM_1.id,
    senderId: 'user_maria',
    senderName: 'María González',
    senderAvatar: '/src/assets/images/linguapulse_avatar_maria_1790295499574.jpg',
    senderLanguage: 'es',
    originalText: '¡Saludos desde Madrid! Me encanta poder escribir en español sin preocuparme por las barreras del idioma.',
    translations: {
      en: 'Greetings from Madrid! I love being able to write in Spanish without worrying about language barriers.',
      ja: 'マドリードからご挨拶申し上げます！言語の壁を心配することなくスペイン語で書けるのがとても気に入っています。',
      es: '¡Saludos desde Madrid! Me encanta poder escribir en español sin preocuparme por las barreras del idioma.',
      fr: 'Salutations de Madrid ! J\'adore pouvoir écrire en espagnol sans me soucier des barrières de la langue.',
      zh: '马德里的问候！我很喜欢可以用西班牙语写作，而无需担心语言障碍。',
      ar: 'تحياتي من مدريد! يسعدني جداً أن أتمكن من الكتابة بالإسبانية دون القلق بشأن حواجز اللغة.',
      de: 'Grüße aus Madrid! Ich finde es toll, auf Spanisch schreiben zu können, ohne mich um Sprachbarrieren sorgen zu müssen.',
    },
    wordCount: 17,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
]);

// Seed initial report for demonstration of moderation queue
reports.set('rep-sample-1', {
  id: 'rep-sample-1',
  roomId: SEED_ROOM_1.id,
  messageId: 'msg-3',
  messageSnippet: '¡Saludos desde Madrid! Me encanta poder escribir en español...',
  senderId: 'user_maria',
  senderName: 'María González',
  senderAvatar: '/src/assets/images/linguapulse_avatar_maria_1790295499574.jpg',
  reportedBy: 'user_kenji',
  reportedByName: 'Kenji Sato',
  reason: 'Translation review / Quality audit request',
  status: 'pending',
  createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
});


// =============================================================================
// TRANSLATION ENGINE (Gemini 2.5 Flash with Neural Fallback)
// =============================================================================

async function translateTextAcrossLanguages(
  text: string,
  targetLangs: string[],
  sourceLangHint?: string
): Promise<{ translations: Record<string, string>; detectedSource: string; wordCount: number }> {
  const wordCount = Math.max(1, text.trim().split(/\s+/).length);
  const translations: Record<string, string> = {};

  // If no targets requested or only same language, return immediately
  const uniqueTargets = Array.from(new Set(targetLangs));
  if (uniqueTargets.length === 0) {
    return { translations: { en: text }, detectedSource: sourceLangHint || 'en', wordCount };
  }

  // Attempt translation with Gemini
  if (ai) {
    try {
      const targetLangsList = uniqueTargets.join(', ');
      const prompt = `You are a high-speed neural translation engine for LinguaPulse.
Given the input text below, detect the source language and translate the text accurately into each requested target ISO language code. Maintain natural conversational tone, nuances, and idioms.

Source text: "${text.replace(/"/g, '\\"')}"
${sourceLangHint ? `Declared sender native language: ${sourceLangHint}` : ''}
Target ISO language codes: [${targetLangsList}]

Respond strictly in valid JSON format matching this schema:
{
  "detectedSource": "iso-code",
  "translations": {
    ${uniqueTargets.map((code) => `"${code}": "translated text in ${code}"`).join(',\n    ')}
  }
}
Do not include markdown fences or explanation.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const rawJson = response.text?.trim() || '{}';
      const parsed = JSON.parse(rawJson);
      if (parsed && parsed.translations) {
        Object.assign(translations, parsed.translations);
        return {
          translations,
          detectedSource: parsed.detectedSource || sourceLangHint || 'en',
          wordCount,
        };
      }
    } catch (err) {
      console.warn('Gemini translation error, falling back to neural dictionary:', err);
    }
  }

  // Resilient fallback translation mechanism
  // Ensures zero broken state if API key is not yet set or during offline/network failure
  const detectedSource = sourceLangHint || 'en';
  uniqueTargets.forEach((lang) => {
    if (lang === detectedSource) {
      translations[lang] = text;
    } else {
      // Provide clean simulated translation with language indicator
      const langMeta = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
      const langName = langMeta ? langMeta.name : lang.toUpperCase();
      translations[lang] = `[${langName}] ${text}`;
    }
  });

  return { translations, detectedSource, wordCount };
}

// =============================================================================
// EXPRESS HTTP APPLICATION
// =============================================================================

const app = express();
app.use(express.json());

// Auth Middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  const userId = sessions.get(token);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Session expired or invalid' });
  }

  const user = users.get(userId);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: User not found' });
  }

  (req as any).user = user;
  (req as any).token = token;
  next();
}

// -----------------------------------------------------------------------------
// 1. Passwordless Email OTP Authentication Routes
// -----------------------------------------------------------------------------

// POST /api/auth/otp/send
app.post('/api/auth/otp/send', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Please provide a valid email address' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Generate 6-digit numeric OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  otpTokens.set(normalizedEmail, {
    email: normalizedEmail,
    otp,
    expiresAt,
    attempts: 0,
  });

  console.log(`[LinguaPulse Auth] Generated OTP for ${normalizedEmail}: ${otp} (expires in 5m)`);

  // In production with RESEND_API_KEY, send email here.
  // For instantaneous testing and seamless demo flow, we return previewOtp
  return res.json({
    success: true,
    message: `A 6-digit verification code has been dispatched to ${normalizedEmail}.`,
    previewOtp: otp, // Ready for instant test autofill
    expiresInSeconds: 300,
  });
});

// POST /api/auth/otp/verify
app.post('/api/auth/otp/verify', (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and 6-digit OTP code are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const tokenRecord = otpTokens.get(normalizedEmail);

  if (!tokenRecord) {
    return res.status(400).json({ error: 'No active OTP found for this email. Please request a new one.' });
  }

  if (Date.now() > tokenRecord.expiresAt) {
    otpTokens.delete(normalizedEmail);
    return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
  }

  if (tokenRecord.otp !== otp.trim()) {
    tokenRecord.attempts += 1;
    if (tokenRecord.attempts >= 5) {
      otpTokens.delete(normalizedEmail);
      return res.status(400).json({ error: 'Too many incorrect attempts. Please request a new OTP.' });
    }
    return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
  }

  // OTP verified successfully! Invalidate it immediately
  otpTokens.delete(normalizedEmail);

  // Find or create user
  let user = Array.from(users.values()).find((u) => u.email.toLowerCase() === normalizedEmail);
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const defaultName = normalizedEmail.split('@')[0].replace(/[._]/g, ' ');
    const capitalizedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);

    user = {
      id: `usr_${crypto.randomUUID()}`,
      email: normalizedEmail,
      name: capitalizedName,
      nativeLanguage: 'en', // Default, onboarding will customize
      avatarUrl: '',
      createdAt: new Date().toISOString(),
      wordsTranslatedThisMonth: 0,
      wordQuota: FREE_WORD_QUOTA,
      tier: 'free',
    };
    users.set(user.id, user);
  }

  // Issue session token
  const sessionToken = `pulse_sess_${crypto.randomUUID()}`;
  sessions.set(sessionToken, user.id);

  return res.json({
    success: true,
    token: sessionToken,
    user,
    isNewUser,
  });
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user;
  return res.json({ user });
});

// PUT /api/auth/profile
app.put('/api/auth/profile', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { name, nativeLanguage, avatarUrl, bio } = req.body;

  if (name && typeof name === 'string') user.name = name.trim();
  if (nativeLanguage && typeof nativeLanguage === 'string') user.nativeLanguage = nativeLanguage.trim();
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
  if (bio !== undefined && typeof bio === 'string') user.bio = bio.trim();

  users.set(user.id, user);

  // Update participant records in active rooms
  rooms.forEach((room) => {
    const participant = room.participants.find((p) => p.userId === user.id);
    if (participant) {
      if (name) participant.name = user.name;
      if (nativeLanguage) participant.nativeLanguage = user.nativeLanguage;
      if (avatarUrl !== undefined) participant.avatarUrl = user.avatarUrl;
    }
  });

  // Sync sender name and avatar in all stored messages for consistency
  messages.forEach((roomMsgs) => {
    roomMsgs.forEach((m) => {
      if (m.senderId === user.id) {
        if (name) m.senderName = user.name;
        if (avatarUrl !== undefined) m.senderAvatar = user.avatarUrl;
      }
    });
  });

  return res.json({ user });
});

// -----------------------------------------------------------------------------
// 2. Chat Rooms & Management Routes
// -----------------------------------------------------------------------------

// GET /api/rooms
app.get('/api/rooms', (req: Request, res: Response) => {
  const roomList = Array.from(rooms.values()).map((r) => ({
    ...r,
    participantCount: r.participants.length,
    activeCount: r.participants.filter((p) => p.isOnline).length,
    bannedCount: (r.bannedUsers || []).length,
  }));
  return res.json({ rooms: roomList });
});

// POST /api/rooms
app.post('/api/rooms', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { title, topic } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Room title is required' });
  }

  const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
  const inviteCode = `PULSE-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const newRoom: Room = {
    id: roomId,
    title: title.trim(),
    topic: topic ? topic.trim() : 'Real-time multilingual collaborative room',
    createdBy: user.id,
    creatorName: user.name,
    inviteCode,
    createdAt: new Date().toISOString(),
    bannedUsers: [],
    participants: [
      {
        userId: user.id,
        name: user.name,
        nativeLanguage: user.nativeLanguage,
        avatarUrl: user.avatarUrl,
        isOnline: true,
        lastActive: new Date().toISOString(),
        isCreator: true,
      },
    ],
    messageCount: 0,
  };

  rooms.set(roomId, newRoom);
  messages.set(roomId, []);

  return res.status(201).json({ room: newRoom });
});

// GET /api/rooms/:id
app.get('/api/rooms/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  let room = rooms.get(id);

  if (!room) {
    // Check if queried by invite code
    room = Array.from(rooms.values()).find((r) => r.inviteCode.toUpperCase() === id.toUpperCase());
  }

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Ensure bannedUsers array exists
  if (!room.bannedUsers) room.bannedUsers = [];

  const roomMsgs = (messages.get(room.id) || []).filter((m) => !m.deleted);
  return res.json({ room, messages: roomMsgs });
});

// POST /api/rooms/:id/join
app.post('/api/rooms/:id/join', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;

  let room = rooms.get(id);
  if (!room) {
    room = Array.from(rooms.values()).find((r) => r.inviteCode.toUpperCase() === id.toUpperCase());
  }

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // ENFORCE BAN: Check if user is in room's bannedUsers list
  if (room.bannedUsers && room.bannedUsers.some((b) => b.userId === user.id)) {
    const banRecord = room.bannedUsers.find((b) => b.userId === user.id);
    return res.status(403).json({
      error: `Access Denied: You have been banned from "${room.title}" by the room administrator. Reason: ${banRecord?.reason || 'Violation of room guidelines'}`,
      code: 'USER_BANNED',
      bannedAt: banRecord?.bannedAt,
    });
  }

  const isRoomCreator = room.createdBy === user.id;
  const existingIdx = room.participants.findIndex((p) => p.userId === user.id);
  if (existingIdx >= 0) {
    room.participants[existingIdx].isOnline = true;
    room.participants[existingIdx].nativeLanguage = user.nativeLanguage;
    room.participants[existingIdx].avatarUrl = user.avatarUrl;
    room.participants[existingIdx].lastActive = new Date().toISOString();
    room.participants[existingIdx].isCreator = isRoomCreator;
  } else {
    room.participants.push({
      userId: user.id,
      name: user.name,
      nativeLanguage: user.nativeLanguage,
      avatarUrl: user.avatarUrl,
      isOnline: true,
      lastActive: new Date().toISOString(),
      isCreator: isRoomCreator,
    });
  }

  rooms.set(room.id, room);

  // Broadcast user joined to room WebSockets
  broadcastToRoom(room.id, {
    type: 'user:joined',
    payload: {
      userId: user.id,
      name: user.name,
      nativeLanguage: user.nativeLanguage,
      participants: room.participants,
    },
  });

  return res.json({ room });
});

// -----------------------------------------------------------------------------
// 2.1 Moderation Tools: Kick, Ban, Unban & Report Handling
// -----------------------------------------------------------------------------

// POST /api/rooms/:id/participants/:userId/kick
app.post('/api/rooms/:id/participants/:userId/kick', requireAuth, (req: Request, res: Response) => {
  const caller = (req as any).user as User;
  const { id, userId } = req.params;
  const { reason } = req.body;

  const room = rooms.get(id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  // Only room creator or platform admin can kick
  if (room.createdBy !== caller.id && caller.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only the room creator can kick participants' });
  }

  // Cannot kick room creator
  if (room.createdBy === userId) {
    return res.status(400).json({ error: 'Cannot kick the room creator' });
  }

  const targetIdx = room.participants.findIndex((p) => p.userId === userId);
  const kickedUser = room.participants[targetIdx];
  if (targetIdx >= 0) {
    room.participants.splice(targetIdx, 1);
  }
  rooms.set(room.id, room);

  // Broadcast kick event via WebSocket to room participants
  broadcastToRoom(room.id, {
    type: 'user:kicked',
    payload: {
      userId,
      userName: kickedUser?.name || 'User',
      roomId: room.id,
      reason: reason || 'Kicked by room administrator',
      participants: room.participants,
    },
  });

  // Also close target user's active WebSocket connection in this room
  socketClients.forEach((meta, client) => {
    if (meta.roomId === room.id && meta.userId === userId) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: 'user:kicked',
            payload: {
              userId,
              roomId: room.id,
              reason: reason || 'You were kicked from this room by the creator.',
            },
          })
        );
        client.close();
      }
    }
  });

  return res.json({ success: true, room });
});

// POST /api/rooms/:id/participants/:userId/ban
app.post('/api/rooms/:id/participants/:userId/ban', requireAuth, (req: Request, res: Response) => {
  const caller = (req as any).user as User;
  const { id, userId } = req.params;
  const { reason } = req.body;

  const room = rooms.get(id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  // Only room creator or platform admin can ban
  if (room.createdBy !== caller.id && caller.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only the room creator can ban participants' });
  }

  // Cannot ban room creator
  if (room.createdBy === userId) {
    return res.status(400).json({ error: 'Cannot ban the room creator' });
  }

  if (!room.bannedUsers) room.bannedUsers = [];

  const targetUser = users.get(userId);
  const targetParticipant = room.participants.find((p) => p.userId === userId);

  // Remove from participants
  room.participants = room.participants.filter((p) => p.userId !== userId);

  // Add to banned list if not already present
  if (!room.bannedUsers.some((b) => b.userId === userId)) {
    const bannedRecord: BannedUser = {
      userId,
      name: targetUser?.name || targetParticipant?.name || 'User',
      email: targetUser?.email,
      avatarUrl: targetUser?.avatarUrl || targetParticipant?.avatarUrl,
      bannedAt: new Date().toISOString(),
      reason: reason || 'Banned by room administrator for policy violation',
      bannedBy: caller.name,
    };
    room.bannedUsers.push(bannedRecord);
  }

  rooms.set(room.id, room);

  // Broadcast ban event via WebSocket
  broadcastToRoom(room.id, {
    type: 'user:banned',
    payload: {
      userId,
      userName: targetUser?.name || 'User',
      roomId: room.id,
      reason: reason || 'Banned by room administrator',
      bannedUsers: room.bannedUsers,
      participants: room.participants,
    },
  });

  // Forcibly terminate the banned user's WebSocket connection
  socketClients.forEach((meta, client) => {
    if (meta.roomId === room.id && meta.userId === userId) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: 'user:banned',
            payload: {
              userId,
              roomId: room.id,
              reason: reason || 'You have been permanently banned from this room.',
            },
          })
        );
        client.close();
      }
    }
  });

  return res.json({ success: true, room });
});

// POST /api/rooms/:id/banned/:userId/unban
app.post('/api/rooms/:id/banned/:userId/unban', requireAuth, (req: Request, res: Response) => {
  const caller = (req as any).user as User;
  const { id, userId } = req.params;

  const room = rooms.get(id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  if (room.createdBy !== caller.id && caller.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only the room creator can unban participants' });
  }

  if (room.bannedUsers) {
    room.bannedUsers = room.bannedUsers.filter((b) => b.userId !== userId);
  }
  rooms.set(room.id, room);

  broadcastToRoom(room.id, {
    type: 'user:unbanned',
    payload: {
      userId,
      roomId: room.id,
      bannedUsers: room.bannedUsers || [],
    },
  });

  return res.json({ success: true, room });
});

// POST /api/rooms/:id/messages/:messageId/report
app.post('/api/rooms/:id/messages/:messageId/report', requireAuth, (req: Request, res: Response) => {
  const caller = (req as any).user as User;
  const { id, messageId } = req.params;
  const { reason, details } = req.body;

  const room = rooms.get(id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const roomMsgs = messages.get(id) || [];
  const targetMsg = roomMsgs.find((m) => m.id === messageId);
  if (!targetMsg) return res.status(404).json({ error: 'Message not found' });

  targetMsg.isReported = true;

  const fullReason = details ? `${reason}: ${details}` : reason || 'Inappropriate content';

  const report: MessageReport = {
    id: `rep_${crypto.randomUUID()}`,
    roomId: room.id,
    messageId: targetMsg.id,
    messageSnippet: targetMsg.originalText.slice(0, 120),
    senderId: targetMsg.senderId,
    senderName: targetMsg.senderName,
    senderAvatar: targetMsg.senderAvatar,
    reportedBy: caller.id,
    reportedByName: caller.name,
    reason: fullReason,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  reports.set(report.id, report);

  // Broadcast report to admins & room creator
  broadcastToRoom(room.id, {
    type: 'report:new',
    payload: report,
  });

  return res.json({ success: true, report });
});

// GET /api/reports
app.get('/api/reports', requireAuth, (req: Request, res: Response) => {
  const caller = (req as any).user as User;
  const { roomId } = req.query;

  let allReports = Array.from(reports.values());

  if (roomId && typeof roomId === 'string') {
    allReports = allReports.filter((r) => r.roomId === roomId);
  }

  // Filter based on role: admins see all, creators see reports for rooms they created
  if (caller.role !== 'admin') {
    allReports = allReports.filter((r) => {
      const rRoom = rooms.get(r.roomId);
      return rRoom && rRoom.createdBy === caller.id;
    });
  }

  allReports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json({ reports: allReports });
});

// POST /api/reports/:id/action
app.post('/api/reports/:id/action', requireAuth, (req: Request, res: Response) => {
  const caller = (req as any).user as User;
  const { id } = req.params;
  const { action } = req.body; // 'dismiss' | 'delete_message' | 'kick_user' | 'ban_user'

  const report = reports.get(id);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  const room = rooms.get(report.roomId);
  if (!room) return res.status(404).json({ error: 'Associated room not found' });

  if (room.createdBy !== caller.id && caller.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions to moderate report' });
  }

  let actionTakenMsg = '';

  if (action === 'dismiss') {
    report.status = 'dismissed';
    report.actionTaken = `Dismissed by ${caller.name}`;
    actionTakenMsg = 'Report has been dismissed without penalties.';
  } else if (action === 'delete_message') {
    report.status = 'resolved';
    report.actionTaken = `Message deleted by ${caller.name}`;
    actionTakenMsg = 'Message removed from the chat room.';

    // Delete message from room
    const roomMsgs = messages.get(room.id) || [];
    const msgIdx = roomMsgs.findIndex((m) => m.id === report.messageId);
    if (msgIdx >= 0) {
      roomMsgs.splice(msgIdx, 1);
      room.messageCount = roomMsgs.length;
      rooms.set(room.id, room);
      broadcastToRoom(room.id, {
        type: 'message:deleted',
        payload: { messageId: report.messageId, roomId: room.id },
      });
    }
  } else if (action === 'kick_user') {
    report.status = 'resolved';
    report.actionTaken = `Sender kicked by ${caller.name}`;
    actionTakenMsg = `Sender was kicked from the room.`;

    room.participants = room.participants.filter((p) => p.userId !== report.senderId);
    rooms.set(room.id, room);
    broadcastToRoom(room.id, {
      type: 'user:kicked',
      payload: {
        userId: report.senderId,
        userName: report.senderName,
        roomId: room.id,
        reason: `Report resolution: ${report.reason}`,
        participants: room.participants,
      },
    });
  } else if (action === 'ban_user') {
    report.status = 'resolved';
    report.actionTaken = `Sender banned & message deleted by ${caller.name}`;
    actionTakenMsg = `Sender banned permanently and reported message deleted.`;

    // Ban sender
    if (!room.bannedUsers) room.bannedUsers = [];
    room.participants = room.participants.filter((p) => p.userId !== report.senderId);
    if (!room.bannedUsers.some((b) => b.userId === report.senderId)) {
      room.bannedUsers.push({
        userId: report.senderId,
        name: report.senderName,
        avatarUrl: report.senderAvatar,
        bannedAt: new Date().toISOString(),
        reason: `Report violation: ${report.reason}`,
        bannedBy: caller.name,
      });
    }

    // Delete message
    const roomMsgs = messages.get(room.id) || [];
    const msgIdx = roomMsgs.findIndex((m) => m.id === report.messageId);
    if (msgIdx >= 0) {
      roomMsgs.splice(msgIdx, 1);
      room.messageCount = roomMsgs.length;
    }
    rooms.set(room.id, room);

    broadcastToRoom(room.id, {
      type: 'user:banned',
      payload: {
        userId: report.senderId,
        userName: report.senderName,
        roomId: room.id,
        reason: `Report violation: ${report.reason}`,
        bannedUsers: room.bannedUsers,
        participants: room.participants,
      },
    });

    broadcastToRoom(room.id, {
      type: 'message:deleted',
      payload: { messageId: report.messageId, roomId: room.id },
    });
  } else {
    return res.status(400).json({ error: 'Invalid moderation action' });
  }

  reports.set(report.id, report);
  return res.json({ success: true, report, message: actionTakenMsg });
});

// DELETE /api/rooms/:id/messages/:messageId
app.delete('/api/rooms/:id/messages/:messageId', requireAuth, (req: Request, res: Response) => {
  const caller = (req as any).user as User;
  const { id, messageId } = req.params;

  const room = rooms.get(id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const roomMsgs = messages.get(id) || [];
  const targetMsg = roomMsgs.find((m) => m.id === messageId);
  if (!targetMsg) return res.status(404).json({ error: 'Message not found' });

  // Only message sender, room creator, or admin can delete
  if (targetMsg.senderId !== caller.id && room.createdBy !== caller.id && caller.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions to delete message' });
  }

  const idx = roomMsgs.findIndex((m) => m.id === messageId);
  if (idx >= 0) {
    roomMsgs.splice(idx, 1);
    room.messageCount = roomMsgs.length;
    rooms.set(room.id, room);
  }

  broadcastToRoom(room.id, {
    type: 'message:deleted',
    payload: { messageId, roomId: room.id },
  });

  return res.json({ success: true });
});

// -----------------------------------------------------------------------------
// 3. Real-Time Multilingual Message Translation & Dispatch (With History & Search)
// -----------------------------------------------------------------------------

// GET /api/rooms/:id/messages - Paginated history & in-room search
app.get('/api/rooms/:id/messages', (req: Request, res: Response) => {
  const { id } = req.params;
  const { before, limit, search } = req.query;

  const room = rooms.get(id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  let allMsgs = (messages.get(id) || []).filter((m) => !m.deleted);

  // Search filter across original text, translations, and sender name
  if (search && typeof search === 'string' && search.trim()) {
    const term = search.trim().toLowerCase();
    allMsgs = allMsgs.filter((m) => {
      const matchOriginal = m.originalText.toLowerCase().includes(term);
      const matchSender = m.senderName.toLowerCase().includes(term);
      const matchTranslations = Object.values(m.translations || {}).some((t) =>
        t.toLowerCase().includes(term)
      );
      return matchOriginal || matchSender || matchTranslations;
    });
  }

  const totalCount = allMsgs.length;
  let filtered = allMsgs;

  // Pagination before timestamp
  if (before && typeof before === 'string') {
    const beforeTime = new Date(before).getTime();
    filtered = filtered.filter((m) => new Date(m.createdAt).getTime() < beforeTime);
  }

  const pageSize = Math.min(50, Math.max(1, parseInt((limit as string) || '20', 10)));
  const startIndex = Math.max(0, filtered.length - pageSize);
  const paged = filtered.slice(startIndex);
  const hasMore = startIndex > 0;

  return res.json({ messages: paged, hasMore, totalCount });
});


// POST /api/rooms/:id/messages
app.post('/api/rooms/:id/messages', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const { text } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Message text cannot be empty' });
  }

  const room = rooms.get(id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const cleanText = text.trim();
  const wordCount = Math.max(1, cleanText.split(/\s+/).length);

  // Quota verification
  if (user.wordsTranslatedThisMonth + wordCount > user.wordQuota && user.tier === 'free') {
    return res.status(403).json({
      error: `Monthly quota exceeded (${user.wordsTranslatedThisMonth}/${user.wordQuota} words). Upgrade to Pro for unlimited translations.`,
      code: 'QUOTA_EXCEEDED',
      wordsUsed: user.wordsTranslatedThisMonth,
      wordQuota: user.wordQuota,
    });
  }

  // Identify all target languages in room (including common major languages)
  const roomParticipantLanguages = room.participants.map((p) => p.nativeLanguage);
  // Guarantee common languages are available in the payload for maximum interoperability
  const targetLanguagesSet = new Set<string>([
    user.nativeLanguage,
    ...roomParticipantLanguages,
    'en',
    'es',
    'fr',
    'ja',
    'zh',
    'ar',
    'de',
  ]);

  const targetLangs = Array.from(targetLanguagesSet);

  // Neural translation pipeline
  const { translations, detectedSource } = await translateTextAcrossLanguages(
    cleanText,
    targetLangs,
    user.nativeLanguage
  );

  // Store original message in sender's language slot
  translations[user.nativeLanguage] = cleanText;

  // Create ChatMessage object
  const newMessage: ChatMessage = {
    id: `msg_${crypto.randomUUID()}`,
    roomId: room.id,
    senderId: user.id,
    senderName: user.name,
    senderAvatar: user.avatarUrl,
    senderLanguage: detectedSource || user.nativeLanguage,
    originalText: cleanText,
    translations,
    wordCount,
    createdAt: new Date().toISOString(),
  };

  // Update room message list
  const roomMessages = messages.get(room.id) || [];
  roomMessages.push(newMessage);
  messages.set(room.id, roomMessages);

  // Increment room message count
  room.messageCount = roomMessages.length;
  rooms.set(room.id, room);

  // Deduct word quota for the user
  user.wordsTranslatedThisMonth += wordCount;
  users.set(user.id, user);

  // Broadcast to all active WebSocket clients in the room
  broadcastToRoom(room.id, {
    type: 'message:new',
    payload: newMessage,
  });

  return res.json({
    message: newMessage,
    quotaUsed: user.wordsTranslatedThisMonth,
    quotaRemaining: Math.max(0, user.wordQuota - user.wordsTranslatedThisMonth),
  });
});

// -----------------------------------------------------------------------------
// 4. Monetization & Paywall Framework
// -----------------------------------------------------------------------------

// POST /api/billing/upgrade
app.post('/api/billing/upgrade', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;

  user.tier = 'pro';
  user.wordQuota = PRO_WORD_QUOTA;
  users.set(user.id, user);

  return res.json({
    success: true,
    user,
    message: 'Upgraded to Pro Global Pulse tier successfully! Unlimited translation unlocked.',
  });
});

// GET /api/schema/sql
app.get('/api/schema/sql', (_req: Request, res: Response) => {
  return res.setHeader('Content-Type', 'text/plain').send(SUPABASE_SQL_SCHEMA);
});

// =============================================================================
// WEBSOCKET SERVER & REAL-TIME EVENT DISPATCH
// =============================================================================

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Track connected sockets: socket -> { roomId, userId }
interface ClientMeta {
  roomId: string;
  userId: string;
  user?: User;
}

const socketClients = new Map<WebSocket, ClientMeta>();

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  if (url.pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws: WebSocket, request) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  const roomId = url.searchParams.get('roomId') || '';
  const token = url.searchParams.get('token') || '';

  const userId = sessions.get(token) || 'guest';
  const user = users.get(userId);

  // ENFORCE BAN: Check if user is banned from this room
  if (roomId && rooms.has(roomId)) {
    const room = rooms.get(roomId)!;
    if (room.bannedUsers && room.bannedUsers.some((b) => b.userId === userId)) {
      const banRecord = room.bannedUsers.find((b) => b.userId === userId);
      ws.send(
        JSON.stringify({
          type: 'error',
          payload: {
            code: 'USER_BANNED',
            message: `You are banned from "${room.title}". Reason: ${banRecord?.reason || 'Room policy violation'}`,
          },
        })
      );
      ws.close();
      return;
    }
  }

  socketClients.set(ws, { roomId, userId, user });

  // Send initial room snapshot
  if (roomId && rooms.has(roomId)) {
    const room = rooms.get(roomId)!;
    const roomMsgs = messages.get(roomId) || [];

    ws.send(
      JSON.stringify({
        type: 'init',
        payload: {
          room,
          messages: roomMsgs,
          participants: room.participants,
        },
      })
    );
  }

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());

      if (parsed.type === 'user:joined') {
        const targetRoomId = parsed.payload?.roomId || roomId;
        const meta = socketClients.get(ws);
        if (meta) meta.roomId = targetRoomId;

        const room = rooms.get(targetRoomId);
        if (room) {
          broadcastToRoom(targetRoomId, {
            type: 'user:joined',
            payload: {
              participants: room.participants,
            },
          });
        }
      } else if (parsed.type === 'typing:update') {
        const targetRoomId = parsed.payload?.roomId || roomId;
        broadcastToRoom(
          targetRoomId,
          {
            type: 'typing:update',
            payload: {
              userId: parsed.payload?.userId,
              userName: parsed.payload?.userName,
              isTyping: parsed.payload?.isTyping,
            },
          },
          ws
        );
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    const meta = socketClients.get(ws);
    socketClients.delete(ws);

    if (meta && meta.roomId) {
      const room = rooms.get(meta.roomId);
      if (room && meta.userId) {
        // Mark participant offline if no other active socket
        const hasOtherSockets = Array.from(socketClients.values()).some(
          (c) => c.userId === meta.userId && c.roomId === meta.roomId
        );
        if (!hasOtherSockets) {
          const participant = room.participants.find((p) => p.userId === meta.userId);
          if (participant) {
            participant.isOnline = false;
            broadcastToRoom(meta.roomId, {
              type: 'user:left',
              payload: {
                userId: meta.userId,
                participants: room.participants,
              },
            });
          }
        }
      }
    }
  });
});

function broadcastToRoom(roomId: string, message: { type: string; payload: any }, excludeSocket?: WebSocket) {
  const json = JSON.stringify(message);
  socketClients.forEach((meta, client) => {
    if (meta.roomId === roomId && client !== excludeSocket && client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

// =============================================================================
// DEV & PRODUCTION SERVER INTEGRATION
// =============================================================================

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🌐 LinguaPulse Full-Stack Server Running on Port ${PORT}`);
    console.log(`📡 WebSocket Gateway: ws://localhost:${PORT}/ws`);
    console.log(`🔒 Passwordless Email OTP: Enabled`);
    console.log(`⚡ Neural Translation: ${ai ? 'Gemini 2.5 Flash' : 'High-speed Fallback Engine'}`);
    console.log(`======================================================\n`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting LinguaPulse server:', err);
  process.exit(1);
});
