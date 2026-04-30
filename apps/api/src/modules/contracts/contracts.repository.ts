import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class ContractsRepository {
  constructor(private readonly db: DatabaseService) {}

  async findAcceptedApplication(applicationId: string, managerUserId: string) {
    const { rows } = await this.db.query(
      `SELECT a.*, j.id as job_id, j.title as job_title, j.work_date,
              j.daily_wage, j.start_time, j.end_time,
              mp.id as manager_profile_id,
              wp.id as worker_profile_id, wp.full_name as worker_name
       FROM app.job_applications a
       JOIN app.jobs j ON a.job_id = j.id
       JOIN app.manager_profiles mp ON j.manager_id = mp.id
       JOIN app.worker_profiles wp ON a.worker_id = wp.id
       WHERE a.id = $1 AND mp.user_id = $2 AND a.status = 'ACCEPTED'`,
      [applicationId, managerUserId],
    );
    return rows[0] || null;
  }

  async findByWorkerUserId(userId: string) {
    const { rows } = await this.db.query(
      `SELECT
         c.id,
         c.status,
         c.worker_signed_at           AS "workerSignedAt",
         c.created_at                 AS "createdAt",
         j.title                      AS "jobTitle",
         j.work_date                  AS "workDate",
         j.daily_wage::INTEGER        AS "dailyWage",
         s.name                       AS "siteName",
         mp.representative_name       AS "managerName"
       FROM app.contracts c
       JOIN app.jobs j ON c.job_id = j.id
       JOIN app.construction_sites s ON j.site_id = s.id
       JOIN app.worker_profiles wp ON c.worker_id = wp.id
       JOIN app.manager_profiles mp ON c.manager_id = mp.id
       WHERE wp.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId],
    );
    return rows;
  }

  async findById(id: string) {
    const CDN = process.env.CLOUDFRONT_URL ?? '';
    // Signatures are stored as raw data URLs (data:image/png;base64,...), not S3 keys.
    // Only apply CDN prefix to real S3 keys (not data URLs).
    const cdnUrl = (key: string | null) => {
      if (!key) return null;
      if (key.startsWith('data:')) return key;
      return CDN ? `${CDN}/${key}` : key;
    };

    const { rows } = await this.db.query(
      `SELECT
         c.id,
         c.status,
         c.contract_html              AS "contractHtml",
         c.worker_signed_at           AS "workerSignedAt",
         c.manager_signed_at          AS "managerSignedAt",
         c.worker_signature_s3_key    AS "workerSigKey",
         c.manager_signature_s3_key   AS "managerSigKey",
         c.contract_pdf_s3_key        AS "downloadKey",
         c.created_at                 AS "createdAt",
         j.title                      AS "jobTitle",
         j.work_date                  AS "workDate",
         j.daily_wage::INTEGER        AS "dailyWage",
         j.start_time                 AS "startTime",
         j.end_time                   AS "endTime",
         j.slots_total                AS "slotsTotal",
         s.name                       AS "siteName",
         s.address                    AS "siteAddress",
         wp.full_name                 AS "workerName",
         uw.phone                     AS "workerPhone",
         mp.representative_name       AS "managerName",
         um.phone                     AS "managerPhone",
         cc.name                      AS "companyName",
         cc.contact_name              AS "companyContactName",
         cc.contact_phone             AS "companyContactPhone",
         cc.signature_s3_key          AS "companySigKey"
       FROM app.contracts c
       JOIN app.jobs j ON c.job_id = j.id
       JOIN app.construction_sites s ON j.site_id = s.id
       LEFT JOIN app.construction_companies cc ON s.company_id = cc.id
       JOIN app.worker_profiles wp ON c.worker_id = wp.id
       JOIN app.users uw ON wp.user_id = uw.id
       JOIN app.manager_profiles mp ON c.manager_id = mp.id
       JOIN app.users um ON mp.user_id = um.id
       WHERE c.id = $1`,
      [id],
    );
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      ...r,
      workerSigUrl: cdnUrl(r.workerSigKey),
      managerSigUrl: cdnUrl(r.managerSigKey),
      downloadUrl: cdnUrl(r.downloadKey),
      companySigUrl: cdnUrl(r.companySigKey),
    };
  }

  async isUserPartyToContract(contractId: string, userId: string): Promise<boolean> {
    const { rows } = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM app.contracts c
       JOIN app.manager_profiles mp ON c.manager_id = mp.id
       JOIN app.worker_profiles wp ON c.worker_id = wp.id
       WHERE c.id = $1 AND (mp.user_id = $2 OR wp.user_id = $2)`,
      [contractId, userId],
    );
    return parseInt(rows[0]?.count ?? '0') > 0;
  }

  async isWorkerPartyToContract(contractId: string, workerUserId: string): Promise<boolean> {
    const { rows } = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM app.contracts c
       JOIN app.worker_profiles wp ON c.worker_id = wp.id
       WHERE c.id = $1 AND wp.user_id = $2`,
      [contractId, workerUserId],
    );
    return parseInt(rows[0]?.count ?? '0') > 0;
  }

  async findPartyUserIds(contractId: string): Promise<{ workerUserId: string | null; managerUserId: string | null }> {
    const { rows } = await this.db.query<{ worker_user_id: string; manager_user_id: string }>(
      `SELECT uw.id as worker_user_id, um.id as manager_user_id
       FROM app.contracts c
       JOIN app.worker_profiles wp ON c.worker_id = wp.id
       JOIN app.manager_profiles mp ON c.manager_id = mp.id
       JOIN app.users uw ON wp.user_id = uw.id
       JOIN app.users um ON mp.user_id = um.id
       WHERE c.id = $1`,
      [contractId],
    );
    return {
      workerUserId: rows[0]?.worker_user_id ?? null,
      managerUserId: rows[0]?.manager_user_id ?? null,
    };
  }

  async findCompanySealByJobId(jobId: string): Promise<string | null> {
    const { rows } = await this.db.query(
      `SELECT co.signature_s3_key
       FROM app.jobs j
       JOIN app.construction_sites s ON j.site_id = s.id
       JOIN app.construction_companies co ON s.company_id = co.id
       WHERE j.id = $1`,
      [jobId],
    );
    return (rows[0]?.signature_s3_key as string | null) ?? null;
  }

  async create(data: {
    applicationId: string;
    jobId: string;
    workerId: string;
    managerId: string;
    contractHtml: string;
    companySealS3Key?: string | null;
  }) {
    const seal = data.companySealS3Key ?? null;
    // Upsert: allow regeneration if worker hasn't signed yet.
    // ON CONFLICT DO UPDATE only fires when worker_signed_at IS NULL.
    // If worker already signed, the WHERE condition fails → nothing updates → returns null.
    const { rows } = await this.db.query(
      `INSERT INTO app.contracts
         (application_id, job_id, worker_id, manager_id, contract_html, status,
          manager_signature_s3_key, manager_signed_at)
       VALUES ($1, $2, $3, $4, $5, 'PENDING_WORKER_SIGN',
               $6, CASE WHEN $6::TEXT IS NOT NULL THEN NOW() ELSE NULL END)
       ON CONFLICT (application_id) DO UPDATE SET
         contract_html            = EXCLUDED.contract_html,
         status                   = 'PENDING_WORKER_SIGN',
         worker_signed_at         = NULL,
         worker_signature_s3_key  = NULL,
         manager_signed_at        = EXCLUDED.manager_signed_at,
         manager_signature_s3_key = EXCLUDED.manager_signature_s3_key,
         updated_at               = NOW()
       WHERE app.contracts.worker_signed_at IS NULL
       RETURNING *`,
      [data.applicationId, data.jobId, data.workerId, data.managerId, data.contractHtml, seal],
    );
    return rows[0] ?? null;
  }

  async sign(contractId: string, workerUserId: string, signatureData: string) {
    // Company seal is pre-filled at creation time, so worker signing completes the contract.
    const { rows } = await this.db.query(
      `UPDATE app.contracts c
       SET worker_signature_s3_key = $2,
           worker_signed_at = NOW(),
           status = 'FULLY_SIGNED',
           updated_at = NOW()
       FROM app.worker_profiles wp
       WHERE c.id = $1 AND c.worker_id = wp.id AND wp.user_id = $3
         AND c.status = 'PENDING_WORKER_SIGN'
       RETURNING c.*`,
      [contractId, signatureData, workerUserId],
    );
    return rows[0];
  }

  async isManagerPartyToContract(contractId: string, managerUserId: string): Promise<boolean> {
    const { rows } = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM app.contracts c
       JOIN app.manager_profiles mp ON c.manager_id = mp.id
       WHERE c.id = $1 AND mp.user_id = $2`,
      [contractId, managerUserId],
    );
    return parseInt(rows[0]?.count ?? '0') > 0;
  }

  async managerSign(contractId: string, managerUserId: string, signatureData: string) {
    const { rows } = await this.db.query(
      `UPDATE app.contracts c
       SET manager_signature_s3_key = $2,
           manager_signed_at = NOW(),
           status = 'FULLY_SIGNED',
           updated_at = NOW()
       FROM app.manager_profiles mp
       WHERE c.id = $1 AND c.manager_id = mp.id AND mp.user_id = $3
         AND c.status = 'PENDING_MANAGER_SIGN'
       RETURNING c.*`,
      [contractId, signatureData, managerUserId],
    );
    return rows[0];
  }

  async findByManagerUserId(userId: string) {
    const { rows } = await this.db.query(
      `SELECT
         c.id,
         c.status,
         c.worker_signed_at,
         c.created_at,
         j.title        AS job_title,
         j.work_date,
         j.daily_wage::INTEGER AS daily_wage,
         s.name         AS site_name,
         wp.full_name   AS worker_name,
         uw.phone       AS worker_phone
       FROM app.contracts c
       JOIN app.jobs j ON c.job_id = j.id
       JOIN app.construction_sites s ON j.site_id = s.id
       JOIN app.manager_profiles mp ON c.manager_id = mp.id
       JOIN app.worker_profiles wp ON c.worker_id = wp.id
       JOIN app.users uw ON wp.user_id = uw.id
       WHERE mp.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId],
    );
    return rows;
  }
}
