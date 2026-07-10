import {
  Body,
  Controller,
  Delete,
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
import { AssetsService } from './assets.service';
import { CreateAssetDto, UpdateAssetDto } from './dto';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assets')
export class AssetsController {
  constructor(private assetsService: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'Search / browse asset catalogue' })
  findAll(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('departmentId') departmentId?: string,
    @Query('availability') availability?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.assetsService.findAll({ q, category, departmentId, availability, page, limit });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Post()
  @Roles(Role.STAFF, Role.ADMIN)
  @UseInterceptors(FileInterceptor('photo', imageUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create asset with required photo (staff/admin)' })
  create(
    @Body() dto: CreateAssetDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.assetsService.create(dto, user, photo ? `/uploads/${photo.filename}` : undefined);
  }

  @Patch(':id')
  @Roles(Role.STAFF, Role.ADMIN)
  @UseInterceptors(FileInterceptor('photo', imageUploadOptions))
  @ApiConsumes('multipart/form-data')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.assetsService.update(id, dto, user, photo ? `/uploads/${photo.filename}` : undefined);
  }

  @Patch(':id/transfer')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Transfer asset between departments (admin)' })
  transfer(
    @Param('id') id: string,
    @Body('departmentId') departmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.assetsService.transfer(id, departmentId, user);
  }

  @Delete(':id')
  @Roles(Role.STAFF, Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.assetsService.remove(id, user);
  }
}
