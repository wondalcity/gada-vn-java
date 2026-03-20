import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateJobDto } from './dto/create-job.dto';
import { JobListQueryDto } from './dto/job-list-query.dto';

@Controller('jobs')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @Public()
  async listJobs(@Query() query: JobListQueryDto) {
    return this.jobsService.listJobs(query);
  }

  @Get('date/:date')
  @Public()
  async getDailyFeed(@Param('date') date: string, @Query() query: JobListQueryDto) {
    return this.jobsService.getDailyFeed(date, query);
  }

  @Get(':id')
  @Public()
  async getJob(@Param('id') id: string) {
    return this.jobsService.getJobById(id);
  }

  @Post()
  @Roles('MANAGER')
  async createJob(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateJobDto,
  ) {
    return this.jobsService.createJob(user.id, dto);
  }

  @Put(':id')
  @Roles('MANAGER')
  async updateJob(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: Partial<CreateJobDto>,
  ) {
    return this.jobsService.updateJob(id, user.id, dto);
  }

  @Delete(':id')
  @Roles('MANAGER')
  async deleteJob(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.jobsService.deleteJob(id, user.id);
  }
}
