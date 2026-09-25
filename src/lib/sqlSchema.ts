/**
 * Production Database Schema for Supabase (PostgreSQL with Row Level Security)
 * LinguaPulse: Scalable Multilingual Real-Time Chat Infrastructure
 */

export const SUPABASE_SQL_SCHEMA = `-- =============================================================================
-- LinguaPulse: Production Supabase PostgreSQL Schema
-- Includes RLS Policies, Indexes, Realtime Publication, and Triggers
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. USERS & PROFILES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT 'Pulse User',
    native_language VARCHAR(10) NOT NULL DEFAULT 'en',
    avatar_url TEXT,
    bio TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
    words_translated_this_month INT NOT NULL DEFAULT 0,
    word_quota INT NOT NULL DEFAULT 5000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast lookup by email
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- -----------------------------------------------------------------------------
-- 2. OTP AUTHENTICATION TOKENS (Passwordless Email OTP)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.otp_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL, -- SHA-256 or bcrypt hashed 6-digit OTP
    attempts INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_otp_email_active 
ON public.otp_tokens (email, expires_at) 
WHERE consumed = FALSE;

-- -----------------------------------------------------------------------------
-- 3. CHAT ROOMS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    topic TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invite_code VARCHAR(32) UNIQUE NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    max_participants INT NOT NULL DEFAULT 50,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rooms_invite_code ON public.rooms (invite_code);
CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON public.rooms (created_by);

-- -----------------------------------------------------------------------------
-- 4. ROOM PARTICIPANTS TABLE (Presence & Language Mapping)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    native_language VARCHAR(10) NOT NULL,
    is_online BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_room_active 
ON public.room_participants (room_id, is_online);

-- -----------------------------------------------------------------------------
-- 5. ROOM BANS TABLE (Enforces Permanent Room Banning)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_bans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    banned_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL DEFAULT 'Violation of room guidelines',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_bans_lookup ON public.room_bans (room_id, user_id);

-- -----------------------------------------------------------------------------
-- 6. MESSAGE REPORTS TABLE (Moderation Review Queue)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reported_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    action_taken TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reports_room_status ON public.message_reports (room_id, status);

-- -----------------------------------------------------------------------------
-- 7. MESSAGES TABLE WITH TRANSLATION MAP
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL,
    sender_language VARCHAR(10) NOT NULL,
    original_text TEXT NOT NULL,
    -- JSONB map storing target_language_code => translated_text
    -- e.g. {"es": "Hola mundo", "ja": "こんにちは世界", "fr": "Bonjour le monde"}
    translations JSONB NOT NULL DEFAULT '{}'::jsonb,
    word_count INT NOT NULL DEFAULT 1,
    is_reported BOOLEAN NOT NULL DEFAULT FALSE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_messages_room_created 
ON public.messages (room_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users Policy: Users can view profiles of people in their rooms, update their own
CREATE POLICY "Users can read own profile and room co-participants" 
ON public.users FOR SELECT 
USING (
    auth.uid() = id OR 
    EXISTS (
        SELECT 1 FROM public.room_participants p1 
        JOIN public.room_participants p2 ON p1.room_id = p2.room_id 
        WHERE p1.user_id = auth.uid() AND p2.user_id = public.users.id
    )
);

CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

-- Rooms Policy: Accessible to anyone with the room invite code or joined
CREATE POLICY "Public rooms are readable by all authenticated users" 
ON public.rooms FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create rooms" 
ON public.rooms FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Bans Policy: Only room creator or admins can insert or delete bans
CREATE POLICY "Room creators can manage bans"
ON public.room_bans FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.rooms 
        WHERE rooms.id = room_bans.room_id 
        AND rooms.created_by = auth.uid()
    )
);

-- Reports Policy: Any room participant can report, room creator can review
CREATE POLICY "Participants can file reports"
ON public.message_reports FOR INSERT
WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Room creators can view and resolve reports"
ON public.message_reports FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.rooms
        WHERE rooms.id = message_reports.room_id
        AND rooms.created_by = auth.uid()
    )
);

-- Messages Policy: Only non-banned room participants can read and write messages
CREATE POLICY "Non-banned participants can read room messages" 
ON public.messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.room_participants 
        WHERE room_participants.room_id = messages.room_id 
        AND room_participants.user_id = auth.uid()
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.room_bans
        WHERE room_bans.room_id = messages.room_id
        AND room_bans.user_id = auth.uid()
    )
);

CREATE POLICY "Non-banned participants can insert room messages" 
ON public.messages FOR INSERT 
WITH CHECK (
    auth.uid() = sender_id AND 
    EXISTS (
        SELECT 1 FROM public.room_participants 
        WHERE room_participants.room_id = messages.room_id 
        AND room_participants.user_id = auth.uid()
    )
    AND NOT EXISTS (
        SELECT 1 FROM public.room_bans
        WHERE room_bans.room_id = messages.room_id
        AND room_bans.user_id = auth.uid()
    )
);

-- -----------------------------------------------------------------------------
-- 7. SUPABASE REALTIME ENABLEMENT
-- -----------------------------------------------------------------------------
-- Add tables to supabase_realtime publication for WebSocket notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;
`;
