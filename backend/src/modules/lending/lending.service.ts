import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { JwtPayload, LoanStatus } from '../../common/enums';
import { LendingListing, LoanRating, LoanRequest } from '../../entities/lending.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class LendingService {
  constructor(
    @InjectRepository(LendingListing) private listings: Repository<LendingListing>,
    @InjectRepository(LoanRequest) private loans: Repository<LoanRequest>,
    @InjectRepository(LoanRating) private ratings: Repository<LoanRating>,
    private notifications: NotificationsService,
    private usersService: UsersService,
  ) {}

  // ── listings ──
  listListings(q?: string) {
    const qb = this.listings
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.owner', 'o')
      .where('l.active = true');
    if (q) qb.andWhere('(l.title ILIKE :q OR l.description ILIKE :q)', { q: `%${q}%` });
    return qb.orderBy('l.createdAt', 'DESC').getMany();
  }

  async createListing(
    data: { title: string; description?: string; category: string; maxLoanDays?: number },
    user: JwtPayload,
    photoUrl?: string,
  ) {
    const owner = await this.usersService.findOne(user.sub);
    if (!owner.lendingEligible)
      throw new ForbiddenException('Your reputation score is too low to lend items');
    return this.listings.save(
      this.listings.create({ ...data, ownerId: user.sub, photoUrl }),
    );
  }

  // ── loans ──
  async requestLoan(listingId: string, days: number, user: JwtPayload) {
    const listing = await this.listings.findOne({ where: { id: listingId } });
    if (!listing || !listing.active) throw new NotFoundException('Listing not found');
    if (listing.ownerId === user.sub)
      throw new BadRequestException('Cannot borrow your own item');
    const loanDays = Math.min(days || 7, listing.maxLoanDays);
    const loan = await this.loans.save(
      this.loans.create({
        listingId,
        borrowerId: user.sub,
        dueAt: new Date(Date.now() + loanDays * 86400_000),
      }),
    );
    await this.notifications.notifyUser(
      listing.ownerId,
      'loan',
      'New borrow request',
      `Someone requested to borrow "${listing.title}" for ${loanDays} day(s).`,
      { loanId: loan.id },
    );
    return loan;
  }

  async decideLoan(id: string, accept: boolean, user: JwtPayload) {
    const loan = await this.findLoan(id);
    if (loan.listing.ownerId !== user.sub)
      throw new ForbiddenException('Only the owner can decide');
    if (loan.status !== LoanStatus.REQUESTED)
      throw new BadRequestException('Loan already decided');
    loan.status = accept ? LoanStatus.ACTIVE : LoanStatus.DECLINED;
    await this.loans.save(loan);
    await this.notifications.notifyUser(
      loan.borrowerId,
      'loan',
      accept ? 'Loan accepted' : 'Loan declined',
      `Your request for "${loan.listing.title}" was ${accept ? 'accepted' : 'declined'}.`,
      { loanId: loan.id },
    );
    return loan;
  }

  async markReturned(id: string, user: JwtPayload) {
    const loan = await this.findLoan(id);
    if (loan.listing.ownerId !== user.sub)
      throw new ForbiddenException('Only the owner confirms return');
    if (![LoanStatus.ACTIVE, LoanStatus.OVERDUE].includes(loan.status))
      throw new BadRequestException('Loan is not active');
    loan.status = LoanStatus.RETURNED;
    loan.returnedAt = new Date();
    await this.loans.save(loan);
    return loan;
  }

  /** Both parties rate each other after a completed loan (spec 3.4). */
  async rate(id: string, score: number, comment: string, user: JwtPayload) {
    if (score < 1 || score > 5) throw new BadRequestException('Score must be 1-5');
    const loan = await this.findLoan(id);
    if (loan.status !== LoanStatus.RETURNED)
      throw new BadRequestException('Loan not completed yet');
    const isOwner = loan.listing.ownerId === user.sub;
    const isBorrower = loan.borrowerId === user.sub;
    if (!isOwner && !isBorrower) throw new ForbiddenException('Not your loan');

    const ratedUserId = isOwner ? loan.borrowerId : loan.listing.ownerId;
    const existing = await this.ratings.findOne({
      where: { loanId: id, raterId: user.sub },
    });
    if (existing) throw new BadRequestException('Already rated this loan');

    const rating = await this.ratings.save(
      this.ratings.create({ loanId: id, raterId: user.sub, ratedUserId, score, comment }),
    );
    await this.usersService.applyRating(ratedUserId, score);
    return rating;
  }

  myLoans(user: JwtPayload) {
    return this.loans.find({
      where: [{ borrowerId: user.sub }],
      order: { createdAt: 'DESC' },
    });
  }

  async incomingLoans(user: JwtPayload) {
    return this.loans
      .createQueryBuilder('lr')
      .leftJoinAndSelect('lr.listing', 'l')
      .leftJoinAndSelect('lr.borrower', 'b')
      .leftJoinAndSelect('l.owner', 'o')
      .where('l.ownerId = :uid', { uid: user.sub })
      .orderBy('lr.createdAt', 'DESC')
      .getMany();
  }

  /** Hourly overdue sweep - escalating notifications (spec 3.4). */
  @Cron(CronExpression.EVERY_HOUR)
  async escalateOverdue() {
    const overdue = await this.loans.find({
      where: [
        { status: LoanStatus.ACTIVE, dueAt: LessThan(new Date()) },
        { status: LoanStatus.OVERDUE, dueAt: LessThan(new Date()) },
      ],
    });
    for (const loan of overdue) {
      const daysLate = Math.floor((Date.now() - loan.dueAt.getTime()) / 86400_000);
      const level = Math.min(3, 1 + daysLate);
      if (loan.status === LoanStatus.ACTIVE || level > loan.escalationLevel) {
        loan.status = LoanStatus.OVERDUE;
        loan.escalationLevel = level;
        await this.loans.save(loan);
        await this.notifications.notifyUser(
          loan.borrowerId,
          'loan-overdue',
          `Overdue item - escalation level ${level}`,
          `"${loan.listing.title}" is ${daysLate} day(s) overdue. Please return it.`,
          { loanId: loan.id, level },
        );
        if (level >= 2) {
          await this.notifications.notifyUser(
            loan.listing.ownerId,
            'loan-overdue',
            'Your item is overdue',
            `"${loan.listing.title}" has not been returned by the borrower.`,
            { loanId: loan.id, level },
          );
        }
      }
    }
  }

  private async findLoan(id: string) {
    const loan = await this.loans.findOne({ where: { id } });
    if (!loan) throw new NotFoundException('Loan not found');
    return loan;
  }
}
