# GADA VN — Test Data Strategy (Staging)
**Date**: 2026-03-21
**Scope**: Seed data, factory definitions, data lifecycle, environment isolation

---

## 1. Principles

1. **Deterministic**: Every CI run starts from the same known state. Tests should not rely on data left by previous runs.
2. **Isolated**: Each test or test suite owns its data. Shared fixtures are read-only.
3. **Realistic**: Seed data matches production data shapes (Vietnamese names, VND wages, valid provinces/trades).
4. **Fast to reset**: A full staging DB reset completes in < 30 seconds.
5. **No production data**: Staging never copies PII from production. All seed data is synthetic.

---

## 2. Data Tiers

| Tier | Description | How Created | Teardown |
|------|-------------|-------------|---------|
| **T0 — Reference** | Provinces, trades (63 + 120 rows) | Migration seed, immutable | Never deleted |
| **T1 — Persistent fixtures** | Named test accounts (worker@, manager@, admin@) | `staging:seed` command | Reset on `staging:reset` only |
| **T2 — Test-owned** | Data created per test suite run | Factory inside test | Deleted after suite |
| **T3 — Ephemeral** | Data created within a single test | API calls in test body | DB transaction rollback or explicit delete |

---

## 3. Persistent Fixture Accounts (T1)

These accounts exist permanently on staging and are referenced by Playwright auth state files.

### 3.1 Account Matrix

| Account | Email | Role | Status | Purpose |
|---------|-------|------|--------|---------|
| `worker-01` | `worker01@staging.gada.vn` | worker | ACTIVE | Happy-path worker tests |
| `worker-02` | `worker02@staging.gada.vn` | worker | ACTIVE | Concurrent / conflict tests |
| `worker-suspended` | `suspended@staging.gada.vn` | worker | SUSPENDED | Auth suspension test |
| `manager-approved` | `manager@staging.gada.vn` | manager | ACTIVE (APPROVED) | All manager flow tests |
| `manager-pending` | `mgr-pending@staging.gada.vn` | worker | ACTIVE (PENDING approval) | Role gating test |
| `admin` | `admin@staging.gada.vn` | admin | ACTIVE | Admin panel tests |

All accounts use password: defined in `STAGING_*_PASSWORD` GitHub secrets (never in repo).
Firebase UIDs: set during `staging:seed` and stored in `packages/db/seeds/staging-fixtures.json` (gitignored).

### 3.2 Pre-seeded Data for Fixtures

For `manager-approved`:
- 2 construction sites (Hanoi + HCM)
- 3 published jobs per site (2 OPEN, 1 COMPLETED)
- 1 fully signed contract (for download test)
- Attendance records for the completed job

For `worker-01`:
- Complete worker profile (full_name, DOB, trade skills)
- 2 applications: 1 PENDING, 1 ACCEPTED
- 1 contract in `PENDING_WORKER_SIGN` state (for sign test)

---

## 4. Reference Data (T0)

### 4.1 Vietnamese Provinces

```sql
-- Subset for UI tests (full 63-row seed in packages/db/seeds/provinces.sql)
INSERT INTO ref.vn_provinces (code, name_vi, name_en) VALUES
  ('hanoi',         N'Hà Nội',             'Hanoi'),
  ('ho-chi-minh',   N'Hồ Chí Minh',        'Ho Chi Minh City'),
  ('da-nang',       N'Đà Nẵng',            'Da Nang'),
  ('binh-duong',    N'Bình Dương',          'Binh Duong'),
  ('dong-nai',      N'Đồng Nai',           'Dong Nai'),
  ('hai-phong',     N'Hải Phòng',          'Hai Phong'),
  ('can-tho',       N'Cần Thơ',            'Can Tho'),
  ('ba-ria-vung-tau', N'Bà Rịa–Vũng Tàu', 'Ba Ria-Vung Tau');
```

### 4.2 Construction Trades (sample)

```sql
-- Sample from packages/db/seeds/trades.sql
INSERT INTO ref.construction_trades (code, name_ko, name_vi, name_en) VALUES
  ('rebar',       '철근공',    'Thợ sắt',         'Rebar Worker'),
  ('concrete',    '레미콘',    'Thợ bê tông',      'Concrete Worker'),
  ('carpenter',   '목공',      'Thợ mộc',          'Carpenter'),
  ('mason',       '미장공',    'Thợ hồ',           'Mason'),
  ('painter',     '도장공',    'Thợ sơn',          'Painter'),
  ('electrician', '전기공',    'Thợ điện',         'Electrician'),
  ('plumber',     '설비공',    'Thợ nước',         'Plumber'),
  ('crane',       '크레인',    'Tài xế cẩu',       'Crane Operator'),
  ('scaffolding', '비계공',    'Thợ dàn giáo',     'Scaffolding Worker'),
  ('welder',      '용접공',    'Thợ hàn',          'Welder');
```

---

## 5. Factory Definitions (T2/T3)

### 5.1 PHP (Pest / Laravel)

```php
// database/factories/UserFactory.php
class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'id'           => (string) Str::uuid(),
            'firebase_uid' => 'test_' . fake()->uuid(),
            'phone'        => fake()->unique()->numerify('+849########'),
            'email'        => fake()->unique()->safeEmail(),
            'role'         => 'worker',
            'status'       => 'ACTIVE',
        ];
    }

    public function worker(): static    { return $this->state(['role' => 'WORKER']); }
    public function manager(): static   { return $this->state(['role' => 'MANAGER']); }
    public function admin(): static     { return $this->state(['role' => 'ADMIN']); }
    public function suspended(): static { return $this->state(['status' => 'SUSPENDED']); }
}

// database/factories/WorkerProfileFactory.php
class WorkerProfileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id'                => (string) Str::uuid(),
            'full_name'         => fake()->name(),
            'date_of_birth'     => fake()->dateTimeBetween('-45y', '-18y')->format('Y-m-d'),
            'gender'            => fake()->randomElement(['male', 'female']),
            'current_province'  => fake()->randomElement(['hanoi', 'ho-chi-minh', 'da-nang']),
            'experience_months' => fake()->numberBetween(0, 120),
            'profile_complete'  => false,
        ];
    }
}

// database/factories/SiteFactory.php
class SiteFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id'        => (string) Str::uuid(),
            'name'      => fake()->company() . ' 건설 현장',
            'address'   => fake()->streetAddress() . ', Hanoi',
            'province'  => 'hanoi',
            'site_type' => 'COMMERCIAL',
            'status'    => 'ACTIVE',
            'lat'       => fake()->latitude(10.5, 21.5),   // Vietnam bounding box
            'lng'       => fake()->longitude(102.0, 110.0),
        ];
    }
}

// database/factories/JobFactory.php
class JobFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id'           => (string) Str::uuid(),
            'title'        => '건설 일용직 구인',
            'trade_id'     => DB::table('ref.construction_trades')->inRandomOrder()->value('id'),
            'work_date'    => now()->addDays(fake()->numberBetween(1, 30))->toDateString(),
            'start_time'   => '08:00',
            'end_time'     => '17:00',
            'daily_wage'   => fake()->randomElement([300000, 350000, 400000, 450000]),
            'slots_total'  => fake()->numberBetween(1, 10),
            'slots_filled' => 0,
            'status'       => 'OPEN',
        ];
    }

    public function open(): static   { return $this->state(['status' => 'OPEN', 'slots_filled' => 0]); }
    public function filled(): static { return $this->state(['status' => 'FILLED', 'slots_filled' => fn(array $a) => $a['slots_total']]); }
    public function completed(): static { return $this->state(['status' => 'COMPLETED', 'work_date' => now()->subDays(3)->toDateString()]); }
}

// database/factories/ApplicationFactory.php
class ApplicationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id'        => (string) Str::uuid(),
            'status'    => 'PENDING',
            'applied_at' => now(),
        ];
    }

    public function pending(): static    { return $this->state(['status' => 'PENDING']); }
    public function accepted(): static   { return $this->state(['status' => 'ACCEPTED', 'reviewed_at' => now()]); }
    public function contracted(): static { return $this->state(['status' => 'CONTRACTED']); }
    public function rejected(): static   { return $this->state(['status' => 'REJECTED', 'reviewed_at' => now()]); }
    public function withdrawn(): static  { return $this->state(['status' => 'WITHDRAWN']); }
}

// database/factories/ContractFactory.php
class ContractFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id'                  => (string) Str::uuid(),
            'status'              => 'PENDING_WORKER_SIGN',
            'contract_html'       => '<html><body>테스트 계약서</body></html>',
            'contract_pdf_s3_key' => fn(array $a) => "contracts/{$a['id']}/contract.html",
        ];
    }

    public function pendingWorkerSign(): static  { return $this->state(['status' => 'PENDING_WORKER_SIGN']); }
    public function pendingManagerSign(): static {
        return $this->state([
            'status'              => 'PENDING_MANAGER_SIGN',
            'worker_signed_at'    => now()->subMinutes(10),
            'worker_signed_ip'    => '127.0.0.1',
            'worker_signature_s3_key' => fn(array $a) => "contract-signatures/{$a['id']}/worker.svg",
        ]);
    }
    public function fullySigned(): static {
        return $this->state([
            'status'                  => 'FULLY_SIGNED',
            'worker_signed_at'        => now()->subMinutes(20),
            'manager_signed_at'       => now()->subMinutes(5),
            'worker_signature_s3_key' => fn(array $a) => "contract-signatures/{$a['id']}/worker.svg",
            'manager_signature_s3_key' => fn(array $a) => "contract-signatures/{$a['id']}/manager.png",
        ]);
    }
}
```

### 5.2 TypeScript (Playwright helpers)

```typescript
// tests/e2e/fixtures/data-factory.ts

export interface SeedJob {
  slug: string;
  title: string;
  status: 'OPEN' | 'FILLED' | 'COMPLETED';
}

/**
 * Create a test job via API and return its slug.
 * Requires a manager auth token.
 */
export async function createTestJob(
  request: import('@playwright/test').APIRequestContext,
  managerToken: string,
  siteId: string,
  override: Partial<Record<string, unknown>> = {}
): Promise<SeedJob> {
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];
  const res = await request.post(`/api/v1/manager/sites/${siteId}/jobs`, {
    headers: { Authorization: `Bearer ${managerToken}` },
    data: {
      title: `Test Job ${Date.now()}`,
      trade_id: 1,
      work_date: tomorrow,
      start_time: '08:00',
      end_time: '17:00',
      daily_wage: 350000,
      slots_total: 3,
      ...override,
    },
  });
  const body = await res.json();
  return { slug: body.data.slug, title: body.data.title, status: 'OPEN' };
}

/**
 * Delete a job after a test (cleanup).
 */
export async function deleteTestJob(
  request: import('@playwright/test').APIRequestContext,
  managerToken: string,
  jobId: string
) {
  await request.delete(`/api/v1/manager/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
}
```

---

## 6. Staging DB Reset Script

```bash
#!/usr/bin/env bash
# scripts/staging-reset.sh
# Full staging DB reset: drop T2/T3 data, re-seed T1 fixtures.
# Run from CI on nightly or manually before a QA session.

set -euo pipefail

echo "=== GADA VN Staging DB Reset ==="

# 1. Run all migrations from scratch
psql "$STAGING_DB_URL" <<SQL
  -- Truncate all app tables (preserve ref and auth fixtures)
  TRUNCATE app.attendance_audits  CASCADE;
  TRUNCATE app.attendance_records CASCADE;
  TRUNCATE app.contracts          CASCADE;
  TRUNCATE app.job_applications   CASCADE;
  TRUNCATE app.jobs               CASCADE;
  TRUNCATE app.construction_sites CASCADE;
  TRUNCATE app.manager_profiles   CASCADE;
  TRUNCATE app.worker_trade_skills CASCADE;
  TRUNCATE app.worker_profiles    CASCADE;
  TRUNCATE ops.notifications      CASCADE;
  TRUNCATE ops.fcm_tokens         CASCADE;
  TRUNCATE ops.audit_logs         CASCADE;

  -- Reset users to seed set only
  DELETE FROM auth.user_roles;
  DELETE FROM auth.users WHERE email NOT LIKE '%@staging.gada.vn';
SQL

# 2. Re-seed fixture accounts
php artisan db:seed --class=StagingFixtureSeeder --env=staging

echo "=== Reset complete ==="
```

---

## 7. Seeder Class

```php
// database/seeders/StagingFixtureSeeder.php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StagingFixtureSeeder extends Seeder
{
    public function run(): void
    {
        // ── Reference data ──────────────────────────────────────────────────
        $this->call(ProvincesSeeder::class);
        $this->call(TradesSeeder::class);

        // ── Fixture users ────────────────────────────────────────────────────
        $worker01Id = $this->upsertUser('worker01@staging.gada.vn', 'WORKER');
        $worker02Id = $this->upsertUser('worker02@staging.gada.vn', 'WORKER');
        $suspendedId = $this->upsertUser('suspended@staging.gada.vn', 'WORKER', 'SUSPENDED');
        $managerId  = $this->upsertUser('manager@staging.gada.vn', 'MANAGER');
        $mgPendingId = $this->upsertUser('mgr-pending@staging.gada.vn', 'WORKER');
        $adminId    = $this->upsertUser('admin@staging.gada.vn', 'ADMIN');

        // ── Worker profiles ──────────────────────────────────────────────────
        $wpId = (string) Str::uuid();
        DB::table('app.worker_profiles')->insertOrIgnore([
            'id'               => $wpId,
            'user_id'          => $worker01Id,
            'full_name'        => 'Nguyễn Văn Test 01',
            'date_of_birth'    => '1995-06-15',
            'gender'           => 'male',
            'current_province' => 'ho-chi-minh',
            'experience_months'=> 36,
            'profile_complete' => true,
            'primary_trade_id' => DB::table('ref.construction_trades')->where('code', 'rebar')->value('id'),
        ]);

        // ── Manager profile (approved) ────────────────────────────────────────
        $mpId = (string) Str::uuid();
        DB::table('app.manager_profiles')->insertOrIgnore([
            'id'                  => $mpId,
            'user_id'             => $managerId,
            'business_type'       => 'CORPORATE',
            'company_name'        => 'Gada Test Construction Co.',
            'representative_name' => 'Kim Test Manager',
            'contact_phone'       => '+82101230001',
            'contact_address'     => 'Seoul, Korea',
            'province'            => 'ho-chi-minh',
            'approval_status'     => 'APPROVED',
            'approved_at'         => now(),
            'terms_accepted'      => true,
            'privacy_accepted'    => true,
        ]);
        DB::table('auth.user_roles')->insertOrIgnore(['user_id' => $managerId, 'role' => 'manager']);

        // ── Manager profile (pending) ─────────────────────────────────────────
        DB::table('app.manager_profiles')->insertOrIgnore([
            'id'              => (string) Str::uuid(),
            'user_id'         => $mgPendingId,
            'business_type'   => 'INDIVIDUAL',
            'representative_name' => 'Pending Manager',
            'contact_phone'   => '+82101230002',
            'contact_address' => 'Busan, Korea',
            'province'        => 'hanoi',
            'approval_status' => 'PENDING',
            'terms_accepted'  => true,
            'privacy_accepted'=> true,
        ]);

        // ── Sites ─────────────────────────────────────────────────────────────
        $hanoiSiteId = (string) Str::uuid();
        $hcmSiteId   = (string) Str::uuid();

        DB::table('app.construction_sites')->insertOrIgnore([
            ['id' => $hanoiSiteId, 'manager_id' => $mpId, 'name' => 'Hanoi Test Tower',    'address' => '123 Ba Dinh, Hanoi',    'province' => 'hanoi',         'site_type' => 'COMMERCIAL', 'status' => 'ACTIVE', 'lat' => 21.0285, 'lng' => 105.8542],
            ['id' => $hcmSiteId,   'manager_id' => $mpId, 'name' => 'HCM Test Apartment', 'address' => '456 District 1, HCM', 'province' => 'ho-chi-minh',   'site_type' => 'RESIDENTIAL','status' => 'ACTIVE', 'lat' => 10.7769, 'lng' => 106.7009],
        ]);

        // ── Jobs ──────────────────────────────────────────────────────────────
        $rebarTradeId    = DB::table('ref.construction_trades')->where('code', 'rebar')->value('id');
        $concreteTradeId = DB::table('ref.construction_trades')->where('code', 'concrete')->value('id');

        $openJobId = (string) Str::uuid();
        DB::table('app.jobs')->insertOrIgnore([
            'id'           => $openJobId,
            'site_id'      => $hcmSiteId,
            'manager_id'   => $mpId,
            'title'        => '철근 작업 구인 (테스트)',
            'trade_id'     => $rebarTradeId,
            'work_date'    => now()->addDays(7)->toDateString(),
            'start_time'   => '08:00',
            'end_time'     => '17:00',
            'daily_wage'   => 350000,
            'slots_total'  => 3,
            'slots_filled' => 0,
            'status'       => 'OPEN',
            'slug'         => 'sat-thep-test-' . now()->format('Ymd'),
            'published_at' => now(),
        ]);

        // ── Application (PENDING) — for worker sign test setup ────────────────
        $appId = (string) Str::uuid();
        DB::table('app.job_applications')->insertOrIgnore([
            'id'         => $appId,
            'job_id'     => $openJobId,
            'worker_id'  => $wpId,
            'status'     => 'ACCEPTED',
            'applied_at' => now()->subDays(1),
            'reviewed_at'=> now()->subHours(12),
        ]);

        // ── Contract (PENDING_WORKER_SIGN) ────────────────────────────────────
        $contractId = (string) Str::uuid();
        DB::table('app.contracts')->insertOrIgnore([
            'id'                  => $contractId,
            'application_id'      => $appId,
            'job_id'              => $openJobId,
            'worker_id'           => $wpId,
            'manager_id'          => $mpId,
            'contract_html'       => '<html><body>테스트 계약서</body></html>',
            'contract_pdf_s3_key' => "contracts/{$contractId}/contract.html",
            'status'              => 'PENDING_WORKER_SIGN',
        ]);

        // Write seed metadata for test fixtures
        $meta = [
            'openJobId'  => $openJobId,
            'openJobSlug'=> 'sat-thep-test-' . now()->format('Ymd'),
            'contractId' => $contractId,
            'appId'      => $appId,
            'worker01Id' => $worker01Id,
            'managerId'  => $managerId,
            'hcmSiteId'  => $hcmSiteId,
        ];
        file_put_contents(base_path('../../tests/e2e/fixtures/.seed-meta.json'), json_encode($meta, JSON_PRETTY_PRINT));

        $this->command->info('Staging fixtures seeded. Metadata written to tests/e2e/fixtures/.seed-meta.json');
    }

    private function upsertUser(string $email, string $role, string $status = 'ACTIVE'): string
    {
        $id = DB::table('auth.users')->where('email', $email)->value('id');
        if (!$id) {
            $id = (string) Str::uuid();
            DB::table('auth.users')->insert([
                'id'          => $id,
                'firebase_uid'=> 'staging_' . Str::slug($email),
                'email'       => $email,
                'role'        => $role,
                'status'      => $status,
            ]);
        }
        DB::table('auth.user_roles')->insertOrIgnore([
            'user_id' => $id,
            'role'    => strtolower($role),
        ]);
        return $id;
    }
}
```

---

## 8. Test Data Lifecycle

```
CI Push
  │
  ├─ Integration tests (Pest)
  │    ├─ RefreshDatabase trait — full DB wipe + migrate per test class
  │    ├─ ProvincesSeeder + TradesSeeder run in TestCase::setUp()
  │    └─ Factories create T3 data per test → rolled back in teardown
  │
  └─ E2E tests (Playwright)
       ├─ global.setup.ts logs in with T1 fixture accounts
       ├─ Tests create T2/T3 data via API calls in beforeEach
       ├─ Tests reference T1 persistent fixtures (read-only: seed job slug, contract ID)
       └─ afterEach or afterAll cleans up created resources via DELETE API calls
