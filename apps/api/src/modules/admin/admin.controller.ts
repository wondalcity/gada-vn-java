import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminServiceKeyGuard } from './admin.guard';

@Controller('admin')
@UseGuards(AdminServiceKeyGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Manager approval ─────────────────────────────────────────────────────

  @Get('managers')
  async listManagers(
    @Query('status') status = 'PENDING',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.listManagers(status, page, limit);
  }

  @Get('managers/:id')
  async getManager(@Param('id') id: string) {
    return this.adminService.getManager(id);
  }

  @Post('managers/:id/approve')
  async approveManager(@Param('id') id: string) {
    return this.adminService.approveManager(id);
  }

  @Post('managers/:id/reject')
  async rejectManager(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.adminService.rejectManager(id, body.reason ?? '');
  }

  @Post('managers/:id/revoke')
  async revokeManager(@Param('id') id: string) {
    return this.adminService.revokeManager(id);
  }

  @Put('managers/:id')
  async updateManagerProfile(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.adminService.updateManagerProfile(id, body);
  }

  // ── Notification management ───────────────────────────────────────────────

  /** Search users for notification targeting */
  @Get('notification-users')
  async searchNotificationUsers(
    @Query('search') search = '',
    @Query('role') role = '',
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
  ) {
    if (search.length === 0 && role) {
      return this.adminService.getUsersByRole(role);
    }
    return this.adminService.searchUsers(search, role, limit);
  }

  /** Send push/SMS notification to selected users immediately */
  @Post('notifications/send')
  async sendNotification(
    @Body() body: {
      userIds: string[];
      title: string;
      body: string;
      channels?: ('push' | 'sms')[];
      type?: string;
    },
  ) {
    const channels = body.channels ?? ['push'];
    return this.adminService.sendBulkNotification(
      body.userIds,
      body.title,
      body.body,
      channels,
      body.type ?? 'ADMIN',
    );
  }

  /** List scheduled notifications */
  @Get('notifications/schedules')
  async getPushSchedules() {
    return this.adminService.getPushSchedules();
  }

  /** Schedule a future notification */
  @Post('notifications/schedule')
  async scheduleNotification(
    @Body() body: {
      title: string;
      body: string;
      targetUserIds?: string[];
      targetRole?: string;
      scheduledAt: string;
    },
  ) {
    return this.adminService.createPushSchedule(body);
  }

  /** Cancel a scheduled notification */
  @Delete('notifications/schedules/:id')
  async cancelSchedule(@Param('id') id: string) {
    return this.adminService.cancelPushSchedule(id);
  }
}
