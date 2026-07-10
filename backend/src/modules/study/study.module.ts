import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudyMatch, StudyProfile } from '../../entities/study.entity';
import { AiModule } from '../ai/ai.module';
import { StudyController } from './study.controller';
import { StudyService } from './study.service';

@Module({
  imports: [TypeOrmModule.forFeature([StudyProfile, StudyMatch]), AiModule],
  controllers: [StudyController],
  providers: [StudyService],
})
export class StudyModule {}
