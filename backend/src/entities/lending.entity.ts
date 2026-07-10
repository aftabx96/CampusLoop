import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LoanStatus } from '../common/enums';
import { User } from './user.entity';

@Entity('lending_listings')
export class LendingListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column()
  category: string;

  @Column({ nullable: true })
  photoUrl: string;

  @Column({ type: 'int', default: 7 })
  maxLoanDays: number;

  @Column({ default: true })
  active: boolean;

  @ManyToOne(() => User, { eager: true })
  owner: User;

  @Column()
  ownerId: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('loan_requests')
export class LoanRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => LendingListing, { eager: true })
  listing: LendingListing;

  @Column()
  listingId: string;

  @ManyToOne(() => User, { eager: true })
  borrower: User;

  @Column()
  borrowerId: string;

  @Column({ type: 'enum', enum: LoanStatus, default: LoanStatus.REQUESTED })
  status: LoanStatus;

  @Column({ type: 'timestamptz' })
  dueAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  returnedAt: Date;

  @Column({ type: 'int', default: 0 })
  escalationLevel: number;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('loan_ratings')
export class LoanRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => LoanRequest)
  loan: LoanRequest;

  @Column()
  loanId: string;

  @Column()
  raterId: string;

  @Column()
  ratedUserId: string;

  @Column({ type: 'int' })
  score: number; // 1-5

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;
}
