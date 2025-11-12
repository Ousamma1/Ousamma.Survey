import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import Joi from 'joi';

const authService = new AuthService();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

const verifyEmailSchema = Joi.object({
  token: Joi.string().required()
});

const passwordResetRequestSchema = Joi.object({
  email: Joi.string().email().required()
});

const passwordResetSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
});

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          },
          timestamp: new Date()
        });
        return;
      }

      const result = await authService.register(value);

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens
        },
        message: 'Registration successful. Please verify your email.',
        timestamp: new Date()
      });
    } catch (error: any) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          },
          timestamp: new Date()
        });
        return;
      }

      const result = await authService.login(value);

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens
        },
        message: 'Login successful',
        timestamp: new Date()
      });
    } catch (error: any) {
      if (error.message.includes('Invalid credentials') || error.message.includes('suspended') || error.message.includes('inactive')) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: error.message
          },
          timestamp: new Date()
        });
        return;
      }
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = refreshTokenSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          },
          timestamp: new Date()
        });
        return;
      }

      const tokens = await authService.refreshTokens(value.refreshToken);

      res.status(200).json({
        success: true,
        data: { tokens },
        message: 'Tokens refreshed successfully',
        timestamp: new Date()
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: error.message
        },
        timestamp: new Date()
      });
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = refreshTokenSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          },
          timestamp: new Date()
        });
        return;
      }

      await authService.logout(value.refreshToken);

      res.status(200).json({
        success: true,
        message: 'Logout successful',
        timestamp: new Date()
      });
    } catch (error: any) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = verifyEmailSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          },
          timestamp: new Date()
        });
        return;
      }

      const user = await authService.verifyEmail(value.token);

      res.status(200).json({
        success: true,
        data: { user },
        message: 'Email verified successfully',
        timestamp: new Date()
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: error.message
        },
        timestamp: new Date()
      });
    }
  }

  async requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = passwordResetRequestSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          },
          timestamp: new Date()
        });
        return;
      }

      await authService.requestPasswordReset(value.email);

      res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link will be sent',
        timestamp: new Date()
      });
    } catch (error: any) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = passwordResetSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          },
          timestamp: new Date()
        });
        return;
      }

      await authService.resetPassword(value.token, value.newPassword);

      res.status(200).json({
        success: true,
        message: 'Password reset successful',
        timestamp: new Date()
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: error.message
        },
        timestamp: new Date()
      });
    }
  }

  async verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'No token provided'
          },
          timestamp: new Date()
        });
        return;
      }

      const token = authHeader.substring(7);
      const result = await authService.verifyToken(token);

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date()
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: error.message
        },
        timestamp: new Date()
      });
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = changePasswordSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.details[0].message
          },
          timestamp: new Date()
        });
        return;
      }

      // Assuming user ID is attached by auth middleware
      const userId = (req as any).user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User not authenticated'
          },
          timestamp: new Date()
        });
        return;
      }

      await authService.changePassword(userId, value.currentPassword, value.newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
        timestamp: new Date()
      });
    } catch (error: any) {
      if (error.message.includes('incorrect')) {
        res.status(400).json({
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: error.message
          },
          timestamp: new Date()
        });
        return;
      }
      next(error);
    }
  }
}
