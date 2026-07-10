import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LendingListing, LoanRating, LoanRequest } from '../../entities/lending.entity';
import { UsersModule } from '../users/users.module';
import { LendingController } from './lending.controller';
import { LendingService } from './lending.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LendingListing, LoanRequest, LoanRating]),
    UsersModule,
  ],
  controllers: [LendingController],
  providers: [LendingService],
})
export class LendingModule {}
