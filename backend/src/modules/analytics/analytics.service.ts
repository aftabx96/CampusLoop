import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingStatus, LoanStatus, Role } from '../../common/enums';
import { Asset } from '../../entities/asset.entity';
import { Booking } from '../../entities/booking.entity';
import { LoanRequest } from '../../entities/lending.entity';
import { AiService } from '../ai/ai.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AnalyticsService {
  private logger = new Logger('AnalyticsService');
  private lastAnomalyReport: unknown = null;

  constructor(
    @InjectRepository(Asset) private assets: Repository<Asset>,
    @InjectRepository(Booking) private bookings: Repository<Booking>,
    @InjectRepository(LoanRequest) private loans: Repository<LoanRequest>,
    private ai: AiService,
    private notifications: NotificationsService,
  ) {}

  /** Utilisation rate = booked hours / available hours (8h day) per grouping. */
  async utilisation(groupBy: 'department' | 'category' | 'faculty') {
    const col =
      groupBy === 'category'
        ? 'a.category'
        : groupBy === 'faculty'
          ? 'd.faculty'
          : 'd.name';
    const rows = await this.bookings
      .createQueryBuilder('b')
      .innerJoin('b.asset', 'a')
      .innerJoin('a.department', 'd')
      .select(col, 'label')
      .addSelect(
        'SUM(EXTRACT(EPOCH FROM (b.endsAt - b.startsAt)) / 3600)',
        'bookedHours',
      )
      .addSelect('COUNT(DISTINCT a.id)', 'assetCount')
      .where('b.status IN (:...statuses)', {
        statuses: [BookingStatus.APPROVED, BookingStatus.ACTIVE, BookingStatus.RETURNED],
      })
      .groupBy(col)
      .getRawMany()
      .catch(() => []);

    // 30-day window, 8 available hours/day per asset
    const windowHours = 30 * 8;
    return rows.map((r) => ({
      label: r.label,
      bookedHours: Math.round(Number(r.bookedHours) || 0),
      utilisationRate: Math.min(
        100,
        Math.round(((Number(r.bookedHours) || 0) / (Number(r.assetCount) * windowHours)) * 100),
      ),
    }));
  }

  /** Most-requested vs least-used assets — reallocation candidates. */
  async demandRanking() {
    const rows = await this.bookings
      .createQueryBuilder('b')
      .innerJoin('b.asset', 'a')
      .select('a.id', 'assetId')
      .addSelect('a.name', 'name')
      .addSelect('COUNT(*)', 'bookings')
      .groupBy('a.id')
      .addGroupBy('a.name')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();
    const all = await this.assets.count();
    return {
      mostRequested: rows.slice(0, 8),
      leastUsed: rows.slice(-8).reverse(),
      assetsWithZeroBookings: Math.max(0, all - rows.length),
    };
  }

  /** Average approval turnaround (hours) per deciding manager. */
  async approvalTurnaround() {
    return this.bookings
      .createQueryBuilder('b')
      .innerJoin('users', 'u', 'u.id = b.decidedById')
      .select('u.fullName', 'manager')
      .addSelect('AVG(EXTRACT(EPOCH FROM (b.decidedAt - b.createdAt)) / 3600)', 'avgHours')
      .addSelect('COUNT(*)', 'decisions')
      .where('b.decidedAt IS NOT NULL')
      .groupBy('u.fullName')
      .orderBy('"avgHours"', 'ASC')
      .getRawMany();
  }

  /** Peer lending volume and dispute rate. */
  async lendingStats() {
    const total = await this.loans.count();
    const disputed = await this.loans.count({ where: { status: LoanStatus.DISPUTED } });
    const overdue = await this.loans.count({ where: { status: LoanStatus.OVERDUE } });
    const byMonth = await this.loans
      .createQueryBuilder('l')
      .select("TO_CHAR(l.createdAt, 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'loans')
      .groupBy("TO_CHAR(l.createdAt, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany();
    return {
      total,
      overdue,
      disputeRate: total ? Math.round((disputed / total) * 1000) / 10 : 0,
      byMonth,
    };
  }

  async overview() {
    const [assets, bookings, pending] = await Promise.all([
      this.assets.count(),
      this.bookings.count(),
      this.bookings.count({ where: { status: BookingStatus.PENDING } }),
    ]);
    const loans = await this.loans.count();
    return { assets, bookings, pendingApprovals: pending, peerLoans: loans };
  }

  getLastAnomalyReport() {
    return this.lastAnomalyReport ?? { status: 'No weekly report generated yet' };
  }

  /**
   * AI Feature 4 (bonus): weekly cron — 8 weeks of booking data per asset
   * analysed by the LLM; report "emailed" to faculty admins (simulated via
   * console log + in-app notification, as no SMTP is available in dev).
   */
  @Cron('0 8 * * MON')
  async weeklyAnomalyScan() {
    try {
      const since = new Date(Date.now() - 8 * 7 * 86400_000);
      const stats = await this.bookings
        .createQueryBuilder('b')
        .innerJoin('b.asset', 'a')
        .select('a.id', 'assetId')
        .addSelect('a.name', 'name')
        .addSelect('a.category', 'category')
        .addSelect('COUNT(*)', 'bookings')
        .addSelect('SUM(EXTRACT(EPOCH FROM (b.endsAt - b.startsAt)) / 3600)', 'hours')
        .where('b.createdAt >= :since', { since })
        .groupBy('a.id')
        .addGroupBy('a.name')
        .addGroupBy('a.category')
        .getRawMany();

      const report = await this.ai.detectAnomalies(stats);
      if (!report) {
        this.logger.warn('Weekly anomaly scan skipped: AI unavailable');
        return;
      }
      this.lastAnomalyReport = { ...report, generatedAt: new Date().toISOString() };
      this.logger.log(`[EMAIL to faculty admins] Weekly utilisation report: ${report.summary}`);
      this.notifications.notifyRole(Role.ADMIN, 'anomaly-report', this.lastAnomalyReport);
    } catch (err) {
      this.logger.error(`Weekly anomaly scan failed: ${err.message}`);
    }
  }

  /** Manual trigger so the bonus feature can be demonstrated live. */
  async runAnomalyScanNow() {
    await this.weeklyAnomalyScan();
    return this.getLastAnomalyReport();
  }
}
