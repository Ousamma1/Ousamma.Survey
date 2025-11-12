import { responseApiClient, retryRequest } from './api-client';
import {
  SurveyResponse,
  SubmitResponseRequest,
  PaginatedResponse,
  PaginationOptions,
} from '../types';

export const responseService = {
  // Submit survey response
  async submitResponse(data: SubmitResponseRequest): Promise<SurveyResponse> {
    const response = await retryRequest(() =>
      responseApiClient.post<SurveyResponse>('/responses', data)
    );
    return response.data;
  },

  // Get responses for a survey
  async getResponsesBySurvey(
    surveyId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<SurveyResponse>> {
    const params = new URLSearchParams();
    if (pagination) {
      params.append('page', pagination.page.toString());
      params.append('pageSize', pagination.pageSize.toString());
    }

    const response = await responseApiClient.get<PaginatedResponse<SurveyResponse>>(
      `/responses/survey/${surveyId}?${params.toString()}`
    );
    return response.data;
  },

  // Get response by ID
  async getResponseById(id: string): Promise<SurveyResponse> {
    const response = await responseApiClient.get<SurveyResponse>(`/responses/${id}`);
    return response.data;
  },

  // Delete response
  async deleteResponse(id: string): Promise<void> {
    await responseApiClient.delete(`/responses/${id}`);
  },

  // Export responses as CSV
  async exportResponses(surveyId: string): Promise<Blob> {
    const response = await responseApiClient.get(
      `/responses/survey/${surveyId}/export`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },

  // Get my responses
  async getMyResponses(
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<SurveyResponse>> {
    const params = new URLSearchParams();
    if (pagination) {
      params.append('page', pagination.page.toString());
      params.append('pageSize', pagination.pageSize.toString());
    }

    const response = await responseApiClient.get<PaginatedResponse<SurveyResponse>>(
      `/responses/my?${params.toString()}`
    );
    return response.data;
  },
};
