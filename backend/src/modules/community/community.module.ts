import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityPost, PostComment, PostLike } from '../../entities/community.entity';
import { User } from '../../entities/user.entity';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';

@Module({
  imports: [TypeOrmModule.forFeature([CommunityPost, PostComment, PostLike, User])],
  controllers: [CommunityController],
  providers: [CommunityService],
})
export class CommunityModule {}
