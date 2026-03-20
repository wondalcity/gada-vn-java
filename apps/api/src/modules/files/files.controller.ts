import {
  Controller, Post, Body, UseGuards,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller('files')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  // Request a pre-signed S3 upload URL
  @Post('presigned-url')
  async getPresignedUrl(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { fileName: string; contentType: string; folder?: string },
  ) {
    return this.filesService.generatePresignedUrl(
      user.id,
      body.fileName,
      body.contentType,
      body.folder,
    );
  }

  // Confirm upload completed and register file in DB
  @Post('confirm')
  async confirmUpload(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { key: string; fileName: string; contentType: string; sizeBytes?: number },
  ) {
    return this.filesService.confirmUpload(
      user.id,
      body.key,
      body.fileName,
      body.contentType,
      body.sizeBytes,
    );
  }
}
