import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Community feed: students post updates (Facebook-style), staff/admin can post
 * pinned announcements that notify every student. Admins moderate any post.
 */
@Entity('community_posts')
export class CommunityPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true })
  imageUrl: string;

  /** Staff/admin broadcast: styled differently and notifies all students. */
  @Column({ default: false })
  isAnnouncement: boolean;

  /** Pinned posts (announcements) float to the top of the feed. */
  @Column({ default: false })
  pinned: boolean;

  /** Admin soft-moderation: hidden posts disappear from the student feed. */
  @Column({ default: false })
  hidden: boolean;

  @ManyToOne(() => User, { eager: true })
  author: User;

  @Index()
  @Column()
  authorId: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('post_comments')
export class PostComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  postId: string;

  /** Set when this comment is a reply to another comment (one level of threading). */
  @Column({ nullable: true })
  parentId: string;

  @ManyToOne(() => User, { eager: true })
  author: User;

  @Column()
  authorId: string;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('post_likes')
@Index(['postId', 'userId'], { unique: true })
export class PostLike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  postId: string;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
