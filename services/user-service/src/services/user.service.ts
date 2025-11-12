import { UserProfile, IUserProfile } from '../models/user.model';

export class UserService {
  async createProfile(data: Partial<IUserProfile>): Promise<IUserProfile> {
    const profile = await UserProfile.create(data);
    return profile;
  }

  async getProfileByUserId(userId: string): Promise<IUserProfile | null> {
    return UserProfile.findOne({ userId });
  }

  async getProfileById(id: string): Promise<IUserProfile | null> {
    return UserProfile.findById(id);
  }

  async updateProfile(userId: string, data: Partial<IUserProfile>): Promise<IUserProfile | null> {
    return UserProfile.findOneAndUpdate(
      { userId },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  async deleteProfile(userId: string): Promise<boolean> {
    const result = await UserProfile.deleteOne({ userId });
    return result.deletedCount > 0;
  }

  async listProfiles(page: number = 1, limit: number = 10): Promise<{
    profiles: IUserProfile[];
    total: number;
  }> {
    const skip = (page - 1) * limit;
    const [profiles, total] = await Promise.all([
      UserProfile.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
      UserProfile.countDocuments()
    ]);

    return { profiles, total };
  }

  async updateLastActive(userId: string): Promise<void> {
    await UserProfile.updateOne(
      { userId },
      { $set: { 'metadata.lastActive': new Date() } }
    );
  }
}
