import {
  Controller, Get, Post, Put,
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

  // Worker applies to a job
  @Post('jobs/:jobId/apply')
  @Roles('WORKER')
  async applyToJob(
    @Param('jobId') jobId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.applicationsService.apply(user.id, jobId, body);
  }

  // Worker fetches their own applications
  @Get('applications/mine')
  @Roles('WORKER')
  async getMyApplications(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.applicationsService.findByWorker(user.id, +page, +limit);
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
