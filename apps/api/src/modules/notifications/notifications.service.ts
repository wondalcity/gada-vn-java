import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  async findByUser(
    userId: string,
    page: number,
    limit: number,
    unreadOnly: boolean,
  ) {
    return this.repo.findByUserId(userId, page, limit, unreadOnly);
  }

  async markRead(id: string, userId: string) {
    const notification = await this.repo.findById(id, userId);
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    return this.repo.markRead(id, userId);
  }

  async markAllRead(userId: string) {
    const count = await this.repo.markAllRead(userId);
    return { updated: count };
  }

  // Called internally by other services to send notifications
  async send(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    return this.repo.create(userId, type, title, body, data);
  }
}
