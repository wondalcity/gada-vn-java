import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards,
  ParseIntPipe, DefaultValuePipe, Headers,
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

  @Get('managers/:id/sites')
  async getManagerSites(@Param('id') id: string) {
    return this.adminService.getManagerSites(id);
  }

  @Post('managers/:id/sites/:siteId')
  async assignManagerToSite(
    @Param('id') id: string,
    @Param('siteId') siteId: string,
    @Headers('x-admin-email') adminEmail: string,
  ) {
    return this.adminService.assignManagerToSite(id, siteId, adminEmail);
  }

  @Delete('managers/:id/sites/:siteId')
  async unassignManagerFromSite(
    @Param('id') id: string,
    @Param('siteId') siteId: string,
  ) {
    return this.adminService.unassignManagerFromSite(id, siteId);
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

  @Get('workers/:id/contracts')
  async getWorkerContracts(@Param('id') id: string) {
    return this.adminService.getWorkerContracts(id);
  }

  @Get('contracts/:id')
  async getContract(@Param('id') id: string) {
    return this.adminService.getContractById(id);
  }

  @Put('workers/:id/trade-skills')
  async updateWorkerTradeSkills(
    @Param('id') id: string,
    @Body() body: { skills: { tradeId: number; years: number }[] },
  ) {
    return this.adminService.updateWorkerTradeSkills(id, body.skills ?? []);
  }

  @Post('workers')
  async createWorker(@Body() body: { phone: string; fullName: string }) {
    return this.adminService.createWorker(body);
  }

  @Delete('workers/:id')
  async deleteWorker(@Param('id') id: string) {
    return this.adminService.deleteWorker(id);
  }

  // ── Job management ────────────────────────────────────────────────────────

  @Get('jobs')
  async listJobs(
    @Query('status') status = '',
    @Query('search') search = '',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.listJobs(status, search, page, limit);
  }

  @Post('jobs')
  async createJob(@Body() body: Record<string, unknown>) {
    return this.adminService.createJob(body);
  }

  @Get('jobs/:id/roster')
  async getJobRoster(@Param('id') id: string) {
    return this.adminService.getJobRoster(id);
  }

  @Get('jobs/:id')
  async getJob(@Param('id') id: string) {
    return this.adminService.getJob(id);
  }

  @Put('jobs/:id')
  async updateJob(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.adminService.updateJob(id, body);
  }

  @Delete('jobs/:id')
  async deleteJob(@Param('id') id: string) {
    return this.adminService.deleteJob(id);
  }

  // ── Application status management ─────────────────────────────────────────

  @Put('applications/:id/accept')
  async acceptApplication(@Param('id') id: string) {
    return this.adminService.acceptApplication(id);
  }

  @Put('applications/:id/reject')
  async rejectApplication(
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ) {
    return this.adminService.rejectApplication(id, body.notes);
  }

  @Put('applications/:id/reset')
  async resetApplication(@Param('id') id: string) {
    return this.adminService.resetApplication(id);
  }

  // ── Construction company management ──────────────────────────────────────

  @Get('companies')
  async listCompanies(
    @Query('search') search = '',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.listCompanies(search, page, limit);
  }

  @Get('companies/:id')
  async getCompany(@Param('id') id: string) {
    return this.adminService.getCompany(id);
  }

  @Post('companies')
  async createCompany(@Body() body: Record<string, unknown>) {
    return this.adminService.createCompany(body);
  }

  @Put('companies/:id')
  async updateCompany(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.adminService.updateCompany(id, body);
  }

  @Delete('companies/:id')
  async deleteCompany(@Param('id') id: string) {
    return this.adminService.deleteCompany(id);
  }

  @Post('companies/:id/seal')
  async uploadCompanySeal(
    @Param('id') id: string,
    @Body() body: { fileData: string; contentType: string; fileName: string },
  ) {
    return this.adminService.uploadCompanySeal(id, body.fileData, body.contentType);
  }

  @Delete('companies/:id/seal')
  async deleteCompanySeal(@Param('id') id: string) {
    return this.adminService.deleteCompanySeal(id);
  }

  // ── Site management ───────────────────────────────────────────────────────

  @Get('sites')
  async listSites() {
    return this.adminService.listSites();
  }

  @Post('sites')
  async createSite(@Body() body: Record<string, unknown>) {
    return this.adminService.createSite(body);
  }

  @Get('sites/:id')
  async getSite(@Param('id') id: string) {
    return this.adminService.getSite(id);
  }

  @Put('sites/:id')
  async updateSite(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.adminService.updateSite(id, body);
  }

  @Delete('sites/:id')
  async deleteSite(@Param('id') id: string) {
    return this.adminService.deleteSite(id);
  }

  // ── Test account management ───────────────────────────────────────────────

  @Get('test-accounts')
  async listTestAccounts() {
    return this.adminService.listTestAccounts();
  }

  @Post('test-accounts')
  async createTestAccount(
    @Body() body: { phone: string; role: string; name?: string },
  ) {
    return this.adminService.createTestAccount(body);
  }

  @Delete('test-accounts/:id')
  async deleteTestAccount(@Param('id') id: string) {
    return this.adminService.deleteTestAccount(id);
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

  // ── Admin user management ─────────────────────────────────────────────────

  /** Current admin user's profile & permissions (used by frontend on load) */
  @Get('admin-users/me')
  async getAdminMe(@Headers('x-admin-email') email: string) {
    return this.adminService.getAdminUserMe(email);
  }

  /** Accept invite & set password (public endpoint — called before login) */
  @Post('admin-users/accept-invite')
  async acceptInvite(
    @Body() body: { token: string; password: string; name?: string },
  ) {
    return this.adminService.acceptInvite(body.token, body.password, body.name);
  }

  /** List all admin users */
  @Get('admin-users')
  async listAdminUsers() {
    return this.adminService.listAdminUsers();
  }

  /** Invite a new admin user */
  @Post('admin-users/invite')
  async inviteAdminUser(
    @Headers('x-admin-email') inviterEmail: string,
    @Body() body: {
      email: string;
      name?: string;
      role: string;
      permissions?: Record<string, boolean>;
    },
  ) {
    return this.adminService.inviteAdminUser({ ...body, inviterEmail });
  }

  /** Update a user's menu permissions */
  @Put('admin-users/:id/permissions')
  async updateAdminPermissions(
    @Param('id') id: string,
    @Body() body: { permissions: Record<string, boolean> },
  ) {
    return this.adminService.updateAdminPermissions(id, body.permissions);
  }

  /** Change a user's role */
  @Put('admin-users/:id/role')
  async updateAdminRole(
    @Param('id') id: string,
    @Body() body: { role: string },
  ) {
    return this.adminService.updateAdminRole(id, body.role);
  }

  /** Superadmin resets another user's password */
  @Post('admin-users/:id/reset-password')
  async resetAdminPassword(
    @Param('id') id: string,
    @Body() body: { password: string },
  ) {
    return this.adminService.changeAdminPassword(id, body.password);
  }

  /** Change own password (requires old password verification) */
  @Post('admin-users/me/change-password')
  async changeOwnPassword(
    @Headers('x-admin-email') email: string,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.adminService.changeOwnPassword(email, body.oldPassword, body.newPassword);
  }

  /** Disable an admin user account */
  @Delete('admin-users/:id')
  async disableAdminUser(@Param('id') id: string) {
    return this.adminService.disableAdminUser(id);
  }

  // ── Attendance management ─────────────────────────────────────────────────

  @Get('attendance')
  async listAttendance(
    @Query('jobId') jobId?: string,
    @Query('workDate') workDate?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.adminService.listAttendance({ jobId, workDate, status, page, limit });
  }

  @Put('attendance/:id')
  async updateAttendance(
    @Param('id') id: string,
    @Body() body: {
      status?: string;
      workerStatus?: string;
      workHours?: number;
      workMinutes?: number;
      workDurationConfirmed?: boolean;
      notes?: string;
    },
  ) {
    return this.adminService.updateAttendance(id, body);
  }
}
