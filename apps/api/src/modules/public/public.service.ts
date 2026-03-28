import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

function toProvinceSlug(code: string): string {
  return code.toLowerCase();
}

function toImageUrl(key: string | null | undefined): string | undefined {
  if (!key) return undefined;
  // Allow fully-qualified URLs to pass through (e.g. dev dummy data)
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  const domain = process.env.CLOUDFRONT_DOMAIN;
  if (!domain) return undefined;
  const base = domain.startsWith('http') ? domain : `https://${domain}`;
  return `${base}/${key}`;
}

function toCoverImageUrl(keys: string[] | null | undefined, idx: number | null | undefined): string | undefined {
  if (!keys || keys.length === 0) return undefined;
  const coverIdx = idx != null && idx >= 0 && idx < keys.length ? idx : 0;
  return toImageUrl(keys[coverIdx]);
}

function toImageUrls(keys: string[] | null | undefined): string[] {
  if (!keys || keys.length === 0) return [];
  return keys.map((k) => toImageUrl(k)).filter(Boolean) as string[];
}

@Injectable()
export class PublicService {
  constructor(private readonly db: DatabaseService) {}

  async listJobs(params: {
    province?: string;
    tradeId?: number;
    site?: string;
    page?: number;
    limit?: number;
    lat?: number;
    lng?: number;
    radiusKm?: number;
    statusFilter?: 'OPEN' | 'ALMOST_FULL' | 'FILLED';
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, params.limit ?? 20);
    const offset = (page - 1) * limit;
    const useGeo = params.lat != null && params.lng != null;
    const radiusKm = params.radiusKm ?? 50;

    let baseWhere: string;
    if (params.statusFilter === 'ALMOST_FULL') {
      baseWhere = `j.status = 'OPEN' AND j.work_date >= CURRENT_DATE
        AND CAST(j.slots_filled AS FLOAT) / NULLIF(j.slots_total, 0) >= 0.8`;
    } else if (params.statusFilter === 'FILLED') {
      baseWhere = `j.status = 'FILLED'`;
    } else {
      baseWhere = `j.status = 'OPEN' AND j.work_date >= CURRENT_DATE`;
    }
    let where = baseWhere;
    const binds: unknown[] = [];
    let idx = 1;

    // When filtering by location, geo params go first so they can be referenced by index
    if (useGeo) {
      where += ` AND ST_DWithin(
        s.location::geography,
        ST_SetSRID(ST_MakePoint($${idx++}, $${idx++}), 4326)::geography,
        ${radiusKm * 1000}
      )`;
      binds.push(params.lng, params.lat);
    }
    if (params.province) {
      where += ` AND LOWER(s.province) = LOWER($${idx++})`;
      binds.push(params.province);
    }
    if (params.tradeId) {
      where += ` AND j.trade_id = $${idx++}`;
      binds.push(params.tradeId);
    }
    if (params.site) {
      where += ` AND s.id::text = $${idx++}`;
      binds.push(params.site);
    }

    const distanceExpr = useGeo
      ? `ROUND((ST_Distance(
           s.location::geography,
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
         ) / 1000)::numeric, 1) AS distance_km,`
      : '';

    const orderBy = useGeo
      ? 'ORDER BY distance_km ASC, j.work_date ASC'
      : 'ORDER BY j.work_date ASC, j.daily_wage DESC';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM app.jobs j
      JOIN app.construction_sites s ON j.site_id = s.id
      WHERE ${where}
    `;
    const dataSql = `
      SELECT
        j.id, j.slug, j.title, j.trade_id,
        j.work_date, j.start_time, j.end_time,
        j.daily_wage, j.slots_total, j.slots_filled,
        j.status, j.published_at,
        s.id             AS site_id,
        s.name           AS site_name,
        s.address,
        s.province,
        s.image_s3_keys  AS site_image_keys,
        s.cover_image_idx AS site_cover_idx,
        s.lat    AS site_lat,
        s.lng    AS site_lng,
        t.code AS trade_code,
        t.name_ko AS trade_name_ko,
        t.name_vi AS trade_name_vi,
        p.name_vi AS province_name_vi,
        p.name_en AS province_name_en,
        ${distanceExpr}
        NULL AS _placeholder
      FROM app.jobs j
      JOIN app.construction_sites s ON j.site_id = s.id
      LEFT JOIN ref.construction_trades t ON j.trade_id = t.id
      LEFT JOIN ref.vn_provinces p ON UPPER(s.province) = p.code
      WHERE ${where}
      ${orderBy}
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const [countRes, dataRes] = await Promise.all([
      this.db.query(countSql, binds),
      this.db.query(dataSql, [...binds, limit, offset]),
    ]);

    const total = parseInt(countRes.rows[0]?.total ?? '0', 10);
    const jobs = dataRes.rows.map((r) => ({
      ...this.mapJob(r),
      ...(useGeo && r.distance_km != null ? { distanceKm: Number(r.distance_km) } : {}),
    }));

    return {
      jobs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getJobBySlug(slug: string) {
    const { rows } = await this.db.query(
      `SELECT
        j.id, j.slug, j.title, j.description, j.trade_id,
        j.work_date, j.start_time, j.end_time,
        j.daily_wage, j.slots_total, j.slots_filled,
        j.status, j.published_at,
        j.benefits, j.requirements,
        s.id              AS site_id,
        s.name            AS site_name,
        s.address,
        s.province,
        s.lat,
        s.lng,
        s.image_s3_keys   AS site_image_keys,
        s.cover_image_idx  AS site_cover_idx,
        t.code AS trade_code,
        t.name_ko AS trade_name_ko,
        t.name_vi AS trade_name_vi,
        p.name_vi AS province_name_vi,
        p.name_en AS province_name_en
      FROM app.jobs j
      JOIN app.construction_sites s ON j.site_id = s.id
      LEFT JOIN ref.construction_trades t ON j.trade_id = t.id
      LEFT JOIN ref.vn_provinces p ON UPPER(s.province) = p.code
      WHERE j.slug = $1`,
      [slug],
    );
    if (!rows[0]) return null;

    const row = rows[0];

    // Related jobs: same trade, OPEN, different slug
    const { rows: related } = await this.db.query(
      `SELECT
        j.id, j.slug, j.title, j.trade_id,
        j.work_date, j.start_time, j.end_time,
        j.daily_wage, j.slots_total, j.slots_filled,
        j.status, j.published_at,
        s.id AS site_id, s.name AS site_name, s.address, s.province,
        s.image_s3_keys AS site_image_keys,
        s.cover_image_idx AS site_cover_idx,
        t.code AS trade_code,
        t.name_ko AS trade_name_ko,
        t.name_vi AS trade_name_vi,
        p.name_vi AS province_name_vi,
        p.name_en AS province_name_en
      FROM app.jobs j
      JOIN app.construction_sites s ON j.site_id = s.id
      LEFT JOIN ref.construction_trades t ON j.trade_id = t.id
      LEFT JOIN ref.vn_provinces p ON UPPER(s.province) = p.code
      WHERE j.trade_id = $1
        AND j.slug != $2
        AND j.status = 'OPEN'
        AND j.work_date >= CURRENT_DATE
      ORDER BY j.work_date ASC
      LIMIT 4`,
      [row.trade_id, slug],
    );

    const benefitsMap = (row.benefits ?? {}) as Record<string, boolean>;
    const benefits = Object.entries(benefitsMap).filter(([, v]) => v).map(([k]) => k);

    const reqRaw = row.requirements as Record<string, unknown> | null;
    const requirementsObj = reqRaw
      ? {
          minExperienceMonths: (reqRaw.minExperienceMonths ?? reqRaw.experience_months ?? undefined) as number | undefined,
          notes: (reqRaw.notes ?? undefined) as string | undefined,
        }
      : undefined;

    const siteImageKeys = row.site_image_keys as string[] | null;
    const siteCoverIdx = row.site_cover_idx as number | null;

    return {
      ...this.mapJob(row),
      descriptionKo: row.description,
      descriptionVi: row.description,
      benefits,
      requirementsObj,
      site: {
        slug: row.site_id,
        nameKo: row.site_name,
        nameVi: row.site_name,
        address: row.address,
        province: row.province_name_vi ?? row.province,
        provinceSlug: toProvinceSlug(row.province ?? ''),
        lat: row.lat ? Number(row.lat) : undefined,
        lng: row.lng ? Number(row.lng) : undefined,
        imageUrls: toImageUrls(siteImageKeys),
        coverImageUrl: toCoverImageUrl(siteImageKeys, siteCoverIdx),
      },
      relatedJobs: related.map((r) => this.mapJob(r)),
    };
  }

  async getSiteById(id: string) {
    const { rows } = await this.db.query(
      `SELECT
        s.id, s.name, s.address, s.province, s.lat, s.lng, s.site_type,
        s.image_s3_keys, s.cover_image_idx,
        p.name_vi AS province_name_vi,
        p.name_en AS province_name_en,
        mp.company_name,
        COUNT(j.id) FILTER (WHERE j.status = 'OPEN') AS active_job_count
      FROM app.construction_sites s
      LEFT JOIN ref.vn_provinces p ON UPPER(s.province) = p.code
      LEFT JOIN app.manager_profiles mp ON s.manager_id = mp.id
      LEFT JOIN app.jobs j ON j.site_id = s.id
      WHERE s.id = $1
      GROUP BY s.id, s.name, s.address, s.province, s.lat, s.lng, s.site_type,
               s.image_s3_keys, s.cover_image_idx,
               p.name_vi, p.name_en, mp.company_name`,
      [id],
    );
    if (!rows[0]) return null;

    const r = rows[0];
    const imageKeys = r.image_s3_keys as string[] | null;
    const coverIdx = r.cover_image_idx as number | null;

    return {
      id: r.id,
      slug: r.id,
      nameKo: r.name,
      nameVi: r.name,
      address: r.address,
      province: r.province_name_vi ?? r.province,
      provinceSlug: toProvinceSlug(r.province ?? ''),
      siteType: r.site_type,
      imageUrls: toImageUrls(imageKeys),
      coverImageUrl: toCoverImageUrl(imageKeys, coverIdx),
      lat: r.lat ? Number(r.lat) : undefined,
      lng: r.lng ? Number(r.lng) : undefined,
      managerCompany: r.company_name,
      activeJobCount: parseInt(r.active_job_count ?? '0', 10),
    };
  }

  async getProvinces() {
    const { rows } = await this.db.query(
      `SELECT code, name_vi, name_en FROM ref.vn_provinces ORDER BY name_vi`,
    );
    return rows.map((r) => ({
      code: r.code,
      nameVi: r.name_vi,
      nameEn: r.name_en,
      slug: toProvinceSlug(r.code),
    }));
  }

  async getTrades() {
    const { rows } = await this.db.query(
      `SELECT id, code, name_ko, name_vi FROM ref.construction_trades ORDER BY id`,
    );
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      nameKo: r.name_ko,
      nameVi: r.name_vi,
    }));
  }

  private mapJob(r: Record<string, unknown>) {
    const siteImageKeys = r.site_image_keys as string[] | null;
    const siteCoverIdx = r.site_cover_idx as number | null;

    return {
      id: r.id,
      slug: r.slug,
      titleKo: r.title,
      titleVi: r.title,
      tradeNameKo: r.trade_name_ko ?? '',
      tradeNameVi: r.trade_name_vi ?? '',
      provinceNameVi: (r.province_name_vi as string) ?? (r.province as string) ?? '',
      provinceSlug: toProvinceSlug((r.province as string) ?? ''),
      siteSlug: r.site_id,
      siteNameKo: r.site_name,
      workDate: r.work_date,
      startTime: r.start_time ?? undefined,
      endTime: r.end_time ?? undefined,
      dailyWage: Number(r.daily_wage),
      slotsTotal: r.slots_total,
      slotsFilled: r.slots_filled,
      status: r.status,
      coverImageUrl: toCoverImageUrl(siteImageKeys, siteCoverIdx),
      publishedAt: r.published_at,
      siteLat: r.site_lat ? parseFloat(r.site_lat as string) : undefined,
      siteLng: r.site_lng ? parseFloat(r.site_lng as string) : undefined,
      siteAddress: (r.address as string) ?? undefined,
    };
  }
}
