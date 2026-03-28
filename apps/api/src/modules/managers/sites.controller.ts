import {
  Controller, Get, Post, Put, Patch, Delete,
  Param, Body, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { SitesRepository } from './sites.repository';

@Controller('manager/sites')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('MANAGER')
export class SitesController {
  constructor(private readonly sitesRepo: SitesRepository) {}

  // ── List my sites ──────────────────────────────────────────────
  @Get()
  async list(@CurrentUser() user: CurrentUserPayload) {
    return this.sitesRepo.listByUser(user.id);
  }

  // ── Create site ────────────────────────────────────────────────
  @Post()
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      name: string; address: string; province: string;
      district?: string; lat?: number; lng?: number; siteType?: string;
    },
  ) {
    return this.sitesRepo.create(user.id, body);
  }

  // ── Get single site ────────────────────────────────────────────
  @Get(':id')
  async getOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.sitesRepo.findOne(id, user.id);
  }

  // ── Update site ────────────────────────────────────────────────
  @Put(':id')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: {
      name?: string; address?: string; province?: string;
      district?: string; lat?: number; lng?: number;
      siteType?: string; status?: string;
    },
  ) {
    return this.sitesRepo.update(id, user.id, body);
  }

  // ── Update status ──────────────────────────────────────────────
  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.sitesRepo.update(id, user.id, { status: body.status });
  }

  // ── Get jobs for site ──────────────────────────────────────────
  @Get(':id/jobs')
  async getJobs(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.sitesRepo.getJobs(id, user.id);
  }

  // ── Add image (key registered after S3 upload) ─────────────────
  @Post(':id/images')
  async addImage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { key: string },
  ) {
    return this.sitesRepo.addImage(id, user.id, body.key);
  }

  // ── Remove image at index ──────────────────────────────────────
  @Delete(':id/images/:index')
  async removeImage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('index', ParseIntPipe) index: number,
  ) {
    return this.sitesRepo.removeImage(id, user.id, index);
  }

  // ── Set cover image index ──────────────────────────────────────
  @Patch(':id/cover')
  async setCover(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: { index: number },
  ) {
    return this.sitesRepo.setCover(id, user.id, body.index);
  }
}
