import { api } from './api';
import { Task, CreateTaskData, UpdateTaskData, ApiResponse, PaginatedResponse, DashboardStats } from '../types';

export const taskService = {
  async getTasks(projectId?: string): Promise<ApiResponse<Task[]>> {
    const url = projectId ? `/tasks?projectId=${projectId}` : '/tasks';
    const response = await api.get(url);
    return response.data;
  },

  async getTask(id: string): Promise<ApiResponse<Task>> {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  async createTask(taskData: CreateTaskData): Promise<ApiResponse<Task>> {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },

  async updateTask(id: string, taskData: UpdateTaskData): Promise<ApiResponse<Task>> {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data;
  },

  async deleteTask(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`);
  },

  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  async getTasksByStatus(status: string, projectId?: string): Promise<ApiResponse<Task[]>> {
    const params = new URLSearchParams({ status });
    if (projectId) params.append('projectId', projectId);
    
    const response = await api.get(`/tasks?${params.toString()}`);
    return response.data;
  },

  async assignTask(taskId: string, assigneeId: string): Promise<ApiResponse<Task>> {
    const response = await api.patch(`/tasks/${taskId}/assign`, { assigneeId });
    return response.data;
  },

  async updateTaskStatus(taskId: string, status: string): Promise<ApiResponse<Task>> {
    const response = await api.patch(`/tasks/${taskId}/status`, { status });
    return response.data;
  },
};