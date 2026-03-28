import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

const MAX_IMAGES = 10;

function toImageUrl(key: string | null | undefined): string | undefined {
  if (!key) return undefined;
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  const domain = process.env.CLOUDFRONT_DOMAIN;
  if (!domain) return undefined;
  const base = domain.startsWith('http') ? domain : `https://${domain}`;
  return `${base}/${key}`;
}

function mapSite(r: Record<string, unknown>) {
  const keys = r.image_s3_keys as string[] | null ?? [];
  const coverIdx = (r.cover_image_idx as number) ?? 0;
  const validCoverIdx = coverIdx >= 0 && coverIdx < keys.length ? coverIdx : 0;
  const imageUrls = keys.map((k) => toImageUrl(k)).filter(Boolean) as string[];
  return {
    id: r.id,
    name: r.name,
    address: r.address,
    province: r.province,
    district: r.district ?? undefined,
    lat: r.lat ? Number(r.lat) : undefined,
    lng: r.lng ? Number(r.lng) : undefined,
    siteType: r.site_type ?? undefined,
    status: r.status,
    coverImageUrl: imageUrls[validCoverIdx] ?? undefined,
    coverImageIdx: validCoverIdx,
    imageUrls,
    jobCount: Number(r.job_count ?? 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

@Injectable()
export class SitesRepository {
  constructor(private readonly db: DatabaseService) {}

  private async getManagerId(userId: string): Promise<string> {
    const { rows } = await this.db.query<{ id: string }>(
      'SELECT id FROM app.manager_profiles WHERE user_id = $1',
      [userId],
    );
    if (!rows[0]) throw new ForbiddenException('Manager profile not found');
    return rows[0].id;
  }

  async listByUser(userId: string) {
    const managerId = await this.getManagerId(userId);
    const { rows } = await this.db.query(
      `SELECT s.*,
              COUNT(j.id) FILTER (WHERE j.status = 'OPEN') AS job_count
       FROM app.construction_sites s
       LEFT JOIN app.jobs j ON j.site_id = s.id
       WHERE s.manager_id = $1
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [managerId],
    );
    return rows.map(mapSite);
  }

  async findOne(siteId: string, userId: string) {
    const managerId = await this.getManagerId(userId);
    const { rows } = await this.db.query(
      `SELECT s.*,
              COUNT(j.id) FILTER (WHERE j.status = 'OPEN') AS job_count
       FROM app.construction_sites s
       LEFT JOIN app.jobs j ON j.site_id = s.id
       WHERE s.id = $1 AND s.manager_id = $2
       GROUP BY s.id`,
      [siteId, managerId],
    );
    if (!rows[0]) throw new NotFoundException('Site not found');
    return mapSite(rows[0]);
  }

  async create(userId: string, data: {
    name: string; address: string; province: string;
    district?: string; lat?: number; lng?: number; siteType?: string;
  }) {
    const managerId = await this.getManagerId(userId);
    const { rows } = await this.db.query(
      `INSERT INTO app.construction_sites
         (manager_id, name, address, province, district, lat, lng, site_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [managerId, data.name, data.address, data.province,
       data.district ?? null, data.lat ?? null, data.lng ?? null, data.siteType ?? null],
    );
    return mapSite({ ...rows[0], job_count: 0 });
  }

  async update(siteId: string, userId: string, data: {
    name?: string; address?: string; province?: string;
    district?: string; lat?: number; lng?: number;
    siteType?: string; status?: string;
  }) {
    const managerId = await this.getManagerId(userId);
    const { rows } = await this.db.query(
      `UPDATE app.construction_sites SET
         name      = COALESCE($3, name),
         address   = COALESCE($4, address),
         province  = COALESCE($5, province),
         district  = COALESCE($6, district),
         lat       = COALESCE($7, lat),
         lng       = COALESCE($8, lng),
         site_type = COALESCE($9, site_type),
         status    = COALESCE($10, status),
         updated_at = NOW()
       WHERE id = $1 AND manager_id = $2
       RETURNING *`,
      [siteId, managerId, data.name ?? null, data.address ?? null,
       data.province ?? null, data.district ?? null,
       data.lat ?? null, data.lng ?? null,
       data.siteType ?? null, data.status ?? null],
    );
    if (!rows[0]) throw new NotFoundException('Site not found');
    return mapSite({ ...rows[0], job_count: 0 });
  }

  async addImage(siteId: string, userId: string, key: string) {
    const managerId = await this.getManagerId(userId);
    // Check current count first
    const { rows: cur } = await this.db.query<{ image_s3_keys: string[]; manager_id: string }>(
      'SELECT image_s3_keys, manager_id FROM app.construction_sites WHERE id = $1',
      [siteId],
    );
    if (!cur[0]) throw new NotFoundException('Site not found');
    if (cur[0].manager_id !== managerId) throw new ForbiddenException();
    if ((cur[0].image_s3_keys ?? []).length >= MAX_IMAGES) {
      throw new BadRequestException(`최대 ${MAX_IMAGES}장까지 등록할 수 있습니다`);
    }

    const { rows } = await this.db.query(
      `UPDATE app.construction_sites
       SET image_s3_keys = array_append(image_s3_keys, $3), updated_at = NOW()
       WHERE id = $1 AND manager_id = $2
       RETURNING image_s3_keys, cover_image_idx`,
      [siteId, managerId, key],
    );
    if (!rows[0]) throw new NotFoundException('Site not found');
    const keys = rows[0].image_s3_keys as string[];
    const coverIdx = (rows[0].cover_image_idx as number) ?? 0;
    return {
      imageUrls: keys.map((k) => toImageUrl(k)).filter(Boolean) as string[],
      coverImageIdx: coverIdx,
      coverImageUrl: toImageUrl(keys[coverIdx]) ?? undefined,
    };
  }

  async removeImage(siteId: string, userId: string, index: number) {
    const managerId = await this.getManagerId(userId);
    const { rows: cur } = await this.db.query<{ image_s3_keys: string[]; cover_image_idx: number; manager_id: string }>(
      'SELECT image_s3_keys, cover_image_idx, manager_id FROM app.construction_sites WHERE id = $1',
      [siteId],
    );
    if (!cur[0]) throw new NotFoundException('Site not found');
    if (cur[0].manager_id !== managerId) throw new ForbiddenException();

    const keys = cur[0].image_s3_keys ?? [];
    if (index < 0 || index >= keys.length) throw new BadRequestException('Invalid image index');

    // Remove element at index (PostgreSQL arrays are 1-based)
    const pgIdx = index + 1;
    let newCoverIdx = cur[0].cover_image_idx ?? 0;
    if (newCoverIdx === index) newCoverIdx = 0;
    else if (newCoverIdx > index) newCoverIdx = newCoverIdx - 1;

    const { rows } = await this.db.query(
      `UPDATE app.construction_sites
       SET image_s3_keys = (
             image_s3_keys[1:$3-1] ||
             image_s3_keys[$3+1:array_length(image_s3_keys, 1)]
           ),
           cover_image_idx = $4,
           updated_at = NOW()
       WHERE id = $1 AND manager_id = $2
       RETURNING image_s3_keys, cover_image_idx`,
      [siteId, managerId, pgIdx, newCoverIdx],
    );
    if (!rows[0]) throw new NotFoundException('Site not found');
    const newKeys = (rows[0].image_s3_keys as string[]) ?? [];
    const finalCoverIdx = (rows[0].cover_image_idx as number) ?? 0;
    return {
      imageUrls: newKeys.map((k) => toImageUrl(k)).filter(Boolean) as string[],
      coverImageIdx: finalCoverIdx,
      coverImageUrl: toImageUrl(newKeys[finalCoverIdx]) ?? undefined,
    };
  }

  async setCover(siteId: string, userId: string, index: number) {
    const managerId = await this.getManagerId(userId);
    const { rows: cur } = await this.db.query<{ image_s3_keys: string[]; manager_id: string }>(
      'SELECT image_s3_keys, manager_id FROM app.construction_sites WHERE id = $1',
      [siteId],
    );
    if (!cur[0]) throw new NotFoundException('Site not found');
    if (cur[0].manager_id !== managerId) throw new ForbiddenException();
    const keys = cur[0].image_s3_keys ?? [];
    if (index < 0 || index >= keys.length) throw new BadRequestException('Invalid image index');

    await this.db.query(
      `UPDATE app.construction_sites SET cover_image_idx = $3, updated_at = NOW()
       WHERE id = $1 AND manager_id = $2`,
      [siteId, managerId, index],
    );
    return {
      coverImageIdx: index,
      coverImageUrl: toImageUrl(keys[index]) ?? undefined,
    };
  }

  async getJobs(siteId: string, userId: string) {
    const managerId = await this.getManagerId(userId);
    const { rows } = await this.db.query(
      `SELECT j.id, j.title, j.work_date, j.daily_wage, j.slots_total, j.slots_filled,
              j.status, j.slug, j.published_at, j.created_at, j.updated_at
       FROM app.jobs j
       JOIN app.construction_sites s ON j.site_id = s.id
       WHERE j.site_id = $1 AND s.manager_id = $2
       ORDER BY j.work_date DESC`,
      [siteId, managerId],
    );
    return rows;
  }
}
