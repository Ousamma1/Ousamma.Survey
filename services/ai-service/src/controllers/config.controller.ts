/**
 * Config Controller
 */

import { Request, Response, NextFunction } from 'express';
import { ProviderConfigService } from '../services';

let providerConfigService: ProviderConfigService;

export const setProviderConfigService = (service: ProviderConfigService) => {
  providerConfigService = service;
};

export const createProvider = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await providerConfigService.createProviderConfig(req.body);

    res.status(201).json({
      success: true,
      data: config
    });
  } catch (error) {
    next(error);
  }
};

export const listProviders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const configs = await providerConfigService.getAllProviderConfigs(req.query as any);

    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    next(error);
  }
};

export const getProvider = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await providerConfigService.getProviderConfig(req.params.providerId);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    next(error);
  }
};

export const updateProvider = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await providerConfigService.updateProviderConfig(
      req.params.providerId,
      req.body
    );

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProvider = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await providerConfigService.deleteProviderConfig(req.params.providerId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    res.json({
      success: true,
      message: 'Provider deleted'
    });
  } catch (error) {
    next(error);
  }
};

export const toggleProvider = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await providerConfigService.toggleProvider(
      req.params.providerId,
      req.body.enabled
    );

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    next(error);
  }
};
