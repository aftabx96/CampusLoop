import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @Column()
  type: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ default: false })
  read: boolean;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
