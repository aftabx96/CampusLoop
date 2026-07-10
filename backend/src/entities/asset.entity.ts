import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  AssetCategory,
  AssetCondition,
  AssetKind,
  AvailabilityStatus,
} from '../common/enums';
import { Department } from './department.entity';

/**
 * Polymorphic asset model: one table models physical items, rooms and
 * loanable goods via `kind` plus a JSONB `attributes` bag for
 * kind-specific fields (room capacity, ISBN, serial number, ...).
 */
@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'enum', enum: AssetCategory })
  category: AssetCategory;

  @Column({ type: 'enum', enum: AssetKind, default: AssetKind.PHYSICAL_ITEM })
  kind: AssetKind;

  @Column({ type: 'enum', enum: AssetCondition, default: AssetCondition.GOOD })
  condition: AssetCondition;

  @Column({
    type: 'enum',
    enum: AvailabilityStatus,
    default: AvailabilityStatus.AVAILABLE,
  })
  availability: AvailabilityStatus;

  @ManyToOne(() => Department, (d) => d.assets, { eager: true })
  department: Department;

  @Column()
  departmentId: string;

  @Column({ type: 'simple-array', default: '' })
  tags: string[];

  @Column({ type: 'int', default: 0 })
  bookingLeadTimeHours: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  value: number;

  @Column({ nullable: true })
  photoUrl: string;

  @Column({ type: 'jsonb', default: {} })
  attributes: Record<string, unknown>;

  /** kept in sync by trigger-free updates in service; used for full-text search */
  @Index('idx_assets_search', { synchronize: false })
  @Column({ type: 'tsvector', nullable: true, select: false, insert: false, update: false })
  searchVector: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
