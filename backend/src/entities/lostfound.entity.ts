import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FoundItemStatus, LostItemStatus } from '../common/enums';
import { User } from './user.entity';

@Entity('lost_reports')
export class LostReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  lastSeenLocation: string;

  @Column({ nullable: true })
  photoUrl: string;

  @Column({ type: 'enum', enum: LostItemStatus, default: LostItemStatus.OPEN })
  status: LostItemStatus;

  @ManyToOne(() => User, { eager: true })
  reporter: User;

  @Column()
  reporterId: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('found_items')
export class FoundItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column()
  foundLocation: string;

  @Column({ type: 'text', nullable: true })
  conditionNotes: string;

  @Column({ nullable: true })
  photoUrl: string;

  @Column({ type: 'enum', enum: FoundItemStatus, default: FoundItemStatus.LOGGED })
  status: FoundItemStatus;

  @Column({ nullable: true })
  matchedLostReportId: string;

  @ManyToOne(() => User, { eager: true })
  loggedBy: User;

  @Column()
  loggedById: string;

  @CreateDateColumn()
  createdAt: Date;
}
