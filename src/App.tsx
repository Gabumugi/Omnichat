/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Room } from './types';
import { api, getStoredToken, removeStoredToken } from './lib/api';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { ChatRoomView } from './components/ChatRoomView';
import { OnboardingModal } from './components/OnboardingModal';
import { UserProfileModal } from './components/UserProfileModal';
import { CreateRoomModal } from './components/CreateRoomModal';
import { PaywallModal } from './components/PaywallModal';
import { ArchitectureDocsModal } from './components/ArchitectureDocsModal';
import { RotateCcw } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'room' | 'login' | 'docs'>('dashboard');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Modals state
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  // Initialize Auth & Check Deep Links
  useEffect(() => {
    async function init() {
      setIsLoadingAuth(true);

      // Check URL query parameters for invite links (e.g., ?room=PULSE-TECH-2026)
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        setActiveRoomId(roomParam);
      }

      const token = getStoredToken();
      if (token) {
        try {
          const res = await api.getCurrentUser();
          setCurrentUser(res.user);
          if (roomParam) {
            setActiveView('room');
          } else {
            setActiveView('dashboard');
          }
        } catch (err) {
          console.warn('Session expired or invalid, clearing token');
          removeStoredToken();
          setCurrentUser(null);
        }
      }

      // Fetch active rooms
      try {
        const roomsRes = await api.getRooms();
        setRooms(roomsRes.rooms || []);
      } catch (err) {
        console.error('Failed to load initial rooms:', err);
      } finally {
        setIsLoadingAuth(false);
      }
    }

    init();
  }, []);

  // Handle Login Success
  const handleLoginSuccess = (user: User, isNewUser: boolean) => {
    setCurrentUser(user);
    if (isNewUser) {
      setIsOnboardingOpen(true);
    }
    if (activeRoomId) {
      setActiveView('room');
    } else {
      setActiveView('dashboard');
    }
    // Refresh rooms list
    api.getRooms().then((res) => setRooms(res.rooms || []));
  };

  // Handle Logout
  const handleLogout = () => {
    removeStoredToken();
    setCurrentUser(null);
    setActiveRoomId(null);
    setActiveView('login');
  };

  // Select a room from dashboard
  const handleSelectRoom = (roomId: string) => {
    if (!currentUser) {
      setActiveRoomId(roomId);
      setActiveView('login');
      return;
    }
    setActiveRoomId(roomId);
    setActiveView('room');
  };

  // Join by code from dashboard
  const handleJoinByCode = async (code: string) => {
    try {
      const res = await api.getRoom(code);
      if (res.room) {
        if (!currentUser) {
          setActiveRoomId(res.room.id);
          setActiveView('login');
          return;
        }
        setActiveRoomId(res.room.id);
        setActiveView('room');
      }
    } catch (err: any) {
      alert(err.message || 'Room not found with that code');
    }
  };

  // Room Created handler
  const handleRoomCreated = (newRoom: Room) => {
    setRooms((prev) => [newRoom, ...prev]);
    setActiveRoomId(newRoom.id);
    setActiveView('room');
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <RotateCcw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <span className="text-sm font-medium">Initializing LinguaPulse...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 3-Zone Top Bar */}
      <Navbar
        currentUser={currentUser}
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenPricing={() => setIsPricingOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
        onOpenLanguageSelector={() => setIsOnboardingOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {activeView === 'login' || !currentUser ? (
          <LoginView
            onSuccess={handleLoginSuccess}
            onCancel={currentUser ? () => setActiveView('dashboard') : undefined}
          />
        ) : activeView === 'room' && activeRoomId ? (
          <ChatRoomView
            currentUser={currentUser}
            roomId={activeRoomId}
            onBackToDashboard={() => {
              setActiveRoomId(null);
              setActiveView('dashboard');
              // Refresh room list
              api.getRooms().then((res) => setRooms(res.rooms || []));
            }}
            onOpenPricing={() => setIsPricingOpen(true)}
            onUserQuotaUpdated={(updated) => setCurrentUser(updated)}
          />
        ) : (
          <DashboardView
            user={currentUser}
            rooms={rooms}
            onSelectRoom={handleSelectRoom}
            onOpenCreateRoom={() => setIsCreateRoomOpen(true)}
            onJoinByCode={handleJoinByCode}
            onOpenPricing={() => setIsPricingOpen(true)}
          />
        )}
      </main>

      {/* Modals */}
      {currentUser && (
        <UserProfileModal
          user={currentUser}
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          onProfileUpdated={(updatedUser) => {
            setCurrentUser(updatedUser);
          }}
        />
      )}

      {currentUser && (
        <OnboardingModal
          user={currentUser}
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          onComplete={(updatedUser) => {
            setCurrentUser(updatedUser);
            setIsOnboardingOpen(false);
          }}
        />
      )}

      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
        onRoomCreated={handleRoomCreated}
      />

      {currentUser && (
        <PaywallModal
          user={currentUser}
          isOpen={isPricingOpen}
          onClose={() => setIsPricingOpen(false)}
          onUpgraded={(updatedUser) => setCurrentUser(updatedUser)}
        />
      )}

      <ArchitectureDocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />
    </div>
  );
}
