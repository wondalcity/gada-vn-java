import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { AdminRepository } from './admin.repository';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly repo: AdminRepository,
    private readonly notifications: NotificationsService,
  ) {}

  async listManagers(status: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.repo.findManagersPaginated(status, page, limit),
      this.repo.countManagers(status),
    ]);
    return { data, total, page, limit };
  }

  async getManager(id: string) {
    const manager = await this.repo.findManagerById(id);
    if (!manager) throw new NotFoundException(`Manager ${id} not found`);
    return manager;
  }

  async approveManager(id: string) {
    const manager = await this.repo.findManagerById(id);
    if (!manager) throw new NotFoundException(`Manager ${id} not found`);
    return this.repo.approveManager(id);
  }

  async rejectManager(id: string, reason: string) {
    const manager = await this.repo.findManagerById(id);
    if (!manager) throw new NotFoundException(`Manager ${id} not found`);
    return this.repo.rejectManager(id, reason);
  }

  // ── Notification management ───────────────────────────────────────────────

  async searchUsers(search: string, role: string, limit = 30) {
    return this.repo.searchUsers(search, role, limit);
  }

  async getUsersByRole(role: string) {
    return this.repo.getUsersByRole(role);
  }

  async sendBulkNotification(
    userIds: string[],
    title: string,
    body: string,
    channels: ('push' | 'sms')[],
    type = 'ADMIN',
  ) {
    const results = { push: 0, sms: 0, errors: [] as string[] };

    if (channels.includes('push')) {
      for (const userId of userIds) {
        try {
          await this.notifications.send(userId, type, title, body);
          results.push++;
        } catch (err) {
          this.logger.warn(`Push failed for ${userId}: ${err}`);
          results.errors.push(`push:${userId}`);
        }
      }
    }

    if (channels.includes('sms')) {
      const phoneRows = await this.repo.getUserPhones(userIds);
      for (const { phone } of phoneRows) {
        try {
          await this.sendSms(phone, `[GADA] ${title}\n${body}`);
          results.sms++;
        } catch (err) {
          this.logger.warn(`SMS failed for ${phone}: ${err}`);
        }
      }
    }

    return results;
  }

  private async sendSms(phone: string, message: string): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[SMS DEV] To: ${phone} | ${message}`);
      return;
    }
    // TODO: integrate real SMS provider (e.g. Twilio, ESMS.vn)
    // Example: await this.smsProvider.send(phone, message);
    this.logger.warn(`SMS provider not configured. Would send to ${phone}`);
  }

  async getPushSchedules() {
    return this.repo.findPushSchedules();
  }

  async createPushSchedule(data: {
    title: string;
    body: string;
    targetUserIds?: string[];
    targetRole?: string;
    scheduledAt: string;
  }) {
    return this.repo.createPushSchedule(data);
  }

  async cancelPushSchedule(id: string) {
    const schedule = await this.repo.cancelPushSchedule(id);
    if (!schedule) throw new NotFoundException(`Schedule ${id} not found or already processed`);
    return schedule;
  }
}
