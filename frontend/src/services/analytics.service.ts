import { analyticsApiClient } from './api-client';
import { SurveyAnalytics } from '../types';

export const analyticsService = {
  // Get analytics for a survey
  async getSurveyAnalytics(surveyId: string): Promise<SurveyAnalytics> {
    const response = await analyticsApiClient.get<SurveyAnalytics>(
      `/analytics/survey/${surveyId}`
    );
    return response.data;
  },

  // Get analytics summary
  async getAnalyticsSummary(): Promise<{
    totalSurveys: number;
    totalResponses: number;
    averageResponseRate: number;
    activeSurveys: number;
  }> {
    const response = await analyticsApiClient.get('/analytics/summary');
    return response.data;
  },

  // Export analytics as PDF
  async exportAnalytics(surveyId: string): Promise<Blob> {
    const response = await analyticsApiClient.get(
      `/analytics/survey/${surveyId}/export`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },
};
