import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Room, ChatMessage, User, RoomParticipant } from '../types';
import { SUPPORTED_LANGUAGES } from '../lib/constants';
import { api } from '../lib/api';
import { realtimeClient } from '../lib/websocket';
import { ReportMessageModal } from './ReportMessageModal';
import { ModerationQueueModal } from './ModerationQueueModal';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Languages,
  ChevronDown,
  ChevronUp,
  Share2,
  Copy,
  Check,
  Users,
  Sparkles,
  ArrowLeft,
  Circle,
  AlertTriangle,
  RotateCcw,
  Search,
  X,
  Flag,
  Trash2,
  Shield,
  ShieldAlert,
  Crown,
  UserX,
  Ban,
  ArrowUp,
  History,
  MoreVertical,
} from 'lucide-react';

interface ChatRoomViewProps {
  currentUser: User;
  roomId: string;
  onBackToDashboard: () => void;
  onOpenPricing: () => void;
  onUserQuotaUpdated: (user: User) => void;
}

export const ChatRoomView: React.FC<ChatRoomViewProps> = ({
  currentUser,
  roomId,
  onBackToDashboard,
  onOpenPricing,
  onUserQuotaUpdated,
}) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Perspective simulation: Allows the user to view the chat through any language
  const [viewingLang, setViewingLang] = useState<string>(currentUser.nativeLanguage || 'en');

  // Search in chat
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  // Message history pagination
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Moderation state
  const [reportingMessage, setReportingMessage] = useState<ChatMessage | null>(null);
  const [isModerationModalOpen, setIsModerationModalOpen] = useState(false);
  const [participantMenuUserId, setParticipantMenuUserId] = useState<string | null>(null);

  // Speech-to-Text state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Audio Speech Synthesis state
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  // Expanded original text toggles: messageId -> boolean
  const [expandedOriginals, setExpandedOriginals] = useState<Record<string, boolean>>({});

  // Typing indicator
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const isCreator = room?.createdBy === currentUser.id || currentUser.role === 'admin';

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === viewingLang);
      if (currentLangObj?.voiceCode) {
        recognition.lang = currentLangObj.voiceCode;
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [viewingLang]);

  // Load initial room data and connect WebSocket
  useEffect(() => {
    let isMounted = true;

    async function loadRoom() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.getRoom(roomId);
        if (!isMounted) return;
        setRoom(res.room);
        setMessages(res.messages || []);

        // Check if there are earlier messages
        if ((res.messages || []).length < 20) {
          setHasMoreHistory(false);
        }

        // Join room via API to register as participant & verify ban
        await api.joinRoom(res.room.id);
      } catch (err: any) {
        if (!isMounted) return;
        if (err.message && err.message.includes('banned')) {
          alert(`Access Denied: ${err.message}`);
          onBackToDashboard();
          return;
        }
        setError(err.message || 'Failed to load room');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadRoom();

    // Connect WebSocket
    realtimeClient.connect(roomId);

    const unsubscribe = realtimeClient.subscribe((data) => {
      if (data.type === 'message:new') {
        const newMsg: ChatMessage = data.payload;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      } else if (data.type === 'message:deleted') {
        const { messageId } = data.payload;
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } else if (data.type === 'user:joined' || data.type === 'user:left') {
        if (data.payload?.participants) {
          setRoom((prev) => (prev ? { ...prev, participants: data.payload.participants } : prev));
        }
      } else if (data.type === 'user:kicked') {
        if (data.payload?.userId === currentUser.id) {
          alert(`You have been removed from "${room?.title || 'this room'}" by the room administrator.`);
          onBackToDashboard();
        } else if (data.payload?.participants) {
          setRoom((prev) => (prev ? { ...prev, participants: data.payload.participants } : prev));
        }
      } else if (data.type === 'user:banned') {
        if (data.payload?.userId === currentUser.id) {
          alert(`You have been banned from "${room?.title || 'this room'}" by the administrator. Reason: ${data.payload.reason}`);
          onBackToDashboard();
        } else {
          setRoom((prev) =>
            prev
              ? {
                  ...prev,
                  participants: data.payload.participants || prev.participants.filter((p) => p.userId !== data.payload.userId),
                  bannedUsers: data.payload.bannedUsers || prev.bannedUsers,
                }
              : prev
          );
        }
      } else if (data.type === 'user:unbanned') {
        setRoom((prev) =>
          prev
            ? {
                ...prev,
                bannedUsers: data.payload.bannedUsers,
              }
            : prev
        );
      } else if (data.type === 'typing:update') {
        const { userName, isTyping } = data.payload;
        if (isTyping && userName && userName !== currentUser.name) {
          setTypingUsers((prev) => (prev.includes(userName) ? prev : [...prev, userName]));
        } else if (!isTyping) {
          setTypingUsers((prev) => prev.filter((u) => u !== userName));
        }
      } else if (data.type === 'error' && data.payload?.code === 'USER_BANNED') {
        alert(data.payload.message);
        onBackToDashboard();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      realtimeClient.disconnect();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [roomId, currentUser.id]);

  // Scroll to bottom when new messages arrive (if not in search mode)
  useEffect(() => {
    if (!searchQuery) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, typingUsers.length]);

  // Load earlier historical messages as user scrolls up
  const handleLoadEarlier = async () => {
    if (isLoadingHistory || !hasMoreHistory || messages.length === 0 || !room) return;

    setIsLoadingHistory(true);
    const oldestTimestamp = messages[0]?.createdAt;

    try {
      const res = await api.getRoomMessages(room.id, {
        before: oldestTimestamp,
        limit: 15,
      });

      if (!res.messages || res.messages.length === 0) {
        setHasMoreHistory(false);
      } else {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newPrepends = res.messages.filter((m) => !existingIds.has(m.id));
          return [...newPrepends, ...prev];
        });
        setHasMoreHistory(res.hasMore);
      }
    } catch (err) {
      console.error('Failed to load earlier messages:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Search Matching & Navigation
  const matchedMessageIds = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const term = searchQuery.trim().toLowerCase();
    return messages
      .filter((m) => {
        const matchOrig = m.originalText.toLowerCase().includes(term);
        const matchTrans = Object.values(m.translations || {}).some((t) =>
          t.toLowerCase().includes(term)
        );
        const matchSender = m.senderName.toLowerCase().includes(term);
        return matchOrig || matchTrans || matchSender;
      })
      .map((m) => m.id);
  }, [messages, searchQuery]);

  const scrollToMatchedMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNextMatch = () => {
    if (matchedMessageIds.length === 0) return;
    const nextIdx = (activeMatchIndex + 1) % matchedMessageIds.length;
    setActiveMatchIndex(nextIdx);
    scrollToMatchedMessage(matchedMessageIds[nextIdx]);
  };

  const handlePrevMatch = () => {
    if (matchedMessageIds.length === 0) return;
    const prevIdx = (activeMatchIndex - 1 + matchedMessageIds.length) % matchedMessageIds.length;
    setActiveMatchIndex(prevIdx);
    scrollToMatchedMessage(matchedMessageIds[prevIdx]);
  };

  // Helper to highlight search term in text
  const renderHighlightedText = (text: string, term: string) => {
    if (!term.trim()) return text;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase() ? (
        <mark key={i} className="bg-amber-400 text-slate-950 font-bold px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Kick Participant
  const handleKickParticipant = async (participant: RoomParticipant) => {
    if (!room) return;
    const confirmKick = window.confirm(`Are you sure you want to kick "${participant.name}" from the room?`);
    if (!confirmKick) return;

    try {
      await api.kickUser(room.id, participant.userId, 'Kicked by room administrator');
      setParticipantMenuUserId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to kick participant');
    }
  };

  // Ban Participant
  const handleBanParticipant = async (participant: RoomParticipant) => {
    if (!room) return;
    const reason = window.prompt(`Enter ban reason for "${participant.name}":`, 'Violation of room guidelines');
    if (reason === null) return;

    try {
      await api.banUser(room.id, participant.userId, reason || 'Banned by room administrator');
      setParticipantMenuUserId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to ban participant');
    }
  };

  // Delete Message
  const handleDeleteMessage = async (messageId: string) => {
    if (!room) return;
    const confirmDelete = window.confirm('Are you sure you want to delete this message?');
    if (!confirmDelete) return;

    try {
      await api.deleteMessage(room.id, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete message');
    }
  };

  // Share room invite link
  const handleCopyInvite = () => {
    const inviteUrl = `${window.location.origin}/?room=${room?.inviteCode || roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Toggle voice dictation
  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === viewingLang);
        if (currentLangObj?.voiceCode) {
          recognitionRef.current.lang = currentLangObj.voiceCode;
        }
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  // Text to Speech playback
  const handlePlayTTS = (msgId: string, text: string, langCode: string) => {
    if (!('speechSynthesis' in window)) return;

    if (playingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setPlayingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
    if (langObj?.voiceCode) {
      utterance.lang = langObj.voiceCode;
    }

    utterance.onend = () => setPlayingMessageId(null);
    utterance.onerror = () => setPlayingMessageId(null);

    setPlayingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Send message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending || !room) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsSending(true);
    setError(null);

    // Stop typing notification
    realtimeClient.send({
      type: 'typing:update',
      payload: { roomId: room.id, userName: currentUser.name, isTyping: false },
    });

    try {
      const res = await api.sendMessage(room.id, messageText);
      if (res.quotaUsed !== undefined) {
        onUserQuotaUpdated({
          ...currentUser,
          wordsTranslatedThisMonth: res.quotaUsed,
        });
      }
    } catch (err: any) {
      if (err.message && err.message.includes('quota exceeded')) {
        setError('Monthly word translation quota reached! Please upgrade to Pro.');
      } else {
        setError(err.message || 'Failed to dispatch message');
      }
      setInputText(messageText);
    } finally {
      setIsSending(false);
    }
  };

  // Broadcast typing status
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (!room) return;

    realtimeClient.send({
      type: 'typing:update',
      payload: { roomId: room.id, userName: currentUser.name, isTyping: true },
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      realtimeClient.send({
        type: 'typing:update',
        payload: { roomId: room.id, userName: currentUser.name, isTyping: false },
      });
    }, 1800);
  };

  const activeLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === viewingLang) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-7xl mx-auto px-2 sm:px-6 py-2 sm:py-4">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border border-slate-800 bg-slate-900/80 mb-3 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Return to rooms"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>{room?.title || 'Multilingual Pulse Room'}</span>
                {isCreator && (
                  <span
                    title="You are the room administrator"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-semibold"
                  >
                    <Crown className="w-3 h-3" />
                    <span>Admin</span>
                  </span>
                )}
              </h1>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                <Circle className="w-2 h-2 fill-emerald-400" />
                <span className="font-mono hidden sm:inline">Live Sync</span>
              </div>
            </div>
            {room?.topic && <p className="text-xs text-slate-400 line-clamp-1">{room.topic}</p>}
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search Toggle */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              isSearchOpen
                ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
            }`}
            title="Search messages in room"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Moderation Queue Center for Room Creator / Admin */}
          {isCreator && (
            <button
              onClick={() => setIsModerationModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
              title="Open Moderation & Safety Center"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Moderation</span>
            </button>
          )}

          {/* Real-time Perspective Switcher */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 text-xs">
            <Languages className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400 hidden md:inline">Viewing as:</span>
            <select
              value={viewingLang}
              onChange={(e) => setViewingLang(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                  {lang.flag} {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>

          {/* Copy Invite Link */}
          <button
            onClick={handleCopyInvite}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
            title="Copy shareable invite link"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Share</span>
                <span className="font-mono text-[10px] text-indigo-300">
                  {room?.inviteCode || 'INVITE'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* In-Room Message Search Bar (Collapsible) */}
      {isSearchOpen && (
        <div className="p-3 mb-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 flex-1 max-w-lg">
            <Search className="w-4 h-4 text-indigo-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveMatchIndex(0);
              }}
              placeholder="Search across original text and translations..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {searchQuery ? `${matchedMessageIds.length} match${matchedMessageIds.length === 1 ? '' : 'es'}` : 'Type to search'}
            </span>

            {matchedMessageIds.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMatch}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Previous match"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleNextMatch}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Next match"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Room View: Chat Feed + Participants List */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Chat Feed Column */}
        <div className="flex-1 flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-inner">
          {/* Perspective Banner */}
          <div className="px-4 py-2 bg-indigo-950/40 border-b border-indigo-900/30 flex items-center justify-between text-xs text-indigo-200">
            <div className="flex items-center gap-2">
              <span className="text-base">{activeLangObj.flag}</span>
              <span>
                Rendering all messages in <strong>{activeLangObj.name}</strong> ({activeLangObj.nativeName})
              </span>
            </div>
            <span className="text-[11px] text-indigo-300/80 font-mono hidden sm:inline">
              Neural Edge Engine
            </span>
          </div>

          {/* Messages Scroll Area with Infinite History Pagination */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4"
          >
            {/* Load Earlier Messages Button */}
            {hasMoreHistory && (
              <div className="flex justify-center py-1">
                <button
                  onClick={handleLoadEarlier}
                  disabled={isLoadingHistory}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isLoadingHistory ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Retrieving earlier messages...</span>
                    </>
                  ) : (
                    <>
                      <History className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Load earlier messages</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                <RotateCcw className="w-6 h-6 animate-spin text-indigo-400" />
                <span className="text-xs">Connecting to room translation pipeline...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <Sparkles className="w-8 h-8 text-indigo-500/60 mb-2" />
                <h3 className="text-sm font-semibold text-slate-300">The Room is Quiet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Send the first message in any language. The engine will automatically translate it for every other participant.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                const sourceLangMeta = SUPPORTED_LANGUAGES.find((l) => l.code === msg.senderLanguage);
                const translatedText = msg.translations?.[viewingLang] || msg.originalText;
                const isDifferentFromOriginal = viewingLang !== msg.senderLanguage;
                const isExpanded = !!expandedOriginals[msg.id];
                const isMatched = matchedMessageIds.includes(msg.id);

                return (
                  <div
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    className={`flex items-start gap-3 max-w-2xl ${
                      isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    } ${isMatched ? 'p-1 rounded-xl ring-2 ring-amber-400/40' : ''}`}
                  >
                    {/* User Profile Avatar Next to Message */}
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0 shadow-sm mt-0.5">
                      {msg.senderAvatar ? (
                        <img
                          src={msg.senderAvatar}
                          alt={msg.senderName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        msg.senderName.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>

                    {/* Message Details */}
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} flex-1`}>
                      {/* Sender Name, Language and Timestamp Header */}
                      <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-200">
                          {isMe ? 'You' : msg.senderName}
                        </span>
                        {room?.createdBy === msg.senderId && (
                          <span
                            title="Room Creator"
                            className="inline-flex items-center text-[10px] text-amber-400"
                          >
                            <Crown className="w-2.5 h-2.5" />
                          </span>
                        )}
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <span>{sourceLangMeta?.flag || '🌐'}</span>
                          <span>{sourceLangMeta?.name || msg.senderLanguage}</span>
                        </span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="font-mono text-[10px] tabular-nums text-slate-500">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Bubble Container */}
                      <div
                        className={`relative group p-3.5 sm:p-4 rounded-2xl border text-sm leading-relaxed ${
                          isMe
                            ? 'bg-indigo-600 border-indigo-500 text-white rounded-tr-sm shadow-md shadow-indigo-600/20'
                            : 'bg-slate-800/95 border-slate-700/80 text-slate-100 rounded-tl-sm shadow-sm'
                        }`}
                      >
                        {/* Translated Content with Search Term Highlight */}
                        <p className="whitespace-pre-wrap break-words">
                          {renderHighlightedText(translatedText, searchQuery)}
                        </p>

                        {/* Original Text Dropdown */}
                        {isDifferentFromOriginal && (
                          <div className="mt-2 pt-2 border-t border-white/10 text-xs">
                            <button
                              onClick={() =>
                                setExpandedOriginals((prev) => ({
                                  ...prev,
                                  [msg.id]: !prev[msg.id],
                                }))
                              }
                              className="flex items-center gap-1 text-[11px] text-indigo-200/90 hover:text-white transition-colors cursor-pointer"
                            >
                              <span>Original ({sourceLangMeta?.name || msg.senderLanguage}):</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {isExpanded && (
                              <div className="mt-1.5 p-2 rounded bg-black/25 text-slate-200 text-xs italic font-serif">
                                "{renderHighlightedText(msg.originalText, searchQuery)}"
                              </div>
                            )}
                          </div>
                        )}

                        {/* Footer Controls */}
                        <div className="mt-2 pt-1 flex items-center justify-between text-[10px] text-indigo-200/70 border-t border-white/10 gap-3">
                          <span className="font-mono tabular-nums">{msg.wordCount} words</span>

                          <div className="flex items-center gap-3">
                            {/* TTS Button */}
                            <button
                              onClick={() => handlePlayTTS(msg.id, translatedText, viewingLang)}
                              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                              title="Listen with native pronunciation"
                            >
                              {playingMessageId === msg.id ? (
                                <>
                                  <VolumeX className="w-3.5 h-3.5 text-rose-300 animate-pulse" />
                                  <span className="text-rose-300 font-semibold">Stop</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3.5 h-3.5" />
                                  <span>Listen</span>
                                </>
                              )}
                            </button>

                            {/* Report Inappropriate Message (for other users' messages) */}
                            {!isMe && (
                              <button
                                onClick={() => setReportingMessage(msg)}
                                className="flex items-center gap-1 hover:text-rose-300 transition-colors cursor-pointer"
                                title="Report inappropriate message"
                              >
                                <Flag className="w-3 h-3" />
                                <span className="hidden sm:inline">Report</span>
                              </button>
                            )}

                            {/* Delete Message (for author or room creator) */}
                            {(isMe || isCreator) && (
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="flex items-center gap-1 hover:text-rose-300 transition-colors cursor-pointer"
                                title="Delete message"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Live Typing Status */}
            {typingUsers.length > 0 && (
              <div className="text-xs text-indigo-400/80 flex items-center gap-1.5 py-1 px-2 italic">
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing in their language...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quota Exceeded Alert */}
          {error && (
            <div className="m-3 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={onOpenPricing}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold transition-colors cursor-pointer shrink-0"
              >
                Upgrade to Pro
              </button>
            </div>
          )}

          {/* Chat Input Container */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 sm:p-4 bg-slate-950/80 border-t border-slate-800 flex items-end gap-2"
          >
            {/* Speech to text microphone */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isListening
                    ? 'border-rose-500 bg-rose-500/20 text-rose-400 animate-pulse'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
                }`}
                title={isListening ? 'Stop listening' : `Speak in ${activeLangObj.name} (Dictate)`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                rows={1}
                placeholder={`Type in ${currentUser.name ? currentUser.nativeLanguage.toUpperCase() : 'any language'}... (Enter to send)`}
                className="w-full resize-none py-2.5 px-3.5 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 max-h-32 transition-all"
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Column: Room Participants Sidebar (With Moderation Kick/Ban Controls) */}
        <div className="hidden lg:flex flex-col w-72 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between mb-3 text-xs text-slate-300 font-semibold">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Participants</span>
            </div>
            <span className="font-mono text-[11px] text-slate-500">
              {room?.participants.length || 0} active
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {room?.participants.map((p) => {
              const langMeta = SUPPORTED_LANGUAGES.find((l) => l.code === p.nativeLanguage);
              const isCurrent = p.userId === currentUser.id;
              const isRoomAdmin = room?.createdBy === p.userId;
              const canModerateParticipant = isCreator && !isCurrent && !isRoomAdmin;

              return (
                <div
                  key={p.userId}
                  className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <div className="relative shrink-0">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center font-semibold text-indigo-300 text-xs">
                          {p.avatarUrl ? (
                            <img
                              src={p.avatarUrl}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            p.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        {p.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-slate-950" />
                        )}
                      </div>

                      <div className="truncate">
                        <div className="font-medium text-slate-200 truncate flex items-center gap-1">
                          <span className="truncate">{p.name}</span>
                          {isRoomAdmin && (
                            <span title="Room Creator" className="inline-flex items-center text-amber-400">
                              <Crown className="w-3 h-3 shrink-0" />
                            </span>
                          )}
                          {isCurrent && <span className="text-[10px] text-indigo-400 shrink-0">(You)</span>}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <span>{langMeta?.flag}</span>
                          <span>{langMeta?.name || p.nativeLanguage}</span>
                        </div>
                      </div>
                    </div>

                    {/* Creator Moderation Actions Toggle */}
                    {canModerateParticipant && (
                      <button
                        onClick={() =>
                          setParticipantMenuUserId(
                            participantMenuUserId === p.userId ? null : p.userId
                          )
                        }
                        className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Moderate participant"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Creator Moderation Action Panel for this participant */}
                  {canModerateParticipant && participantMenuUserId === p.userId && (
                    <div className="pt-2 mt-1 border-t border-slate-800/80 flex items-center gap-2 animate-in fade-in duration-150">
                      <button
                        onClick={() => handleKickParticipant(p)}
                        className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Kick user from current session"
                      >
                        <UserX className="w-3 h-3 text-amber-400" />
                        <span>Kick</span>
                      </button>
                      <button
                        onClick={() => handleBanParticipant(p)}
                        className="flex-1 py-1 px-2 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[10px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Ban user permanently from rejoining"
                      >
                        <Ban className="w-3 h-3 text-rose-400" />
                        <span>Ban</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Banned Users Quick Summary (if any) */}
          {(room?.bannedUsers || []).length > 0 && (
            <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-rose-400">
                <Ban className="w-3 h-3" />
                <span>{room?.bannedUsers?.length} banned</span>
              </span>
              {isCreator && (
                <button
                  onClick={() => setIsModerationModalOpen(true)}
                  className="text-indigo-400 hover:underline cursor-pointer"
                >
                  Manage
                </button>
              )}
            </div>
          )}

          {/* Room invite card at bottom */}
          <div className="pt-3 mt-3 border-t border-slate-800 text-xs">
            <span className="block text-[11px] font-medium text-slate-400 mb-1">Invite Code:</span>
            <div className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800 font-mono text-[11px] text-indigo-300">
              <span>{room?.inviteCode}</span>
              <button
                onClick={handleCopyInvite}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message Reporting Modal */}
      <ReportMessageModal
        message={reportingMessage}
        roomId={roomId}
        isOpen={!!reportingMessage}
        onClose={() => setReportingMessage(null)}
        onReportSubmitted={() => {
          setReportingMessage(null);
        }}
      />

      {/* Moderation Queue & Banned Management Modal */}
      {room && (
        <ModerationQueueModal
          room={room}
          isOpen={isModerationModalOpen}
          onClose={() => setIsModerationModalOpen(false)}
          onMessageDeleted={(delId) => setMessages((prev) => prev.filter((m) => m.id !== delId))}
          onUserBannedOrKicked={() => {
            api.getRoom(roomId).then((res) => {
              setRoom(res.room);
            });
          }}
        />
      )}
    </div>
  );
};
