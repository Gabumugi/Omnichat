import { LanguageInfo } from '../types';

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', direction: 'ltr', voiceCode: 'en-US' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', direction: 'ltr', voiceCode: 'es-ES' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', direction: 'ltr', voiceCode: 'fr-FR' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', direction: 'ltr', voiceCode: 'de-DE' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', direction: 'ltr', voiceCode: 'ja-JP' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳', direction: 'ltr', voiceCode: 'zh-CN' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', direction: 'rtl', voiceCode: 'ar-SA' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', direction: 'ltr', voiceCode: 'pt-BR' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', direction: 'ltr', voiceCode: 'it-IT' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', direction: 'ltr', voiceCode: 'ko-KR' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', direction: 'ltr', voiceCode: 'ru-RU' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', direction: 'ltr', voiceCode: 'hi-IN' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', direction: 'ltr', voiceCode: 'nl-NL' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', direction: 'ltr', voiceCode: 'tr-TR' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', direction: 'ltr', voiceCode: 'pl-PL' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', direction: 'ltr', voiceCode: 'sv-SE' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', direction: 'ltr', voiceCode: 'vi-VN' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', direction: 'ltr', voiceCode: 'uk-UA' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', direction: 'ltr', voiceCode: 'id-ID' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', direction: 'ltr', voiceCode: 'el-GR' },
];

export const FREE_WORD_QUOTA = 5000;
export const PRO_WORD_QUOTA = 500000;

export const PRICING_TIERS = [
  {
    id: 'free',
    name: 'Free Tier',
    description: 'Perfect for casual multilingual conversations and quick team syncs',
    price: '$0',
    cadence: '/month',
    limitDescription: '5,000 translated words / mo',
    wordLimit: 5000,
    features: [
      'Real-time neural translation across 20+ languages',
      'Up to 5 concurrent participants per room',
      'Text-to-speech audio pronunciation',
      'Original text verification view',
      '5-minute passwordless OTP access',
    ],
    buttonText: 'Current Plan',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro Global Pulse',
    description: 'For cross-border engineering teams, global founders, and executives',
    price: '$24',
    cadence: '/month',
    limitDescription: 'Unlimited translated words',
    wordLimit: 500000,
    features: [
      'Unlimited real-time translated words',
      'Up to 100 participants per room',
      'Sub-50ms ultra-low latency translation pipeline',
      'Domain-specific engineering & legal glossaries',
      'Speech-to-text live transcription',
      'Priority WebSocket edge bandwidth',
      'Export translated room transcript with timestamps',
    ],
    buttonText: 'Upgrade to Pro',
    highlighted: true,
  },
];
