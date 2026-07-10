import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoundItem, LostReport } from '../../entities/lostfound.entity';
import { AiModule } from '../ai/ai.module';
import { LostFoundController } from './lostfound.controller';
import { LostFoundService } from './lostfound.service';

@Module({
  imports: [TypeOrmModule.forFeature([LostReport, FoundItem]), AiModule],
  controllers: [LostFoundController],
  providers: [LostFoundService],
})
export class LostFoundModule {}