```

---

## 9. Sensitive Data Rules

| Data Type | Rule |
|-----------|------|
| Phone numbers | Always use `+849########` format (no real Vietnamese numbers) |
| ID card numbers | Format `TEST-XXXX` — never real national IDs |
| Firebase UIDs | Prefix `staging_` or `test_` |
| S3 keys | All under `staging/` prefix — separate S3 bucket from production |
| Firebase project | Use dedicated `gada-vn-staging` Firebase project |
| Passwords | Stored only in GitHub Secrets — never in code or seed files |
| Seed metadata file | `.seed-meta.json` is gitignored (contains UUIDs, not secrets) |

---

## 10. Environment Variables for Tests

```bash
# apps/admin-laravel/.env.testing
APP_ENV=testing
DB_CONNECTION=pgsql
DB_DATABASE=gada_test
FIREBASE_USE_EMULATOR=true
FIREBASE_EMULATOR_HOST=localhost:9099
AWS_BUCKET=gada-test-bucket
AWS_USE_PATH_STYLE_ENDPOINT=true    # for LocalStack
AWS_ENDPOINT_URL=http://localhost:4566

# tests/e2e/.env.test (gitignored)
PLAYWRIGHT_BASE_URL=https://staging.gada.vn
STAGING_WORKER_PASSWORD=...
STAGING_MANAGER_PASSWORD=...
STAGING_ADMIN_PASSWORD=...
TEST_JOB_SLUG=sat-thep-test-20260401
```

---

## 11. LocalStack for S3 in CI

For integration tests that verify S3 uploads:

```yaml
# .github/workflows/integration-tests.yml (addition)
services:
  localstack:
    image: localstack/localstack:3.0
    ports: ['4566:4566']
    env:
      SERVICES: s3
      DEFAULT_REGION: ap-southeast-1
    options: >-
      --health-cmd "curl -s http://localhost:4566/_localstack/health | grep running"
      --health-interval 10s
      --health-retries 5
```

```bash
# Create test bucket before running tests
aws --endpoint-url=http://localhost:4566 s3 mb s3://gada-test-bucket
```

This ensures:
- `ContractService::uploadSignatureFromDataUrl()` can upload to S3 in CI
- `s3PresignedUrl()` returns valid URLs
- No actual AWS charges during testing
