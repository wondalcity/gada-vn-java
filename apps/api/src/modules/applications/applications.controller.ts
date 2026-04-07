import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller()
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  // Worker (or manager applying as worker) applies to a job
  @Post('jobs/:jobId/apply')
  @Roles('WORKER', 'MANAGER')
  async applyToJob(
    @Param('jobId') jobId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.applicationsService.apply(user.id, jobId, body);
  }

  // Worker (or manager) withdraws (cancels) a PENDING application
  @Delete('applications/:id')
  @Roles('WORKER', 'MANAGER')
  async withdrawApplication(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.applicationsService.withdraw(id, user.id);
  }

  // Worker fetches a single application by ID
  @Get('applications/:id/detail')
  @Roles('WORKER', 'MANAGER')
  async getMyApplicationById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.applicationsService.findOneByWorker(id, user.id);
  }

  // Worker (or manager) fetches their own applications
  @Get('applications/mine')
  @Roles('WORKER', 'MANAGER')
  async getMyApplications(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.applicationsService.findByWorker(user.id, +page, +limit);
  }

  // Worker (or manager) checks their own application for a specific job
  @Get('jobs/:jobId/my-application')
  @Roles('WORKER', 'MANAGER')
  async getMyApplicationForJob(
    @Param('jobId') jobId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.applicationsService.findByWorkerAndJob(user.id, jobId);
  }

  // Manager fetches applications for a specific job
  @Get('jobs/:jobId/applications')
  @Roles('MANAGER')
  async getJobApplications(
    @Param('jobId') jobId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.applicationsService.findByJob(jobId, user.id);
  }

  // Alias: GET /applications/job/:jobId (mobile-friendly path)
  @Get('applications/job/:jobId')
  @Roles('MANAGER')
  async getJobApplicationsAlias(
    @Param('jobId') jobId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.applicationsService.findByJob(jobId, user.id);
  }

  // Manager updates application status (ACCEPTED / REJECTED)
  @Put('applications/:id/status')
  @Roles('MANAGER')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body('status') status: string,
  ) {
    return this.applicationsService.updateStatus(id, user.id, status);
  }
}
