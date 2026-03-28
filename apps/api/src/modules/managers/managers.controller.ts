import { Controller, Get, Post, Put, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ManagersService } from './managers.service';

@Controller('managers')
@UseGuards(FirebaseAuthGuard)
export class ManagersController {
  constructor(private readonly managersService: ManagersService) {}

  /** Any authenticated user (WORKER) can apply to become a manager */
  @Post('register')
  async register(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.managersService.register(user.id, body);
  }

  /** Check registration status — available to any authenticated user */
  @Get('registration-status')
  async getRegistrationStatus(@CurrentUser() user: CurrentUserPayload) {
    return this.managersService.getRegistrationStatus(user.id);
  }

  @Get('me')
  @UseGuards(RolesGuard)
  @Roles('MANAGER')
  async getMyProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.managersService.getProfile(user.id);
  }

  @Put('me')
  @UseGuards(RolesGuard)
  @Roles('MANAGER')
  async updateMyProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.managersService.updateProfile(user.id, body);
  }
}
