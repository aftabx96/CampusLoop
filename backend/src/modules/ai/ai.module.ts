import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from '../../entities/asset.entity';
import { Booking } from '../../entities/booking.entity';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { LlmClient } from './llm.client';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, Booking])],
  controllers: [AiController],
  providers: [AiService, LlmClient],
  exports: [AiService],
})
export class AiModule {}
