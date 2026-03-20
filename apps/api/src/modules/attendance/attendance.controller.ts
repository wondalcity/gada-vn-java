import {
  Controller, Get, Put, Post,
  Param, Body, UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller()
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // Manager fetches attendance records for a job
  @Get('jobs/:jobId/attendance')
  @Roles('MANAGER')
  async getJobAttendance(
    @Param('jobId') jobId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.attendanceService.findByJob(jobId, user.id);
  }

  // Manager updates a single attendance record
  @Put('attendance/:id')
  @Roles('MANAGER')
  async updateAttendance(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { status: string; note?: string },
  ) {
    return this.attendanceService.update(id, user.id, body);
  }

  // Manager bulk-creates or confirms attendance for a job
  @Post('jobs/:jobId/attendance/bulk')
  @Roles('MANAGER')
  async bulkUpsertAttendance(
    @Param('jobId') jobId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { records: Array<{ workerId: string; status: string; note?: string }> },
  ) {
    return this.attendanceService.bulkUpsert(jobId, user.id, body.records);
  }
}
