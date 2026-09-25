import { User, Room, ChatMessage } from '../types';

const TOKEN_KEY = 'linguapulse_session_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.error('Failed to save token to localStorage', err);
  }
}

export function removeStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error('Failed to remove token', err);
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error ${response.status}`);
  }

  return data;
}

export const api = {
  async sendOtp(email: string): Promise<{ success: boolean; message: string; previewOtp?: string }> {
    return fetchWithAuth('/api/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyOtp(email: string, otp: string): Promise<{ success: boolean; token: string; user: User; isNewUser: boolean }> {
    const res = await fetchWithAuth('/api/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
    if (res.token) {
      setStoredToken(res.token);
    }
    return res;
  },

  async getCurrentUser(): Promise<{ user: User }> {
    return fetchWithAuth('/api/auth/me');
  },

  async updateProfile(updates: Partial<User>): Promise<{ user: User }> {
    return fetchWithAuth('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async getRooms(): Promise<{ rooms: Room[] }> {
    return fetchWithAuth('/api/rooms');
  },

  async createRoom(data: { title: string; topic?: string }): Promise<{ room: Room }> {
    return fetchWithAuth('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getRoom(id: string): Promise<{ room: Room; messages: ChatMessage[] }> {
    return fetchWithAuth(`/api/rooms/${id}`);
  },

  async joinRoom(id: string): Promise<{ room: Room }> {
    return fetchWithAuth(`/api/rooms/${id}/join`, {
      method: 'POST',
    });
  },

  async sendMessage(roomId: string, text: string): Promise<{ message: ChatMessage; quotaUsed: number; quotaRemaining: number }> {
    return fetchWithAuth(`/api/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  async upgradeToPro(): Promise<{ success: boolean; user: User; message: string }> {
    return fetchWithAuth('/api/billing/upgrade', {
      method: 'POST',
    });
  },

  // Message History & Search
  async getRoomMessages(
    roomId: string,
    params?: { before?: string; limit?: number; search?: string }
  ): Promise<{ messages: ChatMessage[]; hasMore: boolean; totalCount: number }> {
    const query = new URLSearchParams();
    if (params?.before) query.set('before', params.before);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchWithAuth(`/api/rooms/${roomId}/messages${qs}`);
  },

  // Moderation: Kick, Ban, Unban
  async kickUser(roomId: string, userId: string, reason?: string): Promise<{ success: boolean; room: Room }> {
    return fetchWithAuth(`/api/rooms/${roomId}/participants/${userId}/kick`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async banUser(roomId: string, userId: string, reason?: string): Promise<{ success: boolean; room: Room }> {
    return fetchWithAuth(`/api/rooms/${roomId}/participants/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async unbanUser(roomId: string, userId: string): Promise<{ success: boolean; room: Room }> {
    return fetchWithAuth(`/api/rooms/${roomId}/banned/${userId}/unban`, {
      method: 'POST',
    });
  },

  // Moderation: Message Reporting & Review
  async reportMessage(
    roomId: string,
    messageId: string,
    data: { reason: string; details?: string }
  ): Promise<{ success: boolean; report: any }> {
    return fetchWithAuth(`/api/rooms/${roomId}/messages/${messageId}/report`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getReports(roomId?: string): Promise<{ reports: any[] }> {
    const qs = roomId ? `?roomId=${roomId}` : '';
    return fetchWithAuth(`/api/reports${qs}`);
  },

  async resolveReport(
    reportId: string,
    action: 'dismiss' | 'delete_message' | 'kick_user' | 'ban_user'
  ): Promise<{ success: boolean; message: string }> {
    return fetchWithAuth(`/api/reports/${reportId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },

  async deleteMessage(roomId: string, messageId: string): Promise<{ success: boolean }> {
    return fetchWithAuth(`/api/rooms/${roomId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  },
};

