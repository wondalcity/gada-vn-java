import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('jobs')
  async listJobs(
    @Query('q') q?: string,
    @Query('province') province?: string,
    @Query('tradeId') tradeId?: string,
    @Query('site') site?: string,
    @Query('page') page?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('statusFilter') statusFilter?: string,
  ) {
    const validStatus = ['OPEN', 'ALMOST_FULL', 'FILLED'] as const;
    const parsedStatus = validStatus.includes(statusFilter as typeof validStatus[number])
      ? (statusFilter as typeof validStatus[number])
      : undefined;
    return this.publicService.listJobs({
      q: q?.trim() || undefined,
      province,
      tradeId: tradeId ? Number(tradeId) : undefined,
      site,
      page: page ? Number(page) : 1,
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      radiusKm: radiusKm ? Math.min(200, Number(radiusKm)) : undefined,
      statusFilter: parsedStatus,
    });
  }

  @Get('jobs/:slug')
  async getJobBySlug(@Param('slug') slug: string) {
    const job = await this.publicService.getJobBySlug(slug);
    if (!job) throw new NotFoundException(`Job not found: ${slug}`);
    return job;
  }

  @Get('sites/:slug')
  async getSiteBySlug(@Param('slug') slug: string) {
    const site = await this.publicService.getSiteById(slug);
    if (!site) throw new NotFoundException(`Site not found: ${slug}`);
    return site;
  }

  @Get('provinces')
  async getProvinces() {
    return this.publicService.getProvinces();
  }

  @Get('trades')
  async getTrades() {
    return this.publicService.getTrades();
  }
}
