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

  @Post('managers/promote-worker')
  async promoteWorker(@Body() body: Record<string, unknown>) {
    return this.adminService.promoteWorkerToManager(body);
  }

  // ── Worker management ────────────────────────────────────────────────────

  @Get('workers')
  async listWorkers(
    @Query('search') search = '',
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.listWorkers(search, limit);
  }

  @Get('trades')
  async listTrades() {
    return this.adminService.getAllTrades();
  }

  @Get('workers/:id')
  async getWorker(@Param('id') id: string) {
    return this.adminService.getWorker(id);
  }

  @Get('workers/:id/trade-skills')
  async getWorkerTradeSkills(@Param('id') id: string) {
    return this.adminService.getWorkerTradeSkills(id);
  }

  @Put('workers/:id')
  async updateWorker(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.adminService.updateWorker(id, body);
  }

  @Put('workers/:id/trade-skills')
  async updateWorkerTradeSkills(
    @Param('id') id: string,
    @Body() body: { skills: { tradeId: number; years: number }[] },
  ) {
    return this.adminService.updateWorkerTradeSkills(id, body.skills ?? []);
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
