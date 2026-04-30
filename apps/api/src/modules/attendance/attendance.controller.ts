import {
  Controller, Get, Put, Post,
  Param, Body, UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import type { AttendanceStatus } from './attendance.repository';

@Controller()
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ── 이력 조회 (근로자 + 관리자 공통) ────────────────────────────────────

  @Get('attendance/:id/history')
  @Roles('WORKER', 'MANAGER')
  async getHistory(@Param('id') id: string) {
    return this.attendanceService.getHistory(id);
  }

  // ── Manager: fetch attendance records for a job ──────────────────────────

  @Get('jobs/:jobId/attendance')
  @Roles('MANAGER')
  async getJobAttendance(
    @Param('jobId') jobId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.attendanceService.findByJob(jobId, user.id);
  }

  // ── Manager: update a single attendance record ───────────────────────────

  @Put('attendance/:id')
  @Roles('MANAGER')
  async updateAttendance(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { status: string; notes?: string },
  ) {
    return this.attendanceService.updateManagerStatus(id, user.id, body);
  }

  // ── Manager: bulk-create or confirm attendance ───────────────────────────

  @Post('jobs/:jobId/attendance/bulk')
  @Roles('MANAGER')
  async bulkUpsertAttendance(
    @Param('jobId') jobId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { records: Array<{ workerId: string; workDate: string; status: string; notes?: string }> },
  ) {
    return this.attendanceService.bulkUpsert(jobId, user.id, body.records);
  }

  // ── Worker: set own attendance status (새 상태 흐름 지원) ────────────────
  // PRE_CONFIRMED | COMMUTING | WORK_STARTED | WORK_COMPLETED | ATTENDED | ABSENT | EARLY_LEAVE

  @Post('attendance/:id/worker-status')
  @Roles('WORKER')
  async setWorkerStatus(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { status: AttendanceStatus },
  ) {
    return this.attendanceService.setWorkerStatus(id, user.id, body.status);
  }

  // ── Worker or Manager: set work duration ────────────────────────────────

  @Put('attendance/:id/work-duration')
  @Roles('WORKER', 'MANAGER')
  async setWorkDuration(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { hours: number; minutes: number },
  ) {
    return this.attendanceService.setWorkDuration(id, user.id, user.role, body.hours, body.minutes);
  }

  // ── Worker or Manager: confirm work duration ─────────────────────────────

  @Post('attendance/:id/work-duration/confirm')
  @Roles('WORKER', 'MANAGER')
  async confirmWorkDuration(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.attendanceService.confirmWorkDuration(id, user.id);
  }
}
