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
  getEventsHistory: (params?: any) => apiClient.get('/users/me/events-history', { params }),
};

// Events
export const eventsApi = {
  getAll: (params?: any) => apiClient.get<any>('/events', { params }),
  getOne: (id: string) => apiClient.get<any>(`/events/${id}`),
  create: (data: any) => apiClient.post('/events', data),
  update: (id: string, data: any) => apiClient.put(`/events/${id}`, data),
  delete: (id: string) => apiClient.delete(`/events/${id}`),
  getMyEvents: (params?: any) => apiClient.get('/events/my', { params }),
};

// Registration
export const registrationApi = {
  register: (eventId: string) => apiClient.post(`/events/${eventId}/register`),
  cancel: (eventId: string) => apiClient.delete(`/events/${eventId}/register`),
  getAttendees: (eventId: string, params?: any) =>
    apiClient.get(`/events/${eventId}/attendees`, { params }),
};

// Attendance
export const attendanceApi = {
  generateQr: (eventId: string) => apiClient.post('/attendance/generate-qr', { eventId }),
  checkIn: (eventId: string, qrToken: string) =>
    apiClient.post('/attendance/check', { eventId, qrToken }),
};

// Admin
export const adminApi = {
  getModerationQueue: (params?: any) => apiClient.get('/admin/moderation', { params }),
  moderateEvent: (id: string, action: 'approve' | 'reject', rejectionReason?: string) =>
    apiClient.put(`/admin/events/${id}/moderate`, { action, rejectionReason }),
  getUsers: (params?: any) => apiClient.get('/admin/users', { params }),
  updateUser: (id: string, data: any) => apiClient.put(`/admin/users/${id}`, data),
  getAnalytics: (params?: any) => apiClient.get('/admin/analytics', { params }),
};

// References
export const referencesApi = {
  getInstitutes: () => apiClient.get<any>('/references/institutes'),
  getEventTypes: () => apiClient.get<any>('/references/event-types'),
};
