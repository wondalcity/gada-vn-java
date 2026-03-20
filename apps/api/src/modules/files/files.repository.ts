import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class FilesRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(
    userId: string,
    key: string,
    fileName: string,
    contentType: string,
    publicUrl: string,
    sizeBytes?: number,
  ) {
    const { rows } = await this.db.query(
      `INSERT INTO ops.files
         (user_id, s3_key, file_name, content_type, public_url, size_bytes, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [userId, key, fileName, contentType, publicUrl, sizeBytes || null],
    );
    return rows[0];
  }

  async findByKey(key: string) {
    const { rows } = await this.db.query(
      'SELECT * FROM ops.files WHERE s3_key = $1',
      [key],
    );
    return rows[0] || null;
  }

  async findByUserId(userId: string) {
    const { rows } = await this.db.query(
      'SELECT * FROM ops.files WHERE user_id = $1 ORDER BY uploaded_at DESC',
      [userId],
    );
    return rows;
  }
}
