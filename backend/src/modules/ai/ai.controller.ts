import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards';
import { AiService } from './ai.service';

class SmartSearchDto {
  @ApiProperty({
    example: 'something to record audio for my documentary project',
  })
  @IsString()
  @IsNotEmpty()
  query: string;
}

class ChatDto {
  @ApiProperty({
    example: 'How do I book a camera?',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  @Post('smart-search')
  @ApiOperation({
    summary:
      'AI Feature 1 — natural language asset search with ranked rationale (falls back to keyword search)',
  })
  smartSearch(@Body() dto: SmartSearchDto) {
    return this.ai.smartSearch(dto.query);
  }

  @Post('chat')
  @ApiOperation({
    summary: 'CampusLoop AI Chatbot',
  })
  chat(@Body() dto: ChatDto) {
    return this.ai.chat(dto.message);
  }
}