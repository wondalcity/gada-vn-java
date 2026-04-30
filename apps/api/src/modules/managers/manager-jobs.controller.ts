import {
  Controller, Get, Patch, Put, Query,
  Param, Body, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DatabaseService } from '../../common/database/database.service';
import { ApplicationsService } from '../applications/applications.service';
import { AttendanceService } from '../attendance/attendance.service';

function toImageUrl(key: string | null | undefined): string | undefined {
  if (!key) return undefined;
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  const domain = process.env.CLOUDFRONT_DOMAIN;
  if (!domain) return undefined;
  const base = domain.startsWith('http') ? domain : `https://${domain}`;
  return `${base}/${key}`;
}

@Controller('manager')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('MANAGER')
export class ManagerJobsController {
  constructor(
    private readonly db: DatabaseService,
    private readonly applicationsService: ApplicationsService,
    private readonly attendanceService: AttendanceService,
  ) {}

  // ── List all jobs for this manager ────────────────────────────
  @Get('jobs')
  async listAllJobs(@CurrentUser() user: CurrentUserPayload) {
    const { rows } = await this.db.query(
      `SELECT
         j.id, j.slug, j.title, j.work_date, j.daily_wage, j.currency,
         j.slots_total, j.slots_filled, j.status, j.created_at, j.updated_at,
         s.id AS site_id, s.name AS site_name,
         s.image_s3_keys, s.cover_image_idx,
         COUNT(a.id) FILTER (WHERE a.status = 'PENDING')  AS pending_count,
         COUNT(a.id) FILTER (WHERE a.status = 'ACCEPTED') AS accepted_count
       FROM app.jobs j
       JOIN app.construction_sites s ON j.site_id = s.id
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       LEFT JOIN app.job_applications a ON a.job_id = j.id AND a.status != 'WITHDRAWN'
       WHERE mp.user_id = $1
       GROUP BY j.id, s.id
       ORDER BY j.created_at DESC`,
      [user.id],
    );
    return rows.map((r) => {
      const imageKeys = r.image_s3_keys as string[] | null ?? [];
      const coverIdx = (r.cover_image_idx as number) ?? 0;
      return {
        id: r.id,
        slug: r.slug,
        siteId: r.site_id,
        siteName: r.site_name,
        title: r.title,
        workDate: r.work_date,
        dailyWage: Number(r.daily_wage),
        currency: r.currency ?? 'VND',
        slotsTotal: Number(r.slots_total),
        slotsFilled: Number(r.slots_filled),
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        coverImageUrl: toImageUrl(imageKeys[coverIdx]) ?? undefined,
        imageUrls: imageKeys.map((k: string) => toImageUrl(k)).filter(Boolean) as string[],
        shiftCount: 0,
        applicationCount: {
          pending: Number(r.pending_count ?? 0),
          accepted: Number(r.accepted_count ?? 0),
          rejected: 0,
        },
      };
    });
  }

  // ── Dashboard stats ────────────────────────────────────────────
  @Get('dashboard')
  async getDashboard(@CurrentUser() user: CurrentUserPayload) {
    const { rows } = await this.db.query(
      `SELECT
         COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'ACTIVE') AS active_sites,
         COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'OPEN')   AS open_jobs,
         COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'PENDING') AS pending_applications
       FROM app.manager_profiles mp
       LEFT JOIN app.construction_sites s ON s.manager_id = mp.id
       LEFT JOIN app.jobs j ON j.manager_id = mp.id
       LEFT JOIN app.job_applications a ON a.job_id = j.id
       WHERE mp.user_id = $1`,
      [user.id],
    );
    const r = rows[0];
    return {
      activeSites: Number(r?.active_sites ?? 0),
      openJobs: Number(r?.open_jobs ?? 0),
      pendingApplications: Number(r?.pending_applications ?? 0),
    };
  }

  // ── Job detail (manager view) ──────────────────────────────────
  @Get('jobs/:id')
  async getJob(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const { rows } = await this.db.query(
      `SELECT
         j.id, j.slug, j.title, j.description, j.trade_id,
         j.work_date, j.start_time, j.end_time, j.daily_wage, j.currency,
         j.benefits, j.requirements, j.slots_total, j.slots_filled,
         j.status, j.published_at, j.expires_at, j.created_at, j.updated_at,
         s.id AS site_id, s.name AS site_name,
         s.image_s3_keys, s.cover_image_idx,
         t.name_ko AS trade_name,
         COUNT(a.id) FILTER (WHERE a.status = 'PENDING')  AS pending_count,
         COUNT(a.id) FILTER (WHERE a.status = 'ACCEPTED') AS accepted_count,
         COUNT(a.id) FILTER (WHERE a.status = 'REJECTED') AS rejected_count
       FROM app.jobs j
       JOIN app.construction_sites s ON j.site_id = s.id
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       LEFT JOIN ref.construction_trades t ON j.trade_id = t.id
       LEFT JOIN app.job_applications a ON a.job_id = j.id AND a.status != 'WITHDRAWN'
       WHERE j.id = $1 AND mp.user_id = $2
       GROUP BY j.id, s.id, t.id`,
      [id, user.id],
    );
    if (!rows[0]) return null;
    const r = rows[0];
    const imageKeys = r.image_s3_keys as string[] | null ?? [];
    const coverIdx = (r.cover_image_idx as number) ?? 0;
    const imageUrls = imageKeys.map((k: string) => toImageUrl(k)).filter(Boolean) as string[];
    const benefits = (r.benefits as Record<string, boolean>) ?? {};
    const reqRaw = r.requirements as Record<string, unknown> | null;
    return {
      id: r.id,
      slug: r.slug,
      siteId: r.site_id,
      siteName: r.site_name,
      title: r.title,
      description: r.description ?? undefined,
      tradeId: r.trade_id ?? undefined,
      tradeName: r.trade_name ?? undefined,
      workDate: r.work_date,
      startTime: r.start_time ?? undefined,
      endTime: r.end_time ?? undefined,
      dailyWage: Number(r.daily_wage),
      currency: r.currency ?? 'VND',
      benefits: {
        meals: benefits.meals ?? false,
        transport: benefits.transport ?? false,
        accommodation: benefits.accommodation ?? false,
        insurance: benefits.insurance ?? false,
      },
      requirements: reqRaw ? {
        minExperienceMonths: (reqRaw.minExperienceMonths ?? reqRaw.experience_months ?? undefined) as number | undefined,
        notes: (reqRaw.notes ?? undefined) as string | undefined,
      } : undefined,
      slotsTotal: Number(r.slots_total),
      slotsFilled: Number(r.slots_filled),
      status: r.status,
      publishedAt: r.published_at,
      expiresAt: r.expires_at ?? undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      coverImageUrl: toImageUrl(imageKeys[coverIdx]) ?? undefined,
      imageUrls,
      shiftCount: 0,
      applicationCount: {
        pending: Number(r.pending_count ?? 0),
        accepted: Number(r.accepted_count ?? 0),
        rejected: Number(r.rejected_count ?? 0),
      },
    };
  }

  // ── Update job status ──────────────────────────────────────────
  @Patch('jobs/:id/status')
  async updateJobStatus(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { status: string },
  ) {
    const { rows } = await this.db.query(
      `UPDATE app.jobs j SET status = $2, updated_at = NOW()
       FROM app.manager_profiles mp
       WHERE j.id = $1 AND j.manager_id = mp.id AND mp.user_id = $3
       RETURNING j.id, j.status, j.slots_total, j.slots_filled`,
      [id, body.status, user.id],
    );
    if (!rows[0]) return null;
    const r = rows[0];
    return { id: r.id, status: r.status, slotsTotal: Number(r.slots_total), slotsFilled: Number(r.slots_filled), jobStatus: r.status };
  }

  // ── List applicants for a job ──────────────────────────────────
  @Get('jobs/:id/applications')
  async getJobApplications(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    // Fetch job meta for response
    const { rows: jobRows } = await this.db.query(
      `SELECT j.id, j.title, j.slots_total, j.slots_filled, j.status
       FROM app.jobs j
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       WHERE j.id = $1 AND mp.user_id = $2`,
      [id, user.id],
    );
    if (!jobRows[0]) return { applicants: [], meta: { slotsTotal: 0, slotsFilled: 0, jobStatus: 'OPEN', jobTitle: '' } };
    const job = jobRows[0];

    const { rows } = await this.db.query(
      `SELECT a.id, a.status, a.applied_at, a.notes,
              wp.id AS worker_id, wp.full_name AS worker_name,
              wp.experience_months, wp.id_verified,
              wp.signature_s3_key IS NOT NULL AS has_signature,
              wp.profile_picture_s3_key,
              u.phone AS worker_phone,
              t.name_ko AS trade_name_ko, t.id AS trade_id
       FROM app.job_applications a
       JOIN app.worker_profiles wp ON a.worker_id = wp.id
       JOIN app.users u ON wp.user_id = u.id
       LEFT JOIN ref.construction_trades t ON t.id = wp.primary_trade_id
       WHERE a.job_id = $1
         AND a.status != 'WITHDRAWN'
       ORDER BY a.applied_at ASC`,
      [id],
    );

    const applicants = rows.map((r) => ({
      id: r.id,
      status: r.status,
      appliedAt: r.applied_at,
      notes: r.notes ?? undefined,
      worker: {
        id: r.worker_id,
        name: r.worker_name ?? '',
        phone: r.worker_phone ?? undefined,
        experienceMonths: r.experience_months ?? 0,
        primaryTradeId: r.trade_id ?? undefined,
        tradeNameKo: r.trade_name_ko ?? undefined,
        idVerified: r.id_verified ?? false,
        hasSignature: r.has_signature === true,
        profilePictureUrl: toImageUrl(r.profile_picture_s3_key) ?? undefined,
      },
    }));

    return {
      applicants,
      meta: {
        jobTitle: job.title,
        slotsTotal: Number(job.slots_total),
        slotsFilled: Number(job.slots_filled),
        jobStatus: job.status,
      },
    };
  }

  // ── Accept applicant ───────────────────────────────────────────
  @Patch('applications/:id/accept')
  async acceptApplication(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const updated = await this.applicationsService.hire(id, user.id);
    if (!updated) return null;
    // Increment slots_filled and fetch updated slot meta
    const { rows } = await this.db.query(
      `UPDATE app.jobs j
       SET slots_filled = slots_filled + 1
       FROM app.job_applications a
       WHERE j.id = a.job_id AND a.id = $1
       RETURNING j.slots_total, j.slots_filled, j.status`,
      [id],
    );
    const r = rows[0];
    return { ...updated, slotsTotal: Number(r?.slots_total), slotsFilled: Number(r?.slots_filled), jobStatus: r?.status };
  }

  // ── Reject applicant ───────────────────────────────────────────
  @Patch('applications/:id/reject')
  async rejectApplication(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { notes?: string },
  ) {
    const updated = await this.applicationsService.reject(id, user.id);
    if (!updated) return null;
    const { rows } = await this.db.query(
      `SELECT j.slots_total, j.slots_filled, j.status
       FROM app.job_applications a
       JOIN app.jobs j ON a.job_id = j.id
       WHERE a.id = $1`,
      [id],
    );
    const r = rows[0];
    return { ...updated, slotsTotal: Number(r?.slots_total), slotsFilled: Number(r?.slots_filled), jobStatus: r?.status };
  }

  // ── Cancel hire (revert to REJECTED) ──────────────────────────
  @Patch('hires/:id/cancel')
  async cancelHire(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const { rows: appRows } = await this.db.query(
      `SELECT a.id FROM app.job_applications a
       JOIN app.jobs j ON a.job_id = j.id
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       WHERE a.id = $1 AND mp.user_id = $2 AND a.status = 'ACCEPTED'`,
      [id, user.id],
    );
    if (!appRows[0]) return null;
    await this.db.query(
      `UPDATE app.job_applications SET status = 'REJECTED', reviewed_at = NOW() WHERE id = $1`,
      [id],
    );
    // Decrement slots_filled
    const { rows } = await this.db.query(
      `UPDATE app.jobs j SET slots_filled = GREATEST(slots_filled - 1, 0)
       FROM app.job_applications a
       WHERE a.id = $1 AND j.id = a.job_id
       RETURNING j.slots_total, j.slots_filled, j.status`,
      [id],
    );
    const r = rows[0];
    return { success: true, slotsFilled: Number(r?.slots_filled), jobStatus: r?.status };
  }

  // ── All applications across all manager's jobs ─────────────────
  @Get('applications')
  async getAllApplications(@CurrentUser() user: CurrentUserPayload) {
    const { rows } = await this.db.query(
      `SELECT
         a.id, a.status, a.applied_at,
         j.id AS job_id, j.title AS job_title, j.work_date,
         wp.id AS worker_id, wp.full_name AS worker_name,
         wp.experience_months,
         u.phone AS worker_phone,
         t.name_ko AS trade_name_ko
       FROM app.job_applications a
       JOIN app.jobs j ON a.job_id = j.id
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       JOIN app.worker_profiles wp ON a.worker_id = wp.id
       JOIN app.users u ON wp.user_id = u.id
       LEFT JOIN ref.construction_trades t ON t.id = wp.primary_trade_id
       WHERE mp.user_id = $1
         AND a.status != 'WITHDRAWN'
       ORDER BY a.applied_at DESC`,
      [user.id],
    );
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      jobId: r.job_id,
      jobTitle: r.job_title,
      workDate: r.work_date,
      workerId: r.worker_id,
      workerName: r.worker_name ?? '',
      workerPhone: r.worker_phone ?? '',
      workerTrades: r.trade_name_ko ? [r.trade_name_ko] : [],
      experienceYears: r.experience_months ? Math.floor(Number(r.experience_months) / 12) : undefined,
    }));
  }

  // ── Attendance roster for a job on a date ─────────────────────
  @Get('jobs/:id/attendance')
  async getAttendanceRoster(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('date') date: string,
  ) {
    // Verify manager owns the job
    const { rows: jobRows } = await this.db.query(
      `SELECT j.id, j.title FROM app.jobs j
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       WHERE j.id = $1 AND mp.user_id = $2`,
      [id, user.id],
    );
    if (!jobRows[0]) return { roster: [], jobTitle: '' };

    const workDate = date || new Date().toISOString().split('T')[0];

    // All accepted workers + their attendance record for the date
    const { rows } = await this.db.query(
      `SELECT
         wp.id AS worker_id,
         wp.full_name AS worker_name,
         u.phone AS worker_phone,
         wp.experience_months,
         t.name_ko AS trade_name_ko,
         ar.id AS attendance_id,
         ar.status AS attendance_status,
         ar.check_in_time,
         ar.check_out_time,
         ar.hours_worked,
         ar.notes AS attendance_notes
       FROM app.job_applications a
       JOIN app.worker_profiles wp ON a.worker_id = wp.id
       JOIN app.users u ON wp.user_id = u.id
       LEFT JOIN ref.construction_trades t ON t.id = wp.primary_trade_id
       LEFT JOIN app.attendance_records ar
         ON ar.job_id = a.job_id AND ar.worker_id = a.worker_id AND ar.work_date = $2
       WHERE a.job_id = $1 AND a.status IN ('ACCEPTED', 'CONTRACTED')
       ORDER BY wp.full_name ASC`,
      [id, workDate],
    );

    const roster = rows.map((r) => ({
      workerId: r.worker_id,
      workerName: r.worker_name ?? '',
      workerPhone: r.worker_phone ?? undefined,
      experienceMonths: r.experience_months ?? 0,
      tradeNameKo: r.trade_name_ko ?? undefined,
      attendance: r.attendance_id ? {
        id: r.attendance_id,
        status: r.attendance_status,
        checkInTime: r.check_in_time ?? '',
        checkOutTime: r.check_out_time ?? '',
        hoursWorked: r.hours_worked ? Number(r.hours_worked) : null,
        notes: r.attendance_notes ?? '',
      } : null,
    }));

    return { roster, jobTitle: jobRows[0].title };
  }

  // ── Bulk upsert attendance ─────────────────────────────────────
  @Put('jobs/:id/attendance')
  async bulkUpsertAttendance(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      work_date: string;
      records: Array<{
        worker_id: string;
        status: string;
        check_in_time?: string | null;
        check_out_time?: string | null;
        hours_worked?: number | null;
        notes?: string | null;
      }>;
    },
  ) {
    // Verify ownership + get manager id
    const { rows: jobRows } = await this.db.query(
      `SELECT mp.id AS manager_id FROM app.jobs j
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       WHERE j.id = $1 AND mp.user_id = $2`,
      [id, user.id],
    );
    if (!jobRows[0]) return null;
    const managerId = jobRows[0].manager_id;

    await this.db.transaction(async (client) => {
      for (const rec of body.records) {
        await client.query(
          `INSERT INTO app.attendance_records
             (job_id, worker_id, work_date, status, check_in_time, check_out_time, hours_worked, notes, marked_by, marked_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
           ON CONFLICT (job_id, worker_id, work_date) DO UPDATE SET
             status         = EXCLUDED.status,
             check_in_time  = COALESCE(EXCLUDED.check_in_time, app.attendance_records.check_in_time),
             check_out_time = COALESCE(EXCLUDED.check_out_time, app.attendance_records.check_out_time),
             hours_worked   = COALESCE(EXCLUDED.hours_worked, app.attendance_records.hours_worked),
             notes          = COALESCE(EXCLUDED.notes, app.attendance_records.notes),
             marked_by      = EXCLUDED.marked_by,
             marked_at      = NOW()`,
          [id, rec.worker_id, body.work_date, rec.status,
           rec.check_in_time ?? null, rec.check_out_time ?? null,
           rec.hours_worked ?? null, rec.notes ?? null, managerId],
        );
      }
    });

    return { success: true };
  }
}
