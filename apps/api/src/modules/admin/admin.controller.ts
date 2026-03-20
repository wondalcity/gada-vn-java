import {
  Controller, Get, Post, Param, Body, Query, UseGuards,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminServiceKeyGuard } from './admin.guard';

@Controller('admin')
@UseGuards(AdminServiceKeyGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('managers')
  async listManagers(
    @Query('status') status = 'PENDING',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.listManagers(status, page, limit);
  }

  @Get('managers/:id')
  async getManager(@Param('id') id: string) {
    return this.adminService.getManager(id);
  }

  @Post('managers/:id/approve')
  async approveManager(@Param('id') id: string) {
    return this.adminService.approveManager(id);
  }

  @Post('managers/:id/reject')
  async rejectManager(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.adminService.rejectManager(id, body.reason ?? '');
  }
}
