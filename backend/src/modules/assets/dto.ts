import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import {
  AssetCategory,
  AssetCondition,
  AssetKind,
  AvailabilityStatus,
} from '../../common/enums';

export class CreateAssetDto {
  @ApiProperty({ example: 'Zoom H6 Audio Recorder' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: AssetCategory })
  @IsEnum(AssetCategory)
  category: AssetCategory;

  @ApiProperty({ enum: AssetKind })
  @IsEnum(AssetKind)
  kind: AssetKind;

  @ApiPropertyOptional({ enum: AssetCondition })
  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @ApiPropertyOptional({ example: 'mic,audio,recording' })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bookingLeadTimeHours?: number;

  @ApiPropertyOptional({ default: 0, description: 'Value in PKR; above threshold requires approval' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value?: number;

  @ApiPropertyOptional({ description: 'Kind-specific attributes (capacity, ISBN, serial…)' })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Admins may create for another department' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}

export class UpdateAssetDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: AssetCategory }) @IsOptional() @IsEnum(AssetCategory) category?: AssetCategory;
  @ApiPropertyOptional({ enum: AssetCondition }) @IsOptional() @IsEnum(AssetCondition) condition?: AssetCondition;
  @ApiPropertyOptional({ enum: AvailabilityStatus }) @IsOptional() @IsEnum(AvailabilityStatus) availability?: AvailabilityStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() tags?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) bookingLeadTimeHours?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) value?: number;
  @ApiPropertyOptional() @IsOptional() @IsObject() attributes?: Record<string, unknown>;
}
