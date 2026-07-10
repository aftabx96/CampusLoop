import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { FoundItemStatus, JwtPayload, LostItemStatus, Role } from '../../common/enums';
import { FoundItem, LostReport } from '../../entities/lostfound.entity';
import { AiService } from '../ai/ai.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LostFoundService {
  constructor(
    @InjectRepository(LostReport) private lostReports: Repository<LostReport>,
    @InjectRepository(FoundItem) private foundItems: Repository<FoundItem>,
    private ai: AiService,
    private notifications: NotificationsService,
  ) {}

  reportLost(
    data: { title: string; description: string; lastSeenLocation: string },
    user: JwtPayload,
    photoUrl?: string,
  ) {
    const report = this.lostReports.create({ ...data, reporterId: user.sub, photoUrl });
    this.notifications.notifyRole(Role.LOST_FOUND_OFFICER, 'lostfound:new-report', {
      title: data.title,
    });
    return this.lostReports.save(report);
  }

  logFound(
    data: { title: string; description: string; foundLocation: string; conditionNotes?: string },
    user: JwtPayload,
    photoUrl?: string,
  ) {
    return this.foundItems.save(
      this.foundItems.create({ ...data, loggedById: user.sub, photoUrl }),
    );
  }

  listLost(mineOnly: boolean, user: JwtPayload) {
    return this.lostReports.find({
      where: mineOnly ? { reporterId: user.sub } : {},
      order: { createdAt: 'DESC' },
    });
  }

  listFound() {
    return this.foundItems.find({ order: { createdAt: 'DESC' } });
  }

  /** AI-assisted lost/found matching for officer review (spec 3.5 + 4.x). */
  async suggestMatches() {
    const lost = await this.lostReports.find({ where: { status: LostItemStatus.OPEN } });
    const found = await this.foundItems.find({
      where: { status: In([FoundItemStatus.LOGGED, FoundItemStatus.DONATION_FLAGGED]) },
    });
    const result = await this.ai.matchLostFound(
      lost.map((l) => ({ id: l.id, title: l.title, description: l.description, lastSeenLocation: l.lastSeenLocation })),
      found.map((f) => ({ id: f.id, title: f.title, description: f.description, foundLocation: f.foundLocation })),
    );
    const lostById = new Map(lost.map((l) => [l.id, l]));
    const foundById = new Map(found.map((f) => [f.id, f]));
    return {
      aiRanked: result.aiRanked,
      pairs: result.pairs
        .filter((p) => lostById.has(p.lostReportId) && foundById.has(p.foundItemId))
        .map((p) => ({
          ...p,
          lostReport: lostById.get(p.lostReportId),
          foundItem: foundById.get(p.foundItemId),
        })),
    };
  }

  /** Officer confirms a match: both records update, reporter is notified. */
  async confirmMatch(lostReportId: string, foundItemId: string) {
    const lost = await this.lostReports.findOne({ where: { id: lostReportId } });
    const found = await this.foundItems.findOne({ where: { id: foundItemId } });
    if (!lost || !found) throw new NotFoundException('Report or item not found');
    lost.status = LostItemStatus.MATCHED;
    found.status = FoundItemStatus.MATCHED;
    found.matchedLostReportId = lost.id;
    await this.lostReports.save(lost);
    await this.foundItems.save(found);
    await this.notifications.notifyUser(
      lost.reporterId,
      'lostfound',
      'Possible match found!',
      `A found item matching "${lost.title}" is waiting at the Lost & Found office.`,
      { lostReportId, foundItemId },
    );
    return { lost, found };
  }

  async markReturnedToOwner(foundItemId: string) {
    const found = await this.foundItems.findOne({ where: { id: foundItemId } });
    if (!found) throw new NotFoundException('Found item not found');
    found.status = FoundItemStatus.RETURNED;
    if (found.matchedLostReportId) {
      await this.lostReports.update(found.matchedLostReportId, {
        status: LostItemStatus.CLAIMED,
      });
    }
    return this.foundItems.save(found);
  }

  /** Daily sweep: unclaimed items older than 30 days flagged for donation (spec 3.5). */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async flagUnclaimed() {
    const cutoff = new Date(Date.now() - 30 * 86400_000);
    await this.foundItems.update(
      { status: FoundItemStatus.LOGGED, createdAt: LessThan(cutoff) },
      { status: FoundItemStatus.DONATION_FLAGGED },
    );
  }
}
