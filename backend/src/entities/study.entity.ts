import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MatchStatus, StudyStyle } from '../common/enums';
import { User } from './user.entity';

@Entity('study_profiles')
export class StudyProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @Column({ unique: true })
  userId: string;

  @Column({ type: 'simple-array' })
  modules: string[];

  /** e.g. ["MON 14:00-16:00", "WED 10:00-12:00"] */
  @Column({ type: 'simple-array' })
  availableSlots: string[];

  @Column({ type: 'enum', enum: StudyStyle, default: StudyStyle.GROUP })
  studyStyle: StudyStyle;

  @Column({ default: true })
  seekingPartners: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('study_matches')
export class StudyMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  userA: User;

  @Column()
  userAId: string;

  @ManyToOne(() => User, { eager: true })
  userB: User;

  @Column()
  userBId: string;

  @Column({ type: 'float' })
  compatibilityScore: number;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'enum', enum: MatchStatus, default: MatchStatus.PROPOSED })
  status: MatchStatus;

  @Column({ type: 'simple-array', default: '' })
  acceptedBy: string[];

  @CreateDateColumn()
  createdAt: Date;
}
