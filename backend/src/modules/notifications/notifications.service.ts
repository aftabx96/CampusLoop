import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notifications: Repository<Notification>,
    private gateway: NotificationsGateway,
  ) {}

  /** Persist + push in real time over the user's socket room. */
  async notifyUser(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    const n = await this.notifications.save(
      this.notifications.create({ userId, type, title, body, data }),
    );
    this.gateway.emitToUser(userId, 'notification', n);
    return n;
  }

  notifyRole(role: string, event: string, data: unknown) {
    this.gateway.emitToRole(role, event, data);
  }

  listForUser(userId: string) {
    return this.notifications.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markRead(userId: string, id: string) {
    await this.notifications.update({ id, userId }, { read: true });
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.notifications.update({ userId, read: false }, { read: true });
    return { success: true };
  }
}
