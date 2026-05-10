import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return apiClient(original);
        } catch {
          useAuthStore.getState().logout();
        }
      }
    }
    return Promise.reject(error);
  },
);

// Auth
export const authApi = {
  register: (data: any) => apiClient.post('/auth/register', data),
  login: (data: any) => apiClient.post<any>('/auth/login', data),
  logout: (refreshToken?: string) => apiClient.post('/auth/logout', { refreshToken }),
  refresh: (refreshToken: string) => apiClient.post('/auth/refresh', { refreshToken }),
};

// Users
export const usersApi = {
  getMe: () => apiClient.get<any>('/users/me'),
  updateMe: (data: any) => apiClient.put('/users/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.patch('/users/me/password', data),
  getEventsHistory: (params?: any) => apiClient.get('/users/me/events-history', { params }),
};

// Events
export const eventsApi = {
  getAll: (params?: any) => apiClient.get<any>('/events', { params }),
  getOne: (id: string) => apiClient.get<any>(`/events/${id}`),
  create: (data: any) => apiClient.post('/events', data),
  update: (id: string, data: any) => apiClient.put(`/events/${id}`, data),
  cancel: (id: string) => apiClient.patch(`/events/${id}/cancel`, {}),
  delete: (id: string) => apiClient.delete(`/events/${id}`),
  getMyEvents: (params?: any) => apiClient.get('/events/my', { params }),
};

// Registration
export const registrationApi = {
  register: (eventId: string) => apiClient.post(`/events/${eventId}/register`),
  cancel: (eventId: string) => apiClient.delete(`/events/${eventId}/register`),
  getAttendees: (eventId: string, params?: any) =>
    apiClient.get(`/events/${eventId}/attendees`, { params }),
  getExportUrl: (eventId: string) => `${API_BASE}/events/${eventId}/attendees/export`,
};

// Attendance / QR
export const attendanceApi = {
  getStudentQr: (registrationId: string) =>
    apiClient.get<{ qrDataUrl: string }>(`/attendance/qr/${registrationId}`),
  scanQr: (token: string) =>
    apiClient.post<{
      alreadyCheckedIn: boolean;
      checkedInAt: string | null;
      participant: { name: string; group: string; institute: string };
    }>('/attendance/scan', { token }),
};

// Admin
export const adminApi = {
  getModerationQueue: (params?: any) => apiClient.get('/admin/moderation', { params }),
  moderateEvent: (id: string, action: 'approve' | 'reject', rejectionReason?: string) =>
    apiClient.put(`/admin/events/${id}/moderate`, { action, rejectionReason }),
  getUsers: (params?: any) => apiClient.get('/admin/users', { params }),
  updateUser: (id: string, data: any) => apiClient.put(`/admin/users/${id}`, data),
  createDean: (data: { login: string; email: string; password: string; fullName?: string }) =>
    apiClient.post('/admin/users/dean', data),
  getAnalytics: (params?: any) => apiClient.get('/admin/analytics', { params }),
};

// University administration
export const universityApi = {
  getDashboard: (instituteId?: string) =>
    apiClient.get<any>('/university/dashboard', { params: { instituteId } }),
  getEvents: (params?: any) =>
    apiClient.get<any>('/university/events', { params }),
  getAttendees: (eventId: string, params?: any) =>
    apiClient.get<any>(`/university/events/${eventId}/attendees`, { params }),
  getExportUrl: (eventId: string) =>
    `${API_BASE}/university/events/${eventId}/attendees/export`,
};

// References
export const referencesApi = {
  getInstitutes: () => apiClient.get<any>('/references/institutes'),
  getEventTypes: () => apiClient.get<any>('/references/event-types'),
};
