import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Role } from '../../common/enums';
import { User } from '../../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private users: Repository<User>) {}

  findAll() {
    return this.users.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Flat profile shape matching the object returned by the auth service on login. */
  private profileShape(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      departmentId: user.departmentId ?? null,
      faculty: user.department?.faculty ?? null,
      department: user.department?.name ?? null,
      reputationScore: user.reputationScore,
      studentNumber: user.studentNumber,
    };
  }

  async getProfile(id: string) {
    return this.profileShape(await this.findOne(id));
  }

  /**
   * Self-service profile edit. Only fields absent from the JWT claims
   * (fullName, studentNumber) are editable here, so a saved profile never
   * desyncs from the access token; email, role and department are fixed.
   */
  async updateProfile(id: string, dto: { fullName?: string; studentNumber?: string }) {
    const user = await this.findOne(id);
    if (dto.fullName !== undefined) {
      const name = dto.fullName.trim();
      if (name.length < 2) throw new BadRequestException('Name is too short');
      user.fullName = name;
    }
    if (dto.studentNumber !== undefined) {
      user.studentNumber = dto.studentNumber.trim();
    }
    await this.users.save(user);
    return this.getProfile(id);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id })
      .getOne();
    if (!user) throw new NotFoundException('User not found');
    if (!(await bcrypt.compare(currentPassword || '', user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }
    await this.users.update(id, { passwordHash: await bcrypt.hash(newPassword, 10) });
    return { success: true };
  }

  async updateRole(id: string, role: Role) {
    await this.findOne(id);
    await this.users.update(id, { role });
    return this.findOne(id);
  }

  async setLendingEligible(id: string, eligible: boolean) {
    await this.findOne(id);
    await this.users.update(id, { lendingEligible: eligible });
    return this.findOne(id);
  }

  /** Recompute reputation after a new rating; drops lending access below 2.5. */
  async applyRating(ratedUserId: string, score: number) {
    const user = await this.findOne(ratedUserId);
    const total = user.reputationScore * user.ratingsCount + score;
    const count = user.ratingsCount + 1;
    const reputationScore = Math.round((total / count) * 100) / 100;
    await this.users.update(ratedUserId, {
      reputationScore,
      ratingsCount: count,
      lendingEligible: reputationScore >= 2.5,
    });
  }
}
