import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

const userService = new UserService();

export class UserController {
  async createProfile(req: Request, res: Response): Promise<void> {
    try {
      const profile = await userService.createProfile(req.body);
      res.status(201).json({
        success: true,
        data: profile,
        message: 'Profile created successfully',
        timestamp: new Date()
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { code: 'CREATE_ERROR', message: error.message },
        timestamp: new Date()
      });
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const profile = await userService.getProfileByUserId(req.params.userId);
      if (!profile) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Profile not found' },
          timestamp: new Date()
        });
        return;
      }
      res.json({
        success: true,
        data: profile,
        timestamp: new Date()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        timestamp: new Date()
      });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const profile = await userService.updateProfile(req.params.userId, req.body);
      if (!profile) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Profile not found' },
          timestamp: new Date()
        });
        return;
      }
      res.json({
        success: true,
        data: profile,
        message: 'Profile updated successfully',
        timestamp: new Date()
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: { code: 'UPDATE_ERROR', message: error.message },
        timestamp: new Date()
      });
    }
  }

  async deleteProfile(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await userService.deleteProfile(req.params.userId);
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Profile not found' },
          timestamp: new Date()
        });
        return;
      }
      res.json({
        success: true,
        message: 'Profile deleted successfully',
        timestamp: new Date()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: 'DELETE_ERROR', message: error.message },
        timestamp: new Date()
      });
    }
  }

  async listProfiles(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const { profiles, total } = await userService.listProfiles(page, limit);

      res.json({
        success: true,
        data: {
          profiles,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        },
        timestamp: new Date()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: 'LIST_ERROR', message: error.message },
        timestamp: new Date()
      });
    }
  }
}
