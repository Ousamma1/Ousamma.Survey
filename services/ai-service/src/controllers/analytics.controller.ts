/**
 * Analytics Controller
 */

import { Request, Response, NextFunction } from 'express';
import { UsageTrackingService } from '../services';

let usageTrackingService: UsageTrackingService;

export const setUsageTrackingService = (service: UsageTrackingService) => {
  usageTrackingService = service;
};

export const getUsageMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: any = { ...req.query };

    if (filters.startDate) filters.startDate = new Date(filters.startDate);
    if (filters.endDate) filters.endDate = new Date(filters.endDate);
    if (filters.limit) filters.limit = parseInt(filters.limit);
    if (filters.offset) filters.offset = parseInt(filters.offset);

    const metrics = await usageTrackingService.getUsageMetrics(filters);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    next(error);
  }
};

export const getUsageStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: any = { ...req.query };

    if (filters.startDate) filters.startDate = new Date(filters.startDate);
    if (filters.endDate) filters.endDate = new Date(filters.endDate);

    const stats = await usageTrackingService.getUsageStats(filters);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

export const getCostSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: any = { ...req.query };

    if (filters.startDate) filters.startDate = new Date(filters.startDate);
    if (filters.endDate) filters.endDate = new Date(filters.endDate);

    const summary = await usageTrackingService.getCostSummary(filters);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};
