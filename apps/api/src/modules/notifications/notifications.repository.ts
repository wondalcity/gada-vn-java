import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
    unreadOnly: boolean,
  ) {
    const offset = (page - 1) * limit;
    const unreadFilter = unreadOnly ? 'AND read = FALSE' : '';

    const { rows } = await this.db.query(
      `SELECT * FROM ops.notifications
       WHERE user_id = $1 ${unreadFilter}
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );

    const { rows: countRows } = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ops.notifications
       WHERE user_id = $1 AND read = FALSE`,
      [userId],
    );

    return {
      data: rows,
      unreadCount: parseInt(countRows[0]?.count ?? '0'),
    };
  }

  async findById(id: string, userId: string) {
    const { rows } = await this.db.query(
      'SELECT * FROM ops.notifications WHERE id = $1 AND user_id = $2',
      [id, userId],
    );
    return rows[0] || null;
  }

  async markRead(id: string, userId: string) {
    const { rows } = await this.db.query(
      `UPDATE ops.notifications SET read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId],
    );
    return rows[0];
  }

  async markAllRead(userId: string): Promise<number> {
    const { rowCount } = await this.db.query(
      `UPDATE ops.notifications SET read = TRUE
       WHERE user_id = $1 AND read = FALSE`,
      [userId],
    );
    return rowCount ?? 0;
  }

  async create(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
    sentViaFcm = false,
    fcmMessageId?: string,
  ) {
    const { rows } = await this.db.query(
      `INSERT INTO ops.notifications (user_id, type, title, body, data, sent_via_fcm, fcm_message_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, type, title, body, data ? JSON.stringify(data) : '{}', sentViaFcm, fcmMessageId ?? null],
    );
    return rows[0];
  }

  async getFcmTokens(userId: string): Promise<string[]> {
    const { rows } = await this.db.query<{ token: string }>(
      'SELECT token FROM ops.fcm_tokens WHERE user_id = $1',
      [userId],
    );
    return rows.map((r) => r.token);
  }
}
