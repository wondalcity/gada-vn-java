<?php

namespace App\Services\Contract;

use App\Models\Application;
use App\Models\Contract;
use App\Models\ManagerProfile;
use App\Models\WorkerProfile;
use Aws\S3\S3Client;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class ContractService
{
    // ─── S3 Helpers ──────────────────────────────────────────────────────────

    private function makeS3Client(): S3Client
    {
        return new S3Client([
            'version'     => 'latest',
            'region'      => config('filesystems.disks.s3.region'),
            'credentials' => [
                'key'    => config('filesystems.disks.s3.key'),
                'secret' => config('filesystems.disks.s3.secret'),
            ],
        ]);
    }

    private function s3PutContent(string $key, string $content, string $contentType): void
    {
        $this->makeS3Client()->putObject([
            'Bucket'      => config('filesystems.disks.s3.bucket'),
            'Key'         => $key,
            'Body'        => $content,
            'ContentType' => $contentType,
        ]);
    }

    private function s3PresignedUrl(string $key, int $ttl = 900): string
    {
        $client = $this->makeS3Client();
        $cmd    = $client->getCommand('GetObject', [
            'Bucket' => config('filesystems.disks.s3.bucket'),
            'Key'    => $key,
        ]);

        return (string) $client->createPresignedRequest($cmd, "+{$ttl} seconds")->getUri();
    }

    // ─── Signature Upload ─────────────────────────────────────────────────────

    /**
     * Decode a base64 data URL and upload raw bytes to S3.
     * Supports both PNG (data:image/png;base64,...) and SVG
     * (data:image/svg+xml;base64,...) formats.
     */
    private function uploadSignatureFromDataUrl(
        string $dataUrl,
        string $s3Key,
        S3Client $client
    ): void {
        // Match any image/* MIME type, including svg+xml
        if (!preg_match('/^data:(image\/[\w+]+);base64,(.+)$/s', $dataUrl, $m)) {
            throw new RuntimeException('Invalid signature_data_url format.');
        }

        $mimeType = $m[1]; // e.g. "image/png" or "image/svg+xml"
        $binary   = base64_decode($m[2], strict: true);

        if ($binary === false) {
            throw new RuntimeException('Failed to decode base64 signature data.');
        }

        $client->putObject([
            'Bucket'      => config('filesystems.disks.s3.bucket'),
            'Key'         => $s3Key,
            'Body'        => $binary,
            'ContentType' => $mimeType,
        ]);
    }

    /**
     * Extract the MIME type from a base64 data URL without decoding the payload.
     * Returns e.g. "image/png" or "image/svg+xml".
     * Throws if the format is not a valid image data URL.
     */
    private function mimeTypeFromDataUrl(string $dataUrl): string
    {
        if (!preg_match('/^data:(image\/[\w+]+);base64,/s', $dataUrl, $m)) {
            throw new RuntimeException('Invalid signature_data_url format.');
        }
        return $m[1];
    }

    /**
     * Derive the file extension for a signature S3 key based on MIME type.
     */
    private function signatureExtension(string $mimeType): string
    {
        return match ($mimeType) {
            'image/svg+xml' => 'svg',
            'image/jpeg'    => 'jpg',
            default         => 'png',
        };
    }

    // ─── Public API: getSignatureUrl ──────────────────────────────────────────

    /**
     * Return a presigned URL for any stored S3 key (signature images, etc.).
     */
    public function getSignatureUrl(string $key, int $ttl = 900): string
    {
        return $this->s3PresignedUrl($key, $ttl);
    }

    // ─── Public API: getDownloadUrl ───────────────────────────────────────────

    /**
     * Return a presigned download URL for the contract HTML file, or null.
     */
    public function getDownloadUrl(Contract $contract): ?string
    {
        if (!$contract->contract_pdf_s3_key) {
            return null;
        }

        return $this->s3PresignedUrl($contract->contract_pdf_s3_key, 900);
    }

    // ─── Public API: generate ─────────────────────────────────────────────────

    /**
     * Generate a new contract for an ACCEPTED application.
     * Uploads contract HTML to S3 and persists the Contract record.
     *
     * @throws RuntimeException if a contract already exists for the application.
     */
    public function generate(Application $application): Contract
    {
        $application->loadMissing(['job.site', 'job.trade', 'worker', 'job.manager']);

        if (Contract::where('application_id', $application->id)->exists()) {
            throw new RuntimeException('Contract already exists for this application.');
        }

        $contractId = (string) Str::uuid();

        // Neither party has signed yet — both blocks show "pending"
        $html = $this->generateHtml($application, contractId: $contractId);

        $htmlKey = "contracts/{$contractId}/contract.html";
        $this->s3PutContent($htmlKey, $html, 'text/html; charset=utf-8');

        $contract = Contract::create([
            'id'                  => $contractId,
            'application_id'      => $application->id,
            'job_id'              => $application->job_id,
            'worker_id'           => $application->worker_id,
            'manager_id'          => $application->job->manager_id,
            'contract_html'       => $html,
            'contract_pdf_s3_key' => $htmlKey,
            'status'              => 'PENDING_WORKER_SIGN',
        ]);

        return $contract;
    }

    // ─── Public API: workerSign ───────────────────────────────────────────────

    /**
     * Record the worker's signature and advance status to PENDING_MANAGER_SIGN.
     *
     * @throws RuntimeException on invalid state or ownership mismatch.
     */
    public function workerSign(
        Contract $contract,
        WorkerProfile $worker,
        string $signatureDataUrl,
        string $ip
    ): Contract {
        if ($contract->status !== 'PENDING_WORKER_SIGN') {
            throw new RuntimeException('Contract is not awaiting worker signature.');
        }

        if ($contract->worker_id !== $worker->id) {
            throw new RuntimeException('Worker does not own this contract.');
        }

        $client = $this->makeS3Client();

        // Detect format first so the S3 key has the correct extension
        $ext          = $this->signatureExtension($this->mimeTypeFromDataUrl($signatureDataUrl));
        $workerSigKey = "contract-signatures/{$contract->id}/worker.{$ext}";
        $this->uploadSignatureFromDataUrl($signatureDataUrl, $workerSigKey, $client);

        // Regenerate HTML with worker signature embedded (manager still pending)
        $workerSigUrl = $this->s3PresignedUrl($workerSigKey, 3600);
        $contract->loadMissing(['job.site', 'job.trade', 'worker', 'manager']);
        $application = $contract->application ?? Application::with([
            'job.site', 'job.trade', 'worker', 'job.manager',
        ])->find($contract->application_id);

        $html = $this->generateHtml(
            $application,
            workerSigUrl: $workerSigUrl,
            contractId: $contract->id,
            workerSignedAt: now(),
        );

        $this->s3PutContent($contract->contract_pdf_s3_key, $html, 'text/html; charset=utf-8');

        $contract->update([
            'worker_signature_s3_key' => $workerSigKey,
            'worker_signed_at'        => now(),
            'worker_signed_ip'        => $ip,
            'contract_html'           => $html,
            'status'                  => 'PENDING_MANAGER_SIGN',
        ]);

        return $contract->fresh();
    }

    // ─── Public API: managerSign ──────────────────────────────────────────────

    /**
     * Record the manager's signature, finalise contract, and mark application CONTRACTED.
     *
     * @throws RuntimeException on invalid state or ownership mismatch.
     */
    public function managerSign(
        Contract $contract,
        ManagerProfile $manager,
        string $signatureDataUrl,
        string $ip
    ): Contract {
        if ($contract->status !== 'PENDING_MANAGER_SIGN') {
            throw new RuntimeException('Contract is not awaiting manager signature.');
        }

        if ($contract->manager_id !== $manager->id) {
            throw new RuntimeException('Manager does not own this contract.');
        }

        $client = $this->makeS3Client();

        // Detect format first so the S3 key has the correct extension
        $ext           = $this->signatureExtension($this->mimeTypeFromDataUrl($signatureDataUrl));
        $managerSigKey = "contract-signatures/{$contract->id}/manager.{$ext}";
        $this->uploadSignatureFromDataUrl($signatureDataUrl, $managerSigKey, $client);

        // Build presigned URLs for both signatures to embed in final HTML
        $workerSigUrl  = $contract->worker_signature_s3_key
            ? $this->s3PresignedUrl($contract->worker_signature_s3_key, 3600)
            : null;
        $managerSigUrl = $this->s3PresignedUrl($managerSigKey, 3600);

        $application = Application::with([
            'job.site', 'job.trade', 'worker', 'job.manager',
        ])->find($contract->application_id);

        $html = $this->generateHtml(
            $application,
            workerSigUrl: $workerSigUrl,
            managerSigUrl: $managerSigUrl,
            contractId: $contract->id,
            workerSignedAt: $contract->worker_signed_at,
            managerSignedAt: now(),
        );

        $this->s3PutContent($contract->contract_pdf_s3_key, $html, 'text/html; charset=utf-8');

        $contract->update([
            'manager_signature_s3_key' => $managerSigKey,
            'manager_signed_at'        => now(),
            'manager_signed_ip'        => $ip,
            'contract_html'            => $html,
            'status'                   => 'FULLY_SIGNED',
        ]);

        // Advance the application to CONTRACTED
        Application::where('id', $contract->application_id)
            ->update(['status' => 'CONTRACTED']);

        return $contract->fresh();
    }

    // ─── HTML Generation ──────────────────────────────────────────────────────

    /**
     * Build a complete standalone HTML contract document.
     *
     * @param Application        $application    Loaded with job.site, job.trade, worker, job.manager
     * @param string|null        $workerSigUrl   Presigned URL of worker signature image (or null)
     * @param string|null        $managerSigUrl  Presigned URL of manager signature image (or null)
     * @param string|null        $contractId     UUID of the contract (for display)
     * @param \DateTimeInterface|null $workerSignedAt
     * @param \DateTimeInterface|null $managerSignedAt
     */
    public function generateHtml(
        Application $application,
        ?string $workerSigUrl = null,
        ?string $managerSigUrl = null,
        ?string $contractId = null,
        mixed $workerSignedAt = null,
        mixed $managerSignedAt = null,
    ): string {
        $job     = $application->job;
        $site    = $job->site;
        $trade   = $job->trade;
        $worker  = $application->worker;
        $manager = $job->manager;

        // ── Party info ────────────────────────────────────────────────────────
        $managerCompany  = $manager->company_name ?? $manager->representative_name ?? '';
        $managerRepName  = $manager->representative_name ?? '';
        $managerPhone    = $manager->contact_phone ?? '';
        $managerAddress  = $manager->contact_address ?? '';

        $workerName = $worker->full_name ?? '';
        $workerDob  = $worker->date_of_birth
            ? date('Y년 m월 d일', strtotime((string) $worker->date_of_birth))
            : '-';
        $workerPhone = DB::table('auth.users')
            ->where('id', $worker->user_id)
            ->value('phone') ?? '';

        // ── Job info ──────────────────────────────────────────────────────────
        $tradeName   = $trade->name_ko ?? $job->title ?? '';
        $siteName    = $site->name ?? '';
        $siteAddress = $site->address ?? '';

        $workDateRaw = $job->work_date ? (string) $job->work_date : null;
        $workDate    = $workDateRaw ? $this->formatKoreanDate($workDateRaw) : '-';

        $startTime  = $job->start_time ?? '-';
        $endTime    = $job->end_time   ?? '-';
        $dailyWage  = number_format((int) ($job->daily_wage ?? 0));

        // ── Contract meta ─────────────────────────────────────────────────────
        $displayId = $contractId ? substr($contractId, 0, 8) : '--------';
        $issuedAt  = now()->format('Y-m-d H:i');

        // ── Signature blocks ──────────────────────────────────────────────────
        $workerSigBlock = $workerSigUrl
            ? '<img src="' . htmlspecialchars($workerSigUrl, ENT_QUOTES) . '" alt="서명"/>'
            : '<span class="pending">서명 대기 중</span>';

        $managerSigBlock = $managerSigUrl
            ? '<img src="' . htmlspecialchars($managerSigUrl, ENT_QUOTES) . '" alt="서명"/>'
            : '<span class="pending">서명 대기 중</span>';

        $workerSigDateHtml = $workerSignedAt
            ? '서명일시: ' . htmlspecialchars(
                (is_string($workerSignedAt)
                    ? $workerSignedAt
                    : (method_exists($workerSignedAt, 'format')
                        ? $workerSignedAt->format('Y-m-d H:i')
                        : (string) $workerSignedAt)),
                ENT_QUOTES
            )
            : '';

        $managerSigDateHtml = $managerSignedAt
            ? '서명일시: ' . htmlspecialchars(
                (is_string($managerSignedAt)
                    ? $managerSignedAt
                    : (method_exists($managerSignedAt, 'format')
                        ? $managerSignedAt->format('Y-m-d H:i')
                        : (string) $managerSignedAt)),
                ENT_QUOTES
            )
            : '';

        return <<<HTML
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>근로계약서</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; font-size: 14px; color: #222; background: #fff; padding: 40px; max-width: 800px; margin: 0 auto; }
  h1 { text-align: center; font-size: 24px; font-weight: 700; margin-bottom: 8px; letter-spacing: 4px; }
  h2 { text-align: center; font-size: 13px; color: #555; margin-bottom: 32px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 15px; font-weight: 700; border-bottom: 2px solid #0669F7; padding-bottom: 6px; margin-bottom: 16px; color: #0669F7; }
  .row { display: flex; margin-bottom: 8px; }
  .label { width: 160px; flex-shrink: 0; font-weight: 600; color: #555; }
  .value { flex: 1; }
  .clause { margin-bottom: 12px; line-height: 1.7; }
  .clause-num { font-weight: 700; margin-right: 8px; }
  .sig-block { display: flex; gap: 40px; margin-top: 48px; padding-top: 32px; border-top: 1px solid #ddd; }
  .sig-party { flex: 1; }
  .sig-party h3 { font-size: 14px; font-weight: 700; margin-bottom: 16px; color: #333; }
  .sig-img-box { border: 1px solid #ddd; border-radius: 4px; height: 100px; display: flex; align-items: center; justify-content: center; background: #fafafa; overflow: hidden; margin-bottom: 8px; }
  .sig-img-box img { max-height: 90px; max-width: 200px; }
  .sig-img-box .pending { color: #aaa; font-size: 13px; }
  .sig-meta { font-size: 12px; color: #888; }
  .stamp { text-align: center; margin-top: 24px; font-size: 13px; color: #888; }
  .highlight { background: #f0f7ff; border-left: 3px solid #0669F7; padding: 12px 16px; border-radius: 4px; margin: 16px 0; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<h1>근로계약서</h1>
<h2>Hợp Đồng Lao Động</h2>

<div class="section">
  <div class="section-title">계약 당사자 / Các Bên Ký Kết</div>
  <div style="display:flex;gap:32px;">
    <div style="flex:1;">
      <p style="font-weight:700;margin-bottom:8px;">갑 (사업주) / Bên A (Chủ Sử Dụng Lao Động)</p>
      <div class="row"><span class="label">상호명</span><span class="value">{$managerCompany}</span></div>
      <div class="row"><span class="label">대표자</span><span class="value">{$managerRepName}</span></div>
      <div class="row"><span class="label">연락처</span><span class="value">{$managerPhone}</span></div>
      <div class="row"><span class="label">주소</span><span class="value">{$managerAddress}</span></div>
    </div>
    <div style="flex:1;">
      <p style="font-weight:700;margin-bottom:8px;">을 (근로자) / Bên B (Người Lao Động)</p>
      <div class="row"><span class="label">성명</span><span class="value">{$workerName}</span></div>
      <div class="row"><span class="label">생년월일</span><span class="value">{$workerDob}</span></div>
      <div class="row"><span class="label">연락처</span><span class="value">{$workerPhone}</span></div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">근무 조건 / Điều Kiện Làm Việc</div>
  <div class="highlight">
    <div class="row"><span class="label">직종</span><span class="value">{$tradeName}</span></div>
    <div class="row"><span class="label">근무지</span><span class="value">{$siteName}, {$siteAddress}</span></div>
    <div class="row"><span class="label">근무일</span><span class="value">{$workDate}</span></div>
    <div class="row"><span class="label">근무시간</span><span class="value">{$startTime} ~ {$endTime}</span></div>
    <div class="row"><span class="label">일당</span><span class="value">{$dailyWage} ₫</span></div>
  </div>
</div>

<div class="section">
  <div class="section-title">계약 조건 / Điều Khoản Hợp Đồng</div>
  <div class="clause"><span class="clause-num">제1조</span>갑은 을에게 위 근무 조건에 따른 업무를 제공하며, 을은 성실히 근무하여야 한다.</div>
  <div class="clause"><span class="clause-num">제2조</span>임금은 근무일 완료 후 합의된 방법으로 지급한다.</div>
  <div class="clause"><span class="clause-num">제3조</span>안전 및 보건에 관한 규정을 준수하며, 갑은 안전한 근무 환경을 제공하여야 한다.</div>
  <div class="clause"><span class="clause-num">제4조</span>본 계약에 명시되지 않은 사항은 근로기준법 및 관련 법령을 따른다.</div>
</div>

<div class="sig-block">
  <div class="sig-party">
    <h3>갑 (사업주) 서명 / Chữ Ký Bên A</h3>
    <div class="sig-img-box">
      {$managerSigBlock}
    </div>
    <div class="sig-meta">{$managerSigDateHtml}</div>
  </div>
  <div class="sig-party">
    <h3>을 (근로자) 서명 / Chữ Ký Bên B</h3>
    <div class="sig-img-box">
      {$workerSigBlock}
    </div>
    <div class="sig-meta">{$workerSigDateHtml}</div>
  </div>
</div>

<div class="stamp">계약 ID: {$displayId} · 발급일시: {$issuedAt}</div>
</body>
</html>
HTML;
    }

    // ─── Private: Korean date formatting ─────────────────────────────────────

    /**
     * Format a date string as Korean date with day-of-week.
     * e.g. "2025-06-16" → "2025년 06월 16일 (월)"
     */
    private function formatKoreanDate(string $dateStr): string
    {
        $ts      = strtotime($dateStr);
        $dayMap  = [
            'Mon' => '월', 'Tue' => '화', 'Wed' => '수',
            'Thu' => '목', 'Fri' => '금', 'Sat' => '토', 'Sun' => '일',
        ];
        $dayKey  = date('D', $ts);
        $dayKo   = $dayMap[$dayKey] ?? $dayKey;

        return date('Y년 m월 d일', $ts) . " ({$dayKo})";
    }
}
