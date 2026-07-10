import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtPayload, Role } from '../../common/enums';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { imageUploadOptions } from '../../common/upload';
import { LostFoundService } from './lostfound.service';

@ApiTags('lost-found')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lost-found')
export class LostFoundController {
  constructor(private lostFound: LostFoundService) {}

  @Post('lost')
  @UseInterceptors(FileInterceptor('photo', imageUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Report a lost item (any user)' })
  reportLost(
    @Body() body: { title: string; description: string; lastSeenLocation: string },
    @CurrentUser() user: JwtPayload,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.lostFound.reportLost(body, user, photo ? `/uploads/${photo.filename}` : undefined);
  }

  @Post('found')
  @Roles(Role.LOST_FOUND_OFFICER, Role.ADMIN)
  @UseInterceptors(FileInterceptor('photo', imageUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Log a found item (officer)' })
  logFound(
    @Body() body: { title: string; description: string; foundLocation: string; conditionNotes?: string },
    @CurrentUser() user: JwtPayload,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.lostFound.logFound(body, user, photo ? `/uploads/${photo.filename}` : undefined);
  }

  @Get('lost')
  listLost(@Query('mine') mine: string, @CurrentUser() user: JwtPayload) {
    return this.lostFound.listLost(mine === 'true', user);
  }

  @Get('found')
  listFound() {
    return this.lostFound.listFound();
  }

  @Get('matches')
  @Roles(Role.LOST_FOUND_OFFICER, Role.ADMIN)
  @ApiOperation({ summary: 'AI-suggested lost/found pairs for officer review' })
  suggestMatches() {
    return this.lostFound.suggestMatches();
  }

  @Post('matches/confirm')
  @Roles(Role.LOST_FOUND_OFFICER, Role.ADMIN)
  confirmMatch(@Body() body: { lostReportId: string; foundItemId: string }) {
    return this.lostFound.confirmMatch(body.lostReportId, body.foundItemId);
  }

  @Patch('found/:id/returned')
  @Roles(Role.LOST_FOUND_OFFICER, Role.ADMIN)
  markReturned(@Param('id') id: string) {
    return this.lostFound.markReturnedToOwner(id);
  }
}
