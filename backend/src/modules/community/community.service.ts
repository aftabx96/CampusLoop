import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { JwtPayload, Role } from '../../common/enums';
import { CommunityPost, PostComment, PostLike } from '../../entities/community.entity';
import { User } from '../../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

/** Slim author projection so we never leak sensitive user columns to the feed. */
const slimAuthor = (u: User) => ({
  id: u.id,
  fullName: u.fullName,
  role: u.role,
  department: u.department?.name ?? null,
});

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(CommunityPost) private posts: Repository<CommunityPost>,
    @InjectRepository(PostComment) private comments: Repository<PostComment>,
    @InjectRepository(PostLike) private likes: Repository<PostLike>,
    @InjectRepository(User) private users: Repository<User>,
    private notifications: NotificationsService,
  ) {}

  /** Feed newest-first, announcements pinned on top. Hidden posts only for admins. */
  async listFeed(user: JwtPayload) {
    const isAdmin = user.role === Role.ADMIN;
    const posts = await this.posts.find({
      where: isAdmin ? {} : { hidden: false },
      order: { pinned: 'DESC', createdAt: 'DESC' },
      take: 100,
    });
    if (!posts.length) return [];

    const ids = posts.map((p) => p.id);
    const likeRows = await this.likes.find({ where: { postId: In(ids) } });
    const commentRows = await this.comments
      .createQueryBuilder('c')
      .select('c.postId', 'postId')
      .addSelect('COUNT(*)', 'count')
      .where('c.postId IN (:...ids)', { ids })
      .groupBy('c.postId')
      .getRawMany<{ postId: string; count: string }>();

    const commentCount = new Map(commentRows.map((r) => [r.postId, Number(r.count)]));
    const likeCount = new Map<string, number>();
    const likedByMe = new Set<string>();
    for (const l of likeRows) {
      likeCount.set(l.postId, (likeCount.get(l.postId) ?? 0) + 1);
      if (l.userId === user.sub) likedByMe.add(l.postId);
    }

    return posts.map((p) => ({
      id: p.id,
      content: p.content,
      imageUrl: p.imageUrl,
      isAnnouncement: p.isAnnouncement,
      pinned: p.pinned,
      hidden: p.hidden,
      createdAt: p.createdAt,
      author: slimAuthor(p.author),
      likeCount: likeCount.get(p.id) ?? 0,
      commentCount: commentCount.get(p.id) ?? 0,
      likedByMe: likedByMe.has(p.id),
      canDelete: isAdmin || p.authorId === user.sub,
    }));
  }

  /** People directory for @mention autocomplete (any signed-in user). */
  async listPeople() {
    const users = await this.users.find({ order: { fullName: 'ASC' } });
    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      role: u.role,
      department: u.department?.name ?? null,
      studentNumber: u.studentNumber ?? null,
      email: u.email,
    }));
  }

  /**
   * Notify every user whose exact full name appears after an `@` in the text.
   * The frontend inserts the canonical full name on mention-select, so matching
   * on `@${fullName}` is reliable. The author never notifies themselves.
   */
  private async notifyMentions(content: string, actor: User, postId: string) {
    if (!content.includes('@')) return;
    const users = await this.users.find();
    const mentioned = users.filter(
      (u) => u.id !== actor.id && content.includes(`@${u.fullName}`),
    );
    const preview = content.length > 140 ? `${content.slice(0, 140)}…` : content;
    await Promise.all(
      mentioned.map((u) =>
        this.notifications.notifyUser(
          u.id,
          'mention',
          `${actor.fullName} mentioned you`,
          preview,
          { postId },
        ),
      ),
    );
  }

  async createPost(user: JwtPayload, content: string, imageUrl?: string) {
    const author = await this.users.findOne({ where: { id: user.sub } });
    const post = await this.posts.save(
      this.posts.create({ authorId: user.sub, content: content.trim(), imageUrl }),
    );
    if (author) await this.notifyMentions(post.content, author, post.id);
    return post;
  }

  /**
   * Staff/admin broadcast: a pinned announcement post plus a persisted, real-time
   * notification for every student (so it lands in their bell and toasts live).
   */
  async announce(user: JwtPayload, content: string, imageUrl?: string) {
    const author = await this.users.findOne({ where: { id: user.sub } });
    const post = await this.posts.save(
      this.posts.create({
        authorId: user.sub,
        content: content.trim(),
        imageUrl,
        isAnnouncement: true,
        pinned: true,
      }),
    );

    const students = await this.users.find({ where: { role: Role.STUDENT } });
    const preview = content.trim().length > 140 ? `${content.trim().slice(0, 140)}…` : content.trim();
    await Promise.all(
      students.map((s) =>
        this.notifications.notifyUser(
          s.id,
          'announcement',
          `Announcement from ${author?.fullName ?? 'staff'}`,
          preview,
          { postId: post.id },
        ),
      ),
    );
    return post;
  }

  async deletePost(user: JwtPayload, id: string) {
    const post = await this.posts.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    if (user.role !== Role.ADMIN && post.authorId !== user.sub) {
      throw new ForbiddenException('You can only delete your own posts');
    }
    await this.posts.delete(id);
    return { success: true };
  }

  /** Admin moderation: soft-hide/unhide a post from the student feed. */
  async setHidden(id: string, hidden: boolean) {
    const post = await this.posts.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    post.hidden = hidden;
    await this.posts.save(post);
    return { id, hidden };
  }

  async toggleLike(user: JwtPayload, postId: string) {
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    const existing = await this.likes.findOne({ where: { postId, userId: user.sub } });
    if (existing) {
      await this.likes.delete(existing.id);
    } else {
      await this.likes.save(this.likes.create({ postId, userId: user.sub }));
      // Notify the author when someone else likes their post.
      if (post.authorId !== user.sub) {
        const actor = await this.users.findOne({ where: { id: user.sub } });
        const preview = post.content.length > 80 ? `${post.content.slice(0, 80)}…` : post.content;
        await this.notifications.notifyUser(
          post.authorId,
          'like',
          `${actor?.fullName ?? 'Someone'} liked your post`,
          preview,
          { postId },
        );
      }
    }
    const likeCount = await this.likes.count({ where: { postId } });
    return { liked: !existing, likeCount };
  }

  async listComments(postId: string) {
    const rows = await this.comments.find({
      where: { postId },
      order: { createdAt: 'ASC' },
    });
    return rows.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      parentId: c.parentId ?? null,
      author: slimAuthor(c.author),
      authorId: c.authorId,
    }));
  }

  async addComment(user: JwtPayload, postId: string, content: string, parentId?: string) {
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    let parent: PostComment | null = null;
    if (parentId) {
      parent = await this.comments.findOne({ where: { id: parentId } });
      if (!parent) throw new NotFoundException('Parent comment not found');
    }

    const saved = await this.comments.save(
      this.comments.create({
        postId,
        authorId: user.sub,
        content: content.trim(),
        parentId: parent?.id,
      }),
    );
    const withAuthor = await this.comments.findOne({ where: { id: saved.id } });
    const actor = withAuthor!.author;

    if (parent) {
      // A reply notifies the parent comment's author.
      if (parent.authorId !== user.sub) {
        await this.notifications.notifyUser(
          parent.authorId,
          'reply',
          `${actor.fullName} replied to your comment`,
          content.trim(),
          { postId },
        );
      }
    } else if (post.authorId !== user.sub) {
      // A top-level comment notifies the post's author.
      await this.notifications.notifyUser(
        post.authorId,
        'comment',
        `${actor.fullName} commented on your post`,
        content.trim(),
        { postId },
      );
    }
    await this.notifyMentions(content.trim(), actor, postId);

    return {
      id: withAuthor!.id,
      content: withAuthor!.content,
      createdAt: withAuthor!.createdAt,
      parentId: withAuthor!.parentId ?? null,
      author: slimAuthor(actor),
      authorId: withAuthor!.authorId,
    };
  }

  async deleteComment(user: JwtPayload, id: string) {
    const comment = await this.comments.findOne({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (user.role !== Role.ADMIN && comment.authorId !== user.sub) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    await this.comments.delete(id);
    return { success: true };
  }
}
