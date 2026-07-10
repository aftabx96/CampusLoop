import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('analytics')
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Headline platform numbers (admin)' })
  overview() {
    return this.analytics.overview();
  }

  @Get('utilisation')
  @ApiOperation({ summary: 'Utilisation rate by department/category/faculty' })
  utilisation(@Query('groupBy') groupBy: 'department' | 'category' | 'faculty' = 'department') {
    return this.analytics.utilisation(groupBy);
  }

  @Get('demand')
  @ApiOperation({ summary: 'Most-requested vs least-used assets' })
  demand() {
    return this.analytics.demandRanking();
  }

  @Get('turnaround')
  @ApiOperation({ summary: 'Booking approval turnaround per manager' })
  turnaround() {
    return this.analytics.approvalTurnaround();
  }

  @Get('lending')
  @ApiOperation({ summary: 'Peer lending volume and dispute rate' })
  lending() {
    return this.analytics.lendingStats();
  }

  @Get('anomaly-report')
  @ApiOperation({ summary: 'Last weekly AI anomaly report (bonus feature)' })
  anomalyReport() {
    return this.analytics.getLastAnomalyReport();
  }

  @Post('anomaly-report/run')
  @ApiOperation({ summary: 'Run the weekly anomaly scan on demand (demo)' })
  runAnomalyScan() {
    return this.analytics.runAnomalyScanNow();
  }
}
