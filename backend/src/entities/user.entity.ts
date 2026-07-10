import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '../common/enums';
import { Department } from './department.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column()
  fullName: string;

  @Column({ type: 'enum', enum: Role, default: Role.STUDENT })
  role: Role;

  @ManyToOne(() => Department, (d) => d.users, { nullable: true, eager: true })
  department: Department;

  @Column({ nullable: true })
  departmentId: string;

  @Column({ nullable: true })
  studentNumber: string;

  @Column({ type: 'float', default: 5.0 })
  reputationScore: number;

  @Column({ type: 'int', default: 0 })
  ratingsCount: number;

  @Column({ default: true })
  lendingEligible: boolean;

  @Column({ nullable: true, select: false })
  refreshTokenHash: string;

  @CreateDateColumn()
  createdAt: Date;
}
