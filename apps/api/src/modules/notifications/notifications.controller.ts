import {
  Controller, Get, Put,
  Param, Query, UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Get paginated notifications for the current user
  @Get()
  async getNotifications(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.findByUser(
      user.id,
      +page,
      +limit,
      unreadOnly === 'true',
    );
  }

  // Mark a single notification as read
  @Put(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.notificationsService.markRead(id, user.id);
  }

  // Mark all notifications as read
  @Put('read-all')
  async markAllAsRead(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.markAllRead(user.id);
  }
}
