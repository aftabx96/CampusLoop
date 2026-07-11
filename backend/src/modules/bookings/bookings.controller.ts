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
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/decorators';
import { JwtPayload, Role } from '../../common/enums';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { imageUploadOptions } from '../../common/upload';
import { BookingsService } from './bookings.service';
import { ConfirmInspectionDto, CreateBookingDto, DecideBookingDto, ReturnBookingDto } from './dto';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Book a time slot (conflict-safe, DB-level lock)' })
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: JwtPayload) {
    return this.bookingsService.create(dto, user);
  }

  @Get('availability/:assetId')
  @ApiOperation({ summary: 'Booked slots for an asset in a date range' })
  availability(
    @Param('assetId') assetId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.bookingsService.availability(assetId, from, to);
  }

  @Get('mine')
  listMine(@CurrentUser() user: JwtPayload) {
    return this.bookingsService.listMine(user);
  }

  @Get('pending')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Pending approvals for my department (staff/admin)' })
  listPending(@CurrentUser() user: JwtPayload) {
    return this.bookingsService.listPendingForManager(user);
  }

  @Get('inspections')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Returned items awaiting inspection confirmation (staff/admin)' })
  listInspections(@CurrentUser() user: JwtPayload) {
    return this.bookingsService.listReturnedForManager(user);
  }

  @Patch(':id/decision')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Approve or decline a booking - requester notified via WebSocket' })
  decide(
    @Param('id') id: string,
    @Body() dto: DecideBookingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.bookingsService.decide(id, dto.decision, user);
  }

  @Post(':id/return')
  @UseInterceptors(FileInterceptor('photo', imageUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Return item with photo - AI pre-fills inspection (Feature 2)' })
  returnItem(
    @Param('id') id: string,
    @Body() dto: ReturnBookingDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.bookingsService.returnItem(
      id,
      dto,
      user,
      photo?.path,
      photo ? `/uploads/${photo.filename}` : undefined,
    );
  }

  @Patch(':id/inspection')
  @Roles(Role.STAFF, Role.ADMIN)
  @ApiOperation({ summary: 'Manager confirms/overrides AI condition assessment' })
  confirmInspection(
    @Param('id') id: string,
    @Body() dto: ConfirmInspectionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.bookingsService.confirmInspection(id, dto, user);
  }
}
