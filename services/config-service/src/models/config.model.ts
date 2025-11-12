import mongoose, { Document, Schema } from 'mongoose';

export interface IConfig extends Document {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  category: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFeatureFlag extends Document {
  name: string;
  enabled: boolean;
  description?: string;
  rolloutPercentage: number;
  targetUsers?: string[];
  targetRoles?: string[];
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const configSchema = new Schema<IConfig>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    type: { type: String, enum: ['string', 'number', 'boolean', 'object', 'array'], required: true },
    description: String,
    category: { type: String, required: true, index: true },
    isPublic: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const featureFlagSchema = new Schema<IFeatureFlag>(
  {
    name: { type: String, required: true, unique: true, index: true },
    enabled: { type: Boolean, default: false },
    description: String,
    rolloutPercentage: { type: Number, min: 0, max: 100, default: 0 },
    targetUsers: [String],
    targetRoles: [String],
    metadata: Schema.Types.Mixed
  },
  { timestamps: true }
);

export const Config = mongoose.model<IConfig>('Config', configSchema);
export const FeatureFlag = mongoose.model<IFeatureFlag>('FeatureFlag', featureFlagSchema);
