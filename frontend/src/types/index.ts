// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'creator' | 'respondent';
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: 'creator' | 'respondent';
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// Survey Types
export interface Survey {
  id: string;
  title: string;
  description?: string;
  surveyJson: any; // SurveyJS JSON schema
  status: 'draft' | 'published' | 'closed' | 'archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  settings?: SurveySettings;
}

export interface SurveySettings {
  isAnonymous: boolean;
  allowMultipleResponses: boolean;
  showProgressBar: boolean;
  showQuestionNumbers: boolean;
  requiredText?: string;
  completeText?: string;
  startSurveyText?: string;
}

export interface CreateSurveyRequest {
  title: string;
  description?: string;
  surveyJson: any;
  settings?: SurveySettings;
}

export interface UpdateSurveyRequest {
  title?: string;
  description?: string;
  surveyJson?: any;
  status?: Survey['status'];
  settings?: SurveySettings;
}

// Response Types
export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentId?: string;
  responseData: Record<string, any>;
  completedAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SubmitResponseRequest {
  surveyId: string;
  responseData: Record<string, any>;
}

// Analytics Types
export interface SurveyAnalytics {
  surveyId: string;
  totalResponses: number;
  completionRate: number;
  averageTimeToComplete: number;
  questionStats: QuestionStats[];
}

export interface QuestionStats {
  questionId: string;
  questionText: string;
  questionType: string;
  totalAnswers: number;
  answerDistribution: Record<string, number>;
  averageValue?: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Filter and Sort Types
export interface SurveyFilters {
  status?: Survey['status'][];
  createdBy?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}
