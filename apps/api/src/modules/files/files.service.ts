import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { FilesRepository } from './files.repository';

@Injectable()
export class FilesService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly repo: FilesRepository) {
    this.s3 = new S3Client({
      region: process.env.AWS_REGION || 'ap-southeast-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    this.bucket = process.env.S3_BUCKET || 'gada-vn-uploads';
  }

  async generatePresignedUrl(
    userId: string,
    fileName: string,
    contentType: string,
    folder?: string,
  ) {
    const ext = fileName.split('.').pop() || '';
    const key = `${folder || 'uploads'}/${userId}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn: 300 });

    return { url, key, expiresIn: 300 };
  }

  async confirmUpload(
    userId: string,
    key: string,
    fileName: string,
    contentType: string,
    sizeBytes?: number,
  ) {
    const publicUrl = `https://${this.bucket}.s3.${process.env.AWS_REGION || 'ap-southeast-1'}.amazonaws.com/${key}`;
    return this.repo.create(userId, key, fileName, contentType, publicUrl, sizeBytes);
  }
}
