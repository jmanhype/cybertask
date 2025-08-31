import { api } from './api';
import { Notification, ApiResponse, NotificationState } from '../types';

export const notificationService = {
  async getNotifications(): Promise<ApiResponse<NotificationState>> {
    const response = await api.get('/notifications');
    return response.data;
  },

  async markAsRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await api.patch('/notifications/read-all');
  },

  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<ApiResponse<Notification>> {
    const response = await api.post('/notifications', notification);
    return response.data;
  },
};