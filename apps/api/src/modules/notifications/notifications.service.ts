import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { FirebaseService } from '../../common/firebase/firebase.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repo: NotificationsRepository,
    private readonly firebase: FirebaseService,
  ) {}

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

  /**
   * Store notification in DB and push via FCM if tokens are available.
   * Never throws — FCM failures are non-fatal.
   */
  async send(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ) {
    let sentViaFcm = false;
    let fcmMessageId: string | undefined;

    try {
      const tokens = await this.repo.getFcmTokens(userId);
      if (tokens.length > 0) {
        const stringData = data
          ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
          : undefined;

        const result = await this.firebase.sendMulticastNotification(
          tokens,
          { title, body },
          stringData,
        );
        sentViaFcm = result.successCount > 0;
        fcmMessageId = result.responses.find((r) => r.success)?.messageId;
      }
    } catch (err) {
      this.logger.warn(`FCM push failed for user ${userId}: ${err}`);
    }

    return this.repo.create(userId, type, title, body, data, sentViaFcm, fcmMessageId);
  }
}
