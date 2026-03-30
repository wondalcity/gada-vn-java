import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { AdminRepository } from './admin.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { FirebaseService } from '../../common/firebase/firebase.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly repo: AdminRepository,
    private readonly notifications: NotificationsService,
    private readonly firebase: FirebaseService,
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

  async revokeManager(id: string) {
    const manager = await this.repo.findManagerById(id);
    if (!manager) throw new NotFoundException(`Manager ${id} not found`);
    return this.repo.revokeManager(id);
  }

  async updateManagerProfile(id: string, data: Record<string, unknown>) {
    const manager = await this.repo.findManagerById(id);
    if (!manager) throw new NotFoundException(`Manager ${id} not found`);
    return this.repo.updateManagerProfile(id, data);
  }

  async getManagerSites(managerId: string) {
    const manager = await this.repo.findManagerById(managerId);
    if (!manager) throw new NotFoundException(`Manager ${managerId} not found`);
    return this.repo.findManagerSites(managerId);
  }

  async assignManagerToSite(managerId: string, siteId: string, assignedBy?: string) {
    const manager = await this.repo.findManagerById(managerId);
    if (!manager) throw new NotFoundException(`Manager ${managerId} not found`);
    return this.repo.assignManagerToSite(managerId, siteId, assignedBy);
  }

  async unassignManagerFromSite(managerId: string, siteId: string) {
    return this.repo.unassignManagerFromSite(managerId, siteId);
  }

  // ── Worker management ─────────────────────────────────────────────────────

  async listWorkers(search: string, limit: number) {
    const [data, total] = await Promise.all([
      this.repo.findWorkers(search, limit),
      this.repo.countWorkers(search),
    ]);
    return { data, total };
  }

  async getWorker(id: string) {
    const worker = await this.repo.findWorkerById(id);
    if (!worker) throw new NotFoundException(`Worker ${id} not found`);
    return worker;
  }

  async getWorkerTradeSkills(id: string) {
    return this.repo.findWorkerTradeSkills(id);
  }

  async getAllTrades() {
    return this.repo.findAllTrades();
  }

  async updateWorker(id: string, data: Record<string, unknown>) {
    const worker = await this.repo.findWorkerById(id);
    if (!worker) throw new NotFoundException(`Worker ${id} not found`);
    return this.repo.updateWorkerProfile(id, data);
  }

  async updateWorkerTradeSkills(id: string, skills: { tradeId: number; years: number }[]) {
    return this.repo.replaceWorkerTradeSkills(id, skills);
  }

  async promoteWorkerToManager(data: Record<string, unknown>) {
    if (!data.userId) throw new NotFoundException('userId is required');
    return this.repo.promoteWorker(data as Parameters<typeof this.repo.promoteWorker>[0]);
  }

  async createWorker(data: { phone: string; fullName: string }) {
    const { uid } = await this.firebase.getOrCreateUserByPhone(data.phone);
    return this.repo.createWorkerProfile(uid, data.phone, data.fullName);
  }

  async deleteWorker(id: string) {
    const worker = await this.repo.findWorkerById(id);
    if (!worker) throw new NotFoundException(`Worker ${id} not found`);
    return this.repo.deleteWorkerProfile(id);
  }

  // ── Job management ────────────────────────────────────────────────────────

  async listJobs(status: string, page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.repo.findJobs(status, page, limit),
      this.repo.countJobs(status),
    ]);
    return { data, total, page, limit };
  }

  async getJob(id: string) {
    const job = await this.repo.findJobById(id);
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return job;
  }

  async createJob(data: Record<string, unknown>) {
    return this.repo.createJob(data);
  }

  async updateJob(id: string, data: Record<string, unknown>) {
    const job = await this.repo.findJobById(id);
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return this.repo.updateJob(id, data);
  }

  async deleteJob(id: string) {
    const job = await this.repo.findJobById(id);
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return this.repo.cancelJob(id);
  }

  async getJobRoster(jobId: string) {
    const result = await this.repo.findJobRoster(jobId);
    if (!result.job) throw new NotFoundException(`Job ${jobId} not found`);
    return result;
  }

  async acceptApplication(id: string) {
    const updated = await this.repo.updateApplicationStatus(id, 'ACCEPTED');
    if (!updated) throw new NotFoundException(`Application ${id} not found`);
    const workerUserId = await this.repo.getWorkerUserIdByApplication(id);
    if (workerUserId) {
      this.notifications.send(
        workerUserId, 'APPLICATION_ACCEPTED',
        '지원이 수락되었습니다 ✅',
        '축하합니다! 지원이 수락되었습니다. 계약서를 확인해 주세요.',
        { applicationId: id },
      ).catch(() => undefined);
    }
    return updated;
  }

  async rejectApplication(id: string, notes?: string) {
    const updated = await this.repo.updateApplicationStatus(id, 'REJECTED', notes);
    if (!updated) throw new NotFoundException(`Application ${id} not found`);
    const workerUserId = await this.repo.getWorkerUserIdByApplication(id);
    if (workerUserId) {
      this.notifications.send(
        workerUserId, 'APPLICATION_REJECTED',
        '지원 결과 안내',
        '아쉽게도 이번 일자리 지원이 수락되지 않았습니다.',
        { applicationId: id },
      ).catch(() => undefined);
    }
    return updated;
  }

  async resetApplication(id: string) {
    const updated = await this.repo.resetApplication(id);
    if (!updated) throw new NotFoundException(`Application ${id} not found`);
    return updated;
  }

  // ── Construction company management ──────────────────────────────────────

  async listCompanies() {
    return this.repo.findCompanies();
  }

  async getCompany(id: string) {
    const company = await this.repo.findCompanyById(id);
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    return company;
  }

  async createCompany(data: Record<string, unknown>) {
    return this.repo.createCompany(data);
  }

  async updateCompany(id: string, data: Record<string, unknown>) {
    const company = await this.repo.findCompanyById(id);
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    return this.repo.updateCompany(id, data);
  }

  async deleteCompany(id: string) {
    const company = await this.repo.findCompanyById(id);
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    return this.repo.deleteCompany(id);
  }

  // ── Site management ───────────────────────────────────────────────────────

  async listSites() {
    return this.repo.findSites();
  }

  async getSite(id: string) {
    const site = await this.repo.findSiteById(id);
    if (!site) throw new NotFoundException(`Site ${id} not found`);
    return site;
  }

  async createSite(data: Record<string, unknown>) {
    return this.repo.createSite(data);
  }

  async updateSite(id: string, data: Record<string, unknown>) {
    const site = await this.repo.findSiteById(id);
    if (!site) throw new NotFoundException(`Site ${id} not found`);
    return this.repo.updateSite(id, data);
  }

  async deleteSite(id: string) {
    const site = await this.repo.findSiteById(id);
    if (!site) throw new NotFoundException(`Site ${id} not found`);
    return this.repo.deleteSite(id);
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

  // ── Admin user management ─────────────────────────────────────────────────

  private defaultPermissions(role: string): Record<string, boolean> {
    if (role === 'SUPER_ADMIN') {
      return { dashboard: true, managers: true, workers: true, jobs: true, sites: true, notifications: true, admin_users: true };
    }
    if (role === 'VIEWER') {
      return { dashboard: true, managers: false, workers: false, jobs: false, sites: false, notifications: false, admin_users: false };
    }
    // ADMIN
    return { dashboard: true, managers: true, workers: true, jobs: true, sites: true, notifications: false, admin_users: false };
  }

  async listAdminUsers() {
    return this.repo.findAllAdminUsers();
  }

  async getAdminUserMe(email: string) {
    const user = await this.repo.findAdminUserByEmail(email);
    if (!user) throw new NotFoundException('Admin user not found');
    // Update last_login_at lazily (best-effort)
    this.repo.updateAdminUserLastLogin(email).catch(() => undefined);
    const { password_hash: _, ...safe } = user;
    return safe;
  }

  async inviteAdminUser(data: {
    email: string;
    name?: string;
    role: string;
    permissions?: Record<string, boolean>;
    inviterEmail?: string;
  }) {
    const existing = await this.repo.findAdminUserByEmail(data.email);
    if (existing && existing.status !== 'DISABLED') {
      throw new BadRequestException('An admin user with this email already exists');
    }

    const inviterUser = data.inviterEmail
      ? await this.repo.findAdminUserByEmail(data.inviterEmail)
      : null;

    const token = crypto.randomBytes(32).toString('hex');
    const permissions = data.permissions ?? this.defaultPermissions(data.role);

    let adminUser;
    if (existing && existing.status === 'DISABLED') {
      adminUser = await this.repo.updateAdminUserReinvite(existing.id, token);
    } else {
      adminUser = await this.repo.createAdminUser({
        email: data.email,
        name: data.name,
        role: data.role,
        permissions,
        inviteToken: token,
        invitedBy: inviterUser?.id,
      });
    }

    const inviteUrl = `${process.env.ADMIN_BASE_URL ?? 'http://localhost:8080'}/accept-invite?token=${token}`;
    this.logger.log(`[INVITE] ${data.email} → ${inviteUrl}`);
    // TODO: send email via SMTP (configure SMTP_HOST, SMTP_USER, SMTP_PASS in env)

    return { ...adminUser, inviteUrl };
  }

  async acceptInvite(token: string, password: string, name?: string) {
    const user = await this.repo.findAdminUserByToken(token);
    if (!user) throw new BadRequestException('Invalid or expired invite token');
    const hash = await bcrypt.hash(password, 12);
    const accepted = await this.repo.acceptInvite(token, hash, name);
    if (!accepted) throw new BadRequestException('Failed to accept invite');
    return { message: 'Account activated successfully', email: accepted.email };
  }

  async updateAdminPermissions(id: string, permissions: Record<string, boolean>) {
    const user = await this.repo.updateAdminUserPermissions(id, permissions);
    if (!user) throw new NotFoundException(`Admin user ${id} not found`);
    return user;
  }

  async updateAdminRole(id: string, role: string) {
    const user = await this.repo.updateAdminUserRole(id, role);
    if (!user) throw new NotFoundException(`Admin user ${id} not found`);
    return user;
  }

  async changeAdminPassword(id: string, newPassword: string) {
    const hash = await bcrypt.hash(newPassword, 12);
    const user = await this.repo.updateAdminUserPassword(id, hash);
    if (!user) throw new NotFoundException(`Admin user ${id} not found`);
    return { message: 'Password updated' };
  }

  async changeOwnPassword(email: string, oldPassword: string, newPassword: string) {
    const user = await this.repo.findAdminUserByEmail(email);
    if (!user || !user.password_hash) throw new NotFoundException('Admin user not found');
    const valid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!valid) throw new BadRequestException('Current password is incorrect');
    const hash = await bcrypt.hash(newPassword, 12);
    await this.repo.updateAdminUserPassword(user.id, hash);
    return { message: 'Password updated' };
  }

  async disableAdminUser(id: string) {
    const user = await this.repo.updateAdminUserStatus(id, 'DISABLED');
    if (!user) throw new NotFoundException(`Admin user ${id} not found`);
    return user;
  }
}
