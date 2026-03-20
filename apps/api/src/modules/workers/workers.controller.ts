import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
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
}
