import { surveyApiClient, retryRequest } from './api-client';
import {
  Survey,
  CreateSurveyRequest,
  UpdateSurveyRequest,
  PaginatedResponse,
  SurveyFilters,
  SortOptions,
  PaginationOptions,
} from '../types';

export const surveyService = {
  // Get all surveys with filters, sorting, and pagination
  async getSurveys(
    filters?: SurveyFilters,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<Survey>> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.status) params.append('status', filters.status.join(','));
      if (filters.createdBy) params.append('createdBy', filters.createdBy);
      if (filters.search) params.append('search', filters.search);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
    }

    if (sort) {
      params.append('sortField', sort.field);
      params.append('sortOrder', sort.order);
    }

    if (pagination) {
      params.append('page', pagination.page.toString());
      params.append('pageSize', pagination.pageSize.toString());
    }

    const response = await surveyApiClient.get<PaginatedResponse<Survey>>(
      `/surveys?${params.toString()}`
    );
    return response.data;
  },

  // Get survey by ID
  async getSurveyById(id: string): Promise<Survey> {
    const response = await surveyApiClient.get<Survey>(`/surveys/${id}`);
    return response.data;
  },

  // Create new survey
  async createSurvey(data: CreateSurveyRequest): Promise<Survey> {
    const response = await retryRequest(() =>
      surveyApiClient.post<Survey>('/surveys', data)
    );
    return response.data;
  },

  // Update survey
  async updateSurvey(id: string, data: UpdateSurveyRequest): Promise<Survey> {
    const response = await retryRequest(() =>
      surveyApiClient.patch<Survey>(`/surveys/${id}`, data)
    );
    return response.data;
  },

  // Delete survey
  async deleteSurvey(id: string): Promise<void> {
    await surveyApiClient.delete(`/surveys/${id}`);
  },

  // Publish survey
  async publishSurvey(id: string): Promise<Survey> {
    const response = await surveyApiClient.post<Survey>(`/surveys/${id}/publish`);
    return response.data;
  },

  // Close survey
  async closeSurvey(id: string): Promise<Survey> {
    const response = await surveyApiClient.post<Survey>(`/surveys/${id}/close`);
    return response.data;
  },

  // Archive survey
  async archiveSurvey(id: string): Promise<Survey> {
    const response = await surveyApiClient.post<Survey>(`/surveys/${id}/archive`);
    return response.data;
  },

  // Duplicate survey
  async duplicateSurvey(id: string, title: string): Promise<Survey> {
    const response = await surveyApiClient.post<Survey>(`/surveys/${id}/duplicate`, {
      title,
    });
    return response.data;
  },

  // Get my surveys
  async getMySurveys(
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<Survey>> {
    const params = new URLSearchParams();
    if (pagination) {
      params.append('page', pagination.page.toString());
      params.append('pageSize', pagination.pageSize.toString());
    }

    const response = await surveyApiClient.get<PaginatedResponse<Survey>>(
      `/surveys/my?${params.toString()}`
    );
    return response.data;
  },
};
