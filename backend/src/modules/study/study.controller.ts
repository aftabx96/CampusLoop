import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { JwtPayload, StudyStyle } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards';
import { StudyService } from './study.service';

@ApiTags('study-groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('study')
export class StudyController {
  constructor(private study: StudyService) {}

  @Post('profile')
  @ApiOperation({ summary: 'Create/update my study profile' })
  upsertProfile(
    @Body() body: { modules: string[]; availableSlots: string[]; studyStyle: StudyStyle },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.study.upsertProfile(body, user);
  }

  @Get('profile')
  myProfile(@CurrentUser() user: JwtPayload) {
    return this.study.myProfile(user);
  }

  @Get('matches/suggest')
  @ApiOperation({ summary: 'AI Feature 3 - ranked compatible study partners' })
  findMatches(@CurrentUser() user: JwtPayload) {
    return this.study.findMatches(user);
  }

  @Post('matches/propose')
  propose(
    @Body() body: { userId: string; score: number; summary?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.study.propose(body.userId, body.score ?? 0, body.summary ?? '', user);
  }

  @Patch('matches/:id/respond')
  @ApiOperation({ summary: 'Accept/decline - both must accept to exchange contacts' })
  respond(
    @Param('id') id: string,
    @Body('accept') accept: boolean,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.study.respond(id, !!accept, user);
  }

  @Get('matches')
  myMatches(@CurrentUser() user: JwtPayload) {
    return this.study.myMatches(user);
  }
}
