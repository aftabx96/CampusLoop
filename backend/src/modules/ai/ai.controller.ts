import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { JwtPayload } from '../../common/enums';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../../common/guards';
import { AiService } from './ai.service';

class SmartSearchDto {
  @ApiProperty({ example: 'something to record audio for my documentary project' })
  @IsString()
  @IsNotEmpty()
  query: string;
}

class ChatDto {
  @ApiProperty({ example: 'How do I return a borrowed item?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message: string;
}

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  @Post('smart-search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'AI Feature 1 - natural language asset search with ranked rationale (falls back to keyword search)',
  })
  smartSearch(@Body() dto: SmartSearchDto) {
    return this.ai.smartSearch(dto.query);
  }

  @Post('chat')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'In-app help chatbot - works for logged-in and anonymous visitors (falls back to canned topic answers)' })
  chat(@Body() dto: ChatDto, @CurrentUser() user: JwtPayload | undefined) {
    return this.ai.chat(dto.message, user?.role ?? 'GUEST', user?.faculty ?? null);
  }
}
