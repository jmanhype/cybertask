import { api } from './api';
import { Project, ApiResponse, PaginatedResponse } from '../types';

export const projectService = {
  async getProjects(): Promise<ApiResponse<Project[]>> {
    const response = await api.get('/projects');
    return response.data;
  },

  async getProject(id: string): Promise<ApiResponse<Project>> {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Project>> {
    const response = await api.post('/projects', projectData);
    return response.data;
  },

  async updateProject(id: string, projectData: Partial<Project>): Promise<ApiResponse<Project>> {
    const response = await api.put(`/projects/${id}`, projectData);
    return response.data;
  },

  async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },

  async addMember(projectId: string, userId: string): Promise<ApiResponse<Project>> {
    const response = await api.post(`/projects/${projectId}/members`, { userId });
    return response.data;
  },

  async removeMember(projectId: string, userId: string): Promise<ApiResponse<Project>> {
    const response = await api.delete(`/projects/${projectId}/members/${userId}`);
    return response.data;
  },

  async getProjectMembers(projectId: string): Promise<ApiResponse<any[]>> {
    const response = await api.get(`/projects/${projectId}/members`);
    return response.data;
  },
};