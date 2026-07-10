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
import { CurrentUser } from '../../common/decorators';
import { JwtPayload } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards';
import { imageUploadOptions } from '../../common/upload';
import { LendingService } from './lending.service';

@ApiTags('lending')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lending')
export class LendingController {
  constructor(private lending: LendingService) {}

  @Get('listings')
  @ApiOperation({ summary: 'Browse peer lending marketplace' })
  listListings(@Query('q') q?: string) {
    return this.lending.listListings(q);
  }

  @Post('listings')
  @UseInterceptors(FileInterceptor('photo', imageUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'List a personal item for loan' })
  createListing(
    @Body() body: { title: string; description?: string; category: string; maxLoanDays?: number },
    @CurrentUser() user: JwtPayload,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.lending.createListing(
      { ...body, maxLoanDays: body.maxLoanDays ? Number(body.maxLoanDays) : undefined },
      user,
      photo ? `/uploads/${photo.filename}` : undefined,
    );
  }

  @Post('loans/:listingId/request')
  @ApiOperation({ summary: 'Request to borrow a listed item' })
  requestLoan(
    @Param('listingId') listingId: string,
    @Body('days') days: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lending.requestLoan(listingId, Number(days) || 7, user);
  }

  @Patch('loans/:id/decision')
  @ApiOperation({ summary: 'Owner accepts/declines a borrow request' })
  decideLoan(
    @Param('id') id: string,
    @Body('accept') accept: boolean,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lending.decideLoan(id, !!accept, user);
  }

  @Patch('loans/:id/return')
  markReturned(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.lending.markReturned(id, user);
  }

  @Post('loans/:id/rate')
  @ApiOperation({ summary: 'Rate the other party after a completed loan' })
  rate(
    @Param('id') id: string,
    @Body() body: { score: number; comment?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lending.rate(id, Number(body.score), body.comment ?? '', user);
  }

  @Get('loans/mine')
  myLoans(@CurrentUser() user: JwtPayload) {
    return this.lending.myLoans(user);
  }

  @Get('loans/incoming')
  incomingLoans(@CurrentUser() user: JwtPayload) {
    return this.lending.incomingLoans(user);
  }
}
