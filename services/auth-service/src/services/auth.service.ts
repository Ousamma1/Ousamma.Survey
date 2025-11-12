import { User, IUser, AccountStatus } from '../models/user.model';
import { TokenService, TokenPair } from './token.service';
import crypto from 'crypto';

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  async register(input: RegisterInput): Promise<{ user: IUser; tokens: TokenPair }> {
    // Check if user already exists
    const existingUser = await User.findOne({ email: input.email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Generate verification token
    const verificationToken = TokenService.generateVerificationToken();
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24);

    // Create new user
    const user = await User.create({
      ...input,
      verificationToken,
      verificationTokenExpires
    });

    // TODO: Send verification email
    // await this.sendVerificationEmail(user.email, verificationToken);

    // Generate tokens
    const tokens = await TokenService.generateTokenPair(user);

    // Remove sensitive fields
    user.password = undefined as any;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;

    return { user, tokens };
  }

  async login(input: LoginInput): Promise<{ user: IUser; tokens: TokenPair }> {
    // Find user with password field
    const user = await User.findOne({ email: input.email }).select('+password');

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check account status
    if (user.status === AccountStatus.SUSPENDED) {
      throw new Error('Account is suspended');
    }

    if (user.status === AccountStatus.INACTIVE) {
      throw new Error('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(input.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate tokens
    const tokens = await TokenService.generateTokenPair(user);

    // Remove password from response
    user.password = undefined as any;

    return { user, tokens };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    // Verify refresh token and get user ID
    const userId = await TokenService.verifyRefreshToken(refreshToken);

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check account status
    if (user.status === AccountStatus.SUSPENDED || user.status === AccountStatus.INACTIVE) {
      throw new Error('Account is not active');
    }

    // Revoke old refresh token
    await TokenService.revokeRefreshToken(refreshToken);

    // Generate new token pair
    const tokens = await TokenService.generateTokenPair(user);

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    await TokenService.revokeRefreshToken(refreshToken);
  }

  async verifyEmail(token: string): Promise<IUser> {
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    user.emailVerified = true;
    user.status = AccountStatus.ACTIVE;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;

    await user.save();

    return user;
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal that user doesn't exist
      return;
    }

    const resetToken = TokenService.generatePasswordResetToken();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1);

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;

    await user.save();

    // TODO: Send password reset email
    // await this.sendPasswordResetEmail(user.email, resetToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new Error('Invalid or expired password reset token');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    // Revoke all existing refresh tokens
    await TokenService.revokeAllUserTokens(user._id.toString());
  }

  async verifyToken(token: string): Promise<{ user: any }> {
    const payload = TokenService.verifyAccessToken(token);

    const user = await User.findById(payload.userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (user.status !== AccountStatus.ACTIVE) {
      throw new Error('Account is not active');
    }

    return {
      user: {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        permissions: payload.permissions
      }
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    // Revoke all existing refresh tokens
    await TokenService.revokeAllUserTokens(userId);
  }
}
