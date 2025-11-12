export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
  GUEST = 'guest'
}

export enum Permission {
  // User permissions
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',

  // Survey permissions
  SURVEY_READ = 'survey:read',
  SURVEY_WRITE = 'survey:write',
  SURVEY_DELETE = 'survey:delete',
  SURVEY_PUBLISH = 'survey:publish',

  // Response permissions
  RESPONSE_READ = 'response:read',
  RESPONSE_WRITE = 'response:write',
  RESPONSE_DELETE = 'response:delete',

  // Analytics permissions
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_EXPORT = 'analytics:export',

  // Admin permissions
  ADMIN_ALL = 'admin:all'
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface AuthenticatedRequest {
  user: JwtPayload;
}
