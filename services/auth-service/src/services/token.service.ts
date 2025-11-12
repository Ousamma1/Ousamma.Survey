import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { IUser } from '../models/user.model';
import { RefreshToken } from '../models/refresh-token.model';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export class TokenService {
  static generateAccessToken(user: IUser): string {
    const payload: JwtPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      permissions: this.getPermissionsForRole(user.role)
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });
  }

  static async generateRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');

    const expiresAt = new Date();
    const expiresInDays = parseInt(config.jwt.refreshExpiresIn.replace('d', ''));
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await RefreshToken.create({
      userId,
      token,
      expiresAt
    });

    return token;
  }

  static async generateTokenPair(user: IUser): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user._id.toString());

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.expiresIn
    };
  }

  static verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  static async verifyRefreshToken(token: string): Promise<string> {
    const refreshToken = await RefreshToken.findOne({
      token,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    });

    if (!refreshToken) {
      throw new Error('Invalid or expired refresh token');
    }

    return refreshToken.userId.toString();
  }

  static async revokeRefreshToken(token: string): Promise<void> {
    await RefreshToken.updateOne(
      { token },
      { $set: { isRevoked: true } }
    );
  }

  static async revokeAllUserTokens(userId: string): Promise<void> {
    await RefreshToken.updateMany(
      { userId, isRevoked: false },
      { $set: { isRevoked: true } }
    );
  }

  static generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static getPermissionsForRole(role: string): string[] {
    const permissionMap: { [key: string]: string[] } = {
      admin: [
        'user:read', 'user:write', 'user:delete',
        'survey:read', 'survey:write', 'survey:delete', 'survey:publish',
        'response:read', 'response:write', 'response:delete',
        'analytics:read', 'analytics:export',
        'admin:all'
      ],
      manager: [
        'user:read',
        'survey:read', 'survey:write', 'survey:publish',
        'response:read', 'response:write',
        'analytics:read', 'analytics:export'
      ],
      user: [
        'survey:read', 'survey:write',
        'response:read', 'response:write',
        'analytics:read'
      ],
      guest: [
        'survey:read',
        'response:write'
      ]
    };

    return permissionMap[role] || permissionMap.guest;
  }
}
