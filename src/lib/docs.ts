/**
 * Project Structure and Documentation for LinguaPulse
 */

export const PROJECT_STRUCTURE_TREE = `
linguapulse/
├── .env.example                     # Environment variables specification
├── index.html                       # Entry HTML with meta tags & Google fonts
├── metadata.json                    # Application metadata & capabilities
├── package.json                     # Dependencies and scripts (Express + Vite + WS)
├── tsconfig.json                    # TypeScript compiler configuration
├── vite.config.ts                   # Tailwind CSS v4 & React bundler config
│
├── server.ts                        # Full-stack Node.js Express & WebSocket server
│   ├── /api/auth/otp/send           # OTP token generation & email dispatch
│   ├── /api/auth/otp/verify         # OTP verification & session issuing
│   ├── /api/auth/me                 # Current user session & quota check
│   ├── /api/auth/profile            # Native language & profile update
│   ├── /api/rooms                   # Room list & room creation
│   ├── /api/rooms/:id               # Room details & participant registry
│   ├── /api/rooms/:id/join          # Join room with participant language
│   ├── /api/rooms/:id/messages      # Multilingual translation & broadcast
│   ├── /api/billing/upgrade         # Word quota monetization & Stripe handler
│   └── /ws                          # WebSocket Server for real-time room sync
│
├── src/
│   ├── main.tsx                     # React root mount
│   ├── index.css                    # Tailwind CSS v4 entry
│   ├── App.tsx                      # Top-level view router & state provider
│   │
│   ├── types/
│   │   └── index.ts                 # Type definitions (User, Room, Message, Moderation, etc.)
│   │
│   ├── lib/
│   │   ├── constants.ts             # Supported languages, quotas, pricing tiers
│   │   ├── api.ts                   # Fetch wrapper with bearer token & error handling
│   │   ├── websocket.ts             # Real-time WebSocket connection manager
│   │   ├── sqlSchema.ts             # Complete Supabase PostgreSQL DDL script
│   │   └── docs.ts                  # Architecture, structure tree & deployment guide
│   │
│   ├── assets/
│   │   └── images/                  # High-fidelity visual assets & avatars
│   │
│   └── components/
│       ├── Navbar.tsx               # 3-Zone Top Bar with Word Quota & Profile Access
│       ├── LoginView.tsx            # Frictionless Email + 6-digit OTP auth view
│       ├── UserProfileModal.tsx     # Display Name, Custom Avatar Upload, & Bio
│       ├── OnboardingModal.tsx      # Native Language selection modal
│       ├── DashboardView.tsx        # Active rooms list, search & join code input
│       ├── CreateRoomModal.tsx      # Modal to launch new multilingual room
│       ├── ChatRoomView.tsx         # The Core Real-Time Cross-Language Chat Room
│       │   ├── Message Search Bar   # In-room keyword search across original & translations
│       │   ├── History Pagination   # Infinite scroll / load earlier messages
│       │   └── Participant Actions  # Room creator kick & permanent ban controls
│       ├── ReportMessageModal.tsx   # Inappropriate message reporting dialog
│       ├── ModerationQueueModal.tsx # Creator & admin review queue and unban controls
│       ├── PaywallModal.tsx         # Word quota meter & Pro subscription modal
│       └── ArchitectureDocsModal.tsx # Interactive docs, SQL schema, & deploy guide
`;

export const DEPLOYMENT_GUIDE_MARKDOWN = `# LinguaPulse Deployment & Setup Guide

## 1. Prerequisites
- Node.js 20+ installed
- A Google AI Studio API key (for Gemini neural translation)
- A Supabase project (for production PostgreSQL database and auth)
- (Optional) Resend or SendGrid API key for production email delivery
- (Optional) Stripe account for subscription payments

## 2. Environment Variables (.env)
Copy \`.env.example\` to \`.env\` and provide your production credentials:

\`\`\`bash
cp .env.example .env
\`\`\`

## 3. Database Initialization (Supabase PostgreSQL)
1. Go to your Supabase project dashboard -> **SQL Editor**.
2. Open the **SQL Schema** tab in LinguaPulse or copy \`src/lib/sqlSchema.ts\`.
3. Paste and run the entire script to create:
   - \`users\`, \`otp_tokens\`, \`rooms\`, \`room_participants\`, \`messages\`
   - Row Level Security (RLS) policies
   - Realtime publication subscriptions
   - Indexes on invite codes, emails, and room participants

## 4. Local Development
Run the combined Express + Vite + WebSocket development server:
\`\`\`bash
npm run dev
\`\`\`
The application will be accessible at \`http://localhost:3000\`.

## 5. Production Build & Deployment (Vercel / Cloud Run / VPS)
\`\`\`bash
npm run build
npm run start
\`\`\`
On platforms like Google Cloud Run or Docker:
- The server will listen on \`PORT=3000\` (or \`process.env.PORT\`).
- WebSocket connections are routed through \`/ws\`.
`;
