import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { DepartmentsService } from './departments.service';

@ApiTags('departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private departmentsService: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List departments (public, used at registration)' })
  findAll() {
    return this.departmentsService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create department (admin)' })
  create(@Body() body: { name: string; faculty: string; building?: string }) {
    return this.departmentsService.create(body);
  }
}
