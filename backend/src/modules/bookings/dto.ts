import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { AssetCondition, RecommendedAction } from '../../common/enums';

export class CreateBookingDto {
  @ApiProperty()
  @IsUUID()
  assetId: string;

  @ApiProperty({ example: '2026-07-14T10:00:00Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-07-14T12:00:00Z' })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purpose?: string;
}

export class DecideBookingDto {
  @ApiProperty({ enum: ['APPROVED', 'DECLINED'] })
  @IsEnum({ APPROVED: 'APPROVED', DECLINED: 'DECLINED' })
  decision: 'APPROVED' | 'DECLINED';
}

export class ReturnBookingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ enum: AssetCondition })
  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;
}

export class ConfirmInspectionDto {
  @ApiProperty({ enum: AssetCondition })
  @IsEnum(AssetCondition)
  condition: AssetCondition;

  @ApiProperty({ enum: RecommendedAction })
  @IsEnum(RecommendedAction)
  recommendedAction: RecommendedAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
