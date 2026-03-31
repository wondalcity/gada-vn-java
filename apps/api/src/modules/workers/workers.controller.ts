import { Controller, Get, Put, Post, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { WorkersService } from './workers.service';

@Controller('workers')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get('me')
  @Roles('WORKER')
  async getMyProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.workersService.getProfile(user.id);
  }

  @Put('me')
  @Roles('WORKER')
  async updateMyProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.workersService.updateProfile(user.id, body);
  }

  @Get('hires')
  @Roles('WORKER')
  async getMyHires(@CurrentUser() user: CurrentUserPayload) {
    return this.workersService.getHires(user.id);
  }

  @Get('attendance')
  @Roles('WORKER')
  async getMyAttendance(
    @CurrentUser() user: CurrentUserPayload,
    @Query('jobId') jobId?: string,
  ) {
    return this.workersService.getAttendance(user.id, jobId);
  }

  @Get('saved-locations')
  @Roles('WORKER')
  async getSavedLocations(@CurrentUser() user: CurrentUserPayload) {
    return this.workersService.getSavedLocations(user.id);
  }

  @Post('saved-locations')
  @Roles('WORKER')
  async upsertSavedLocation(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { label: string; address?: string; lat: number; lng: number; isDefault?: boolean },
  ) {
    return this.workersService.upsertSavedLocation(user.id, body);
  }

  @Delete('saved-locations/:id')
  @Roles('WORKER')
  async deleteSavedLocation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    const deleted = await this.workersService.deleteSavedLocation(user.id, id);
    return { deleted };
  }

  @Get('me/trade-skills')
  @Roles('WORKER')
  async getMyTradeSkills(@CurrentUser() user: CurrentUserPayload) {
    return this.workersService.getTradeSkills(user.id);
  }

  @Put('me/trade-skills')
  @Roles('WORKER')
  async replaceMyTradeSkills(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { skills: { tradeId: number; years: number }[] },
  ) {
    return this.workersService.replaceTradeSkills(user.id, body.skills ?? []);
  }
}
