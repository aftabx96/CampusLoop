import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AssetCondition,
  AvailabilityStatus,
  BookingStatus,
  JwtPayload,
  RecommendedAction,
  Role,
} from '../../common/enums';
import { Asset } from '../../entities/asset.entity';
import { Booking } from '../../entities/booking.entity';
import { AiService } from '../ai/ai.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfirmInspectionDto, CreateBookingDto, ReturnBookingDto } from './dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private bookings: Repository<Booking>,
    private dataSource: DataSource,
    private notifications: NotificationsService,
    private ai: AiService,
  ) {}

  /**
   * Concurrency-safe booking. The asset row is locked with
   * `SELECT ... FOR UPDATE` inside a transaction, then overlap is checked,
   * so two concurrent requests for the same slot serialize at the DB level
   * and the loser gets a 409.
   */
  async create(dto: CreateBookingDto, user: JwtPayload) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt)
      throw new BadRequestException('endsAt must be after startsAt');

    return this.dataSource.transaction(async (manager) => {
      const asset = await manager
        .getRepository(Asset)
        .createQueryBuilder('a')
        .setLock('pessimistic_write')
        .where('a.id = :id', { id: dto.assetId })
        .getOne();
      if (!asset) throw new NotFoundException('Asset not found');
      if (asset.availability !== AvailabilityStatus.AVAILABLE)
        throw new BadRequestException('Asset is not available for booking');

      const leadMs = asset.bookingLeadTimeHours * 3600_000;
      if (startsAt.getTime() - Date.now() < leadMs)
        throw new BadRequestException(
          `This asset requires ${asset.bookingLeadTimeHours}h booking lead time`,
        );

      const overlap = await manager
        .getRepository(Booking)
        .createQueryBuilder('b')
        .where('b.assetId = :assetId', { assetId: dto.assetId })
        .andWhere('b.status IN (:...statuses)', {
          statuses: [BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.ACTIVE],
        })
        .andWhere('b.startsAt < :endsAt AND b.endsAt > :startsAt', {
          startsAt,
          endsAt,
        })
        .getCount();
      if (overlap > 0)
        throw new ConflictException('Time slot already booked for this asset');

      const threshold = parseFloat(process.env.HIGH_VALUE_THRESHOLD || '100000');
      const needsApproval = Number(asset.value) >= threshold;

      const booking = manager.getRepository(Booking).create({
        assetId: dto.assetId,
        requesterId: user.sub,
        startsAt,
        endsAt,
        purpose: dto.purpose,
        conditionAtBorrow: asset.condition,
        status: needsApproval ? BookingStatus.PENDING : BookingStatus.APPROVED,
      });
      const saved = await manager.getRepository(Booking).save(booking);

      if (needsApproval) {
        this.notifications.notifyRole(Role.STAFF, 'booking:pending', {
          bookingId: saved.id,
          assetName: asset.name,
          departmentId: asset.departmentId,
        });
      } else {
        await this.notifications.notifyUser(
          user.sub,
          'booking',
          'Booking confirmed',
          `Your booking for "${asset.name}" is confirmed.`,
          { bookingId: saved.id, status: saved.status },
        );
      }
      return saved;
    });
  }

  async availability(assetId: string, from: string, to: string) {
    return this.bookings
      .createQueryBuilder('b')
      .where('b.assetId = :assetId', { assetId })
      .andWhere('b.status IN (:...statuses)', {
        statuses: [BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.ACTIVE],
      })
      .andWhere('b.startsAt < :to AND b.endsAt > :from', {
        from: new Date(from),
        to: new Date(to),
      })
      .select(['b.id', 'b.startsAt', 'b.endsAt', 'b.status'])
      .getMany();
  }

  listMine(user: JwtPayload) {
    return this.bookings.find({
      where: { requesterId: user.sub },
      order: { createdAt: 'DESC' },
    });
  }

  /** Staff see pending bookings for assets in their department. */
  async listPendingForManager(user: JwtPayload) {
    const qb = this.bookings
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.asset', 'a')
      .leftJoinAndSelect('b.requester', 'u')
      .leftJoinAndSelect('a.department', 'd')
      .where('b.status = :status', { status: BookingStatus.PENDING });
    if (user.role === Role.STAFF)
      qb.andWhere('a.departmentId = :dept', { dept: user.departmentId });
    return qb.orderBy('b.createdAt', 'ASC').getMany();
  }

  /** Returned items awaiting inspection confirmation in my department. */
  async listReturnedForManager(user: JwtPayload) {
    const qb = this.bookings
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.asset', 'a')
      .leftJoinAndSelect('b.requester', 'u')
      .leftJoinAndSelect('a.department', 'd')
      .where('b.status = :status', { status: BookingStatus.RETURNED })
      .andWhere('b.conditionAtReturn IS NULL OR b.aiAssessment IS NOT NULL');
    if (user.role === Role.STAFF)
      qb.andWhere('a.departmentId = :dept', { dept: user.departmentId });
    return qb.orderBy('b.createdAt', 'DESC').take(30).getMany();
  }

  async decide(id: string, decision: 'APPROVED' | 'DECLINED', user: JwtPayload) {
    const booking = await this.findOne(id);
    if (booking.status !== BookingStatus.PENDING)
      throw new BadRequestException('Booking already decided');
    if (user.role === Role.STAFF && booking.asset.departmentId !== user.departmentId)
      throw new ForbiddenException('Not your department asset');

    booking.status =
      decision === 'APPROVED' ? BookingStatus.APPROVED : BookingStatus.DECLINED;
    booking.decidedById = user.sub;
    booking.decidedAt = new Date();
    await this.bookings.save(booking);

    // Real-time notification to the requester (spec 3.3)
    await this.notifications.notifyUser(
      booking.requesterId,
      'booking',
      `Booking ${decision.toLowerCase()}`,
      `Your booking for "${booking.asset.name}" was ${decision.toLowerCase()}.`,
      { bookingId: booking.id, status: booking.status },
    );
    return booking;
  }

  /**
   * Student returns an item with a photo + short description.
   * AI pre-fills the inspection report (Feature 2); falls back to manual.
   */
  async returnItem(
    id: string,
    dto: ReturnBookingDto,
    user: JwtPayload,
    photoPath?: string,
    photoUrl?: string,
  ) {
    const booking = await this.findOne(id);
    if (booking.requesterId !== user.sub)
      throw new ForbiddenException('Not your booking');
    if (![BookingStatus.APPROVED, BookingStatus.ACTIVE].includes(booking.status))
      throw new BadRequestException('Booking is not active');

    booking.returnNotes = dto.description;
    booking.returnPhotoUrl = photoUrl ?? null;

    const assessment = await this.ai.assessCondition({
      photoPath,
      description: dto.description,
      conditionAtBorrow: booking.conditionAtBorrow ?? AssetCondition.GOOD,
      assetName: booking.asset.name,
    });
    booking.aiAssessment = assessment as unknown as Record<string, unknown>;
    if (assessment) {
      booking.conditionAtReturn = assessment.condition;
      booking.recommendedAction = assessment.recommendedAction;
    } else if (dto.condition) {
      booking.conditionAtReturn = dto.condition;
    }
    booking.status = BookingStatus.RETURNED;
    await this.bookings.save(booking);

    this.notifications.notifyRole(Role.STAFF, 'inspection:pending', {
      bookingId: booking.id,
      assetName: booking.asset.name,
      aiPrefilled: !!assessment,
    });
    return booking;
  }

  /** Manager confirms or overrides the AI assessment before it is saved. */
  async confirmInspection(id: string, dto: ConfirmInspectionDto, user: JwtPayload) {
    const booking = await this.findOne(id);
    if (user.role === Role.STAFF && booking.asset.departmentId !== user.departmentId)
      throw new ForbiddenException('Not your department asset');

    booking.conditionAtReturn = dto.condition;
    booking.recommendedAction = dto.recommendedAction;
    if (dto.notes) booking.returnNotes = `${booking.returnNotes ?? ''}\n[Inspector] ${dto.notes}`;
    await this.bookings.save(booking);

    // propagate confirmed condition to the asset
    const assetRepo = this.dataSource.getRepository(Asset);
    const availability =
      dto.recommendedAction === RecommendedAction.RETIRE
        ? AvailabilityStatus.RETIRED
        : dto.recommendedAction === RecommendedAction.NEEDS_REPAIR
          ? AvailabilityStatus.MAINTENANCE
          : AvailabilityStatus.AVAILABLE;
    await assetRepo.update(booking.assetId, { condition: dto.condition, availability });

    return booking;
  }

  async findOne(id: string) {
    const booking = await this.bookings.findOne({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }
}
