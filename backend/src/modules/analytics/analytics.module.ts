import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from '../../entities/asset.entity';
import { Booking } from '../../entities/booking.entity';
import { LoanRequest } from '../../entities/lending.entity';
import { AiModule } from '../ai/ai.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, Booking, LoanRequest]), AiModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
