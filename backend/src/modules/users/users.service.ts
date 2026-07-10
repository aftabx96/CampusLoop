import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
