import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobListQueryDto } from './dto/job-list-query.dto';

@Injectable()
export class JobsRepository {
  constructor(private readonly db: DatabaseService) {}

  async findMany(query: JobListQueryDto) {
    const { lat, lng, radiusKm = 50, page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT j.*, s.name as site_name, s.address, s.province, s.lat, s.lng
      ${lat && lng ? `, ST_Distance(s.location::geography, ST_MakePoint($1, $2)::geography) / 1000 as distance_km` : ''}
      FROM app.jobs j
      JOIN app.construction_sites s ON j.site_id = s.id
      WHERE j.status = 'OPEN'
        AND j.work_date >= CURRENT_DATE
    `;

    const params: unknown[] = lat && lng ? [lng, lat] : [];
    let paramIdx = params.length + 1;

    if (lat && lng) {
      sql += ` AND ST_DWithin(s.location::geography, ST_MakePoint($1, $2)::geography, ${radiusKm * 1000})`;
    }

    if (query.tradeId) {
      sql += ` AND j.trade_id = $${paramIdx++}`;
      params.push(query.tradeId);
    }

    if (query.province) {
      sql += ` AND s.province = $${paramIdx++}`;
      params.push(query.province);
    }

    if (lat && lng) {
      sql += ` ORDER BY distance_km ASC`;
    } else {
      sql += ` ORDER BY j.daily_wage DESC`;
    }

    sql += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const { rows } = await this.db.query(sql, params);
    return rows;
  }

  async findByDate(date: string, query: JobListQueryDto) {
    const { page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;
    const { rows } = await this.db.query(
      `SELECT j.*, s.name as site_name, s.address
       FROM app.jobs j
       JOIN app.construction_sites s ON j.site_id = s.id
       WHERE j.work_date = $1 AND j.status = 'OPEN'
       ORDER BY j.daily_wage DESC
       LIMIT $2 OFFSET $3`,
      [date, limit, offset],
    );
    return rows;
  }

  async findById(id: string) {
    const { rows } = await this.db.query(
      `SELECT j.*, s.name as site_name, s.address, s.province, s.lat, s.lng
       FROM app.jobs j
       JOIN app.construction_sites s ON j.site_id = s.id
       WHERE j.id = $1`,
      [id],
    );
    return rows[0] || null;
  }

  async getManagerIdByUserId(userId: string): Promise<string> {
    const { rows } = await this.db.query<{ id: string }>(
      'SELECT id FROM app.manager_profiles WHERE user_id = $1',
      [userId],
    );
    if (!rows[0]) throw new Error('Manager profile not found');
    return rows[0].id;
  }

  async create(managerId: string, dto: CreateJobDto) {
    const { rows } = await this.db.query(
      `INSERT INTO app.jobs (
        site_id, manager_id, title, description, trade_id,
        work_date, start_time, end_time, daily_wage,
        benefits, requirements, slots_total, status, published_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'OPEN',NOW())
       RETURNING *`,
      [
        dto.siteId, managerId, dto.title, dto.description, dto.tradeId,
        dto.workDate, dto.startTime, dto.endTime, dto.dailyWage,
        JSON.stringify(dto.benefits || {}), JSON.stringify(dto.requirements || {}),
        dto.slotsTotal,
      ],
    );
    return rows[0];
  }

  async update(id: string, managerId: string, dto: Partial<CreateJobDto>) {
    const { rows } = await this.db.query(
      `UPDATE app.jobs SET
        title = COALESCE($3, title),
        description = COALESCE($4, description),
        daily_wage = COALESCE($5, daily_wage),
        slots_total = COALESCE($6, slots_total),
        updated_at = NOW()
       WHERE id = $1 AND manager_id = $2
       RETURNING *`,
      [id, managerId, dto.title, dto.description, dto.dailyWage, dto.slotsTotal],
    );
    return rows[0];
  }

  async findByManager(managerId: string) {
    const { rows } = await this.db.query(
      `SELECT j.*, s.name as site_name, s.address
       FROM app.jobs j
       JOIN app.construction_sites s ON j.site_id = s.id
       WHERE j.manager_id = $1
       ORDER BY j.work_date DESC`,
      [managerId],
    );
    return rows;
  }

  async softDelete(id: string, managerId: string) {
    await this.db.query(
      `UPDATE app.jobs SET status = 'CANCELLED', updated_at = NOW()
       WHERE id = $1 AND manager_id = $2`,
      [id, managerId],
    );
  }
}
