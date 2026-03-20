import { Controller, Get, Post, Put, Body, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { ManagersService } from './managers.service';

@Controller('managers')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class ManagersController {
  constructor(private readonly managersService: ManagersService) {}

  @Post('register')
  @Roles('MANAGER')
  async register(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.managersService.register(user.id, body);
  }

  @Get('me')
  @Roles('MANAGER')
  async getMyProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.managersService.getProfile(user.id);
  }

  @Put('me')
  @Roles('MANAGER')
  async updateMyProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.managersService.updateProfile(user.id, body);
  }
}
