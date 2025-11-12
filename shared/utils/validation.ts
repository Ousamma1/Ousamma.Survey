import Joi from 'joi';
import { ValidationError } from './errors';

export class Validator {
  static validate<T>(schema: Joi.ObjectSchema, data: any): T {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      throw new ValidationError('Validation failed', details);
    }

    return value as T;
  }

  static async validateAsync<T>(schema: Joi.ObjectSchema, data: any): Promise<T> {
    try {
      const value = await schema.validateAsync(data, {
        abortEarly: false,
        stripUnknown: true
      });

      return value as T;
    } catch (error) {
      if (Joi.isError(error)) {
        const details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        throw new ValidationError('Validation failed', details);
      }

      throw error;
    }
  }
}

// Common validation schemas
export const commonSchemas = {
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),
  id: Joi.string().required(),
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),
  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
  })
};
