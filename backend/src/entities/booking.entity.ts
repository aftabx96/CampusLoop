import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AssetCondition, BookingStatus, RecommendedAction } from '../common/enums';
import { Asset } from './asset.entity';
import { User } from './user.entity';

@Entity('bookings')
@Index(['assetId', 'startsAt', 'endsAt'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Asset, { eager: true })
  asset: Asset;

  @Column()
  assetId: string;

  @ManyToOne(() => User, { eager: true })
  requester: User;

  @Column()
  requesterId: string;

  @Column({ type: 'timestamptz' })
  startsAt: Date;

  @Column({ type: 'timestamptz' })
  endsAt: Date;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ nullable: true })
  purpose: string;

  @Column({ nullable: true })
  decidedById: string;

  @Column({ type: 'timestamptz', nullable: true })
  decidedAt: Date;

  // ── return / condition report ──
  @Column({ type: 'enum', enum: AssetCondition, nullable: true })
  conditionAtBorrow: AssetCondition;

  @Column({ type: 'enum', enum: AssetCondition, nullable: true })
  conditionAtReturn: AssetCondition;

  @Column({ type: 'text', nullable: true })
  returnNotes: string;

  @Column({ nullable: true })
  returnPhotoUrl: string;

  @Column({ type: 'enum', enum: RecommendedAction, nullable: true })
  recommendedAction: RecommendedAction;

  @Column({ type: 'jsonb', nullable: true })
  aiAssessment: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
