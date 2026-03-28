# GADA VN — Automated Test Structure Proposal
**Date**: 2026-03-21
**Scope**: Directory layout, tooling selection, CI integration, coverage targets

---

## 1. Tooling Decisions

| Layer | Tool | Rationale |
|-------|------|-----------|
| Laravel API integration | **Pest PHP** | Native Laravel test runner, fluent API, fast parallel execution |
| Next.js web E2E | **Playwright** | Multi-browser, built-in auth state persistence, `page.evaluate` for JSON-LD |
| Mobile E2E | **Maestro** | YAML-based, works with Expo Go + production builds, CI-friendly |
| DB schema assertions | **psql scripts in CI** | Fast, no framework overhead |
| API contract snapshot | **Pest + custom JSON schema** | Snapshot `openapi.yaml` diff on PR |
| Accessibility | **axe-core via Playwright** | `@axe-core/playwright` plugin |

---

## 2. Repository Layout

```
gada-vn/
├── tests/
│   ├── integration/                     # Pest — Laravel API + DB
│   │   ├── Auth/
│   │   │   ├── AuthMiddlewareTest.php   # TC-INT-001 to 007
│   │   │   └── OtpFlowTest.php
│   │   ├── Worker/
│   │   │   ├── WorkerProfileTest.php    # TC-INT-010 to 012
│   │   │   └── WorkerApplicationTest.php # TC-INT-050 to 055
│   │   ├── Manager/
│   │   │   ├── ManagerRegistrationTest.php # TC-INT-020 to 023
│   │   │   ├── SiteTest.php            # TC-INT-030 to 033
│   │   │   ├── JobTest.php             # TC-INT-040 to 044
│   │   │   ├── HireTest.php            # TC-INT-060 to 065
│   │   │   └── AttendanceTest.php      # TC-INT-080 to 085
│   │   ├── Contract/
│   │   │   └── ContractStateMachineTest.php # TC-INT-070 to 079
│   │   ├── Public/
│   │   │   └── PublicApiTest.php       # TC-INT-090 to 093
│   │   ├── Db/
│   │   │   └── ConstraintTest.php      # TC-INT-100 to 109
│   │   └── Notify/
│   │       └── NotificationTest.php    # TC-INT-120 to 122
│   │
│   ├── e2e/                            # Playwright — web
│   │   ├── auth/
│   │   │   ├── signup.spec.ts          # TC-E2E-001 to 007
│   │   │   └── login.spec.ts
│   │   ├── manager/
│   │   │   ├── registration.spec.ts    # TC-E2E-010 to 013
│   │   │   ├── site-creation.spec.ts   # TC-E2E-020 to 024
│   │   │   ├── job-creation.spec.ts
│   │   │   └── hire-flow.spec.ts       # TC-E2E-040 to 044
│   │   ├── worker/
│   │   │   ├── apply.spec.ts           # TC-E2E-030 to 034
│   │   │   └── contract-sign.spec.ts   # TC-E2E-052 to 057
│   │   ├── contract/
│   │   │   └── full-flow.spec.ts       # TC-E2E-050 to 057
│   │   ├── attendance/
│   │   │   └── attendance.spec.ts      # TC-E2E-060 to 066
│   │   ├── seo/
│   │   │   └── public-pages.spec.ts    # TC-E2E-080 to 088
│   │   ├── admin/
│   │   │   └── admin-panel.spec.ts     # TC-E2E-090 to 091
│   │   ├── i18n/
│   │   │   └── language-switch.spec.ts # TC-E2E-070 to 073
│   │   ├── security/
│   │   │   └── rbac.spec.ts            # TC-E2E-100 to 102
│   │   ├── fixtures/
│   │   │   ├── auth.ts                 # storageState helpers
│   │   │   ├── worker.ts
│   │   │   └── manager.ts
│   │   └── playwright.config.ts
│   │
│   └── mobile/                         # Maestro — iOS + Android
│       ├── flows/
│       │   ├── worker-login.yaml       # TC-E2E-005
│       │   ├── worker-apply.yaml       # TC-E2E-034
│       │   └── worker-sign-contract.yaml # TC-E2E-056
│       └── maestro.config.yaml
│
├── apps/admin-laravel/
│   └── tests/                          # Pest lives here (Laravel convention)
│       ├── Pest.php                    # Pest bootstrap
│       ├── TestCase.php                # Base test case
│       ├── Feature/                    # Symlink or copy of tests/integration/
│       └── Unit/
│           ├── ContractServiceTest.php # Unit tests for pure PHP logic
│           └── SlugHelperTest.php
│
└── .github/
    └── workflows/
        ├── integration-tests.yml       # Pest on every push
        ├── e2e-tests.yml               # Playwright on PRs to main
        └── mobile-tests.yml            # Maestro on release branch
```

---

## 3. Laravel (Pest) Test Infrastructure

### 3.1 Base Test Setup

```php
// tests/TestCase.php
<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate', ['--path' => 'packages/db/migrations', '--realpath' => true]);
    }
}
```

### 3.2 Auth Token Factory

```php
// tests/Support/FirebaseTokenFactory.php
<?php

namespace Tests\Support;

use App\Models\User;

class FirebaseTokenFactory
{
    /**
     * Create a user in DB and return a test Bearer token.
     * In CI, Firebase Auth Emulator issues real tokens.
     * In local unit tests, the middleware is mocked.
     */
    public static function forRole(string $role): array
    {
        $user = User::factory()->withRole($role)->create();
        return [
            'user'  => $user,
            'token' => self::issueTestToken($user->firebase_uid),
        ];
    }

    private static function issueTestToken(string $uid): string
    {
        // Calls Firebase Auth Emulator REST API to create a custom token
        $response = Http::post(
            config('services.firebase.emulator_url') . '/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken',
            ['token' => app(\Kreait\Firebase\Auth::class)->createCustomToken($uid), 'returnSecureToken' => true]
        );
        return $response->json('idToken');
    }
}
```

### 3.3 Model Factories

```php
// database/factories/UserFactory.php
class UserFactory extends Factory
{
    public function withRole(string $role): static
    {
        return $this->state([
            'role'         => strtoupper($role),
            'status'       => 'ACTIVE',
            'firebase_uid' => 'test_' . fake()->uuid(),
            'phone'        => fake()->unique()->numerify('+849########'),
        ]);
    }

    public function suspended(): static
    {
        return $this->state(['status' => 'SUSPENDED']);
    }
}

// database/factories/JobFactory.php
class JobFactory extends Factory
{
    public function open(): static
    {
        return $this->state([
            'status'       => 'OPEN',
            'slots_total'  => 3,
            'slots_filled' => 0,
            'work_date'    => now()->addDays(7)->toDateString(),
            'daily_wage'   => 350000,
        ]);
    }

    public function filled(): static
    {
        return $this->state([
            'status'       => 'FILLED',
            'slots_total'  => 1,
            'slots_filled' => 1,
        ]);
    }
}

// database/factories/ContractFactory.php
class ContractFactory extends Factory
{
    public function pendingWorkerSign(): static
    {
        return $this->state(['status' => 'PENDING_WORKER_SIGN']);
    }

    public function pendingManagerSign(): static
    {
        return $this->state([
            'status'              => 'PENDING_MANAGER_SIGN',
            'worker_signed_at'    => now()->subMinutes(5),
            'worker_signature_s3_key' => 'contract-signatures/test/worker.svg',
        ]);
    }
}
```

### 3.4 S3 Mocking

```php
// tests/Support/FakeS3.php
// Use Laravel's Storage::fake('s3') for unit/integration tests
// For contract signing tests, assert fake disk contains uploaded file:
Storage::fake('s3');

$this->postJson('/api/v1/worker/contracts/' . $contract->id . '/sign', [
    'signature_data_url' => 'data:image/svg+xml;base64,PHN2Zy4uLg==',
]);

Storage::disk('s3')->assertExists('contract-signatures/' . $contract->id . '/worker.svg');
```

### 3.5 Example Pest Test

```php
// tests/integration/Contract/ContractStateMachineTest.php
<?php

use Tests\Support\FirebaseTokenFactory;
use App\Models\Contract;

it('advances contract from PENDING_WORKER_SIGN to PENDING_MANAGER_SIGN on worker sign', function () {
    Storage::fake('s3');

    ['user' => $workerUser, 'token' => $token] = FirebaseTokenFactory::forRole('worker');
    $contract = Contract::factory()->pendingWorkerSign()->create([
        'worker_id' => $workerUser->workerProfile->id,
    ]);

    $this->withToken($token)
         ->postJson('/api/v1/worker/contracts/' . $contract->id . '/sign', [
             'signature_data_url' => 'data:image/svg+xml;base64,PHN2Zy4uLg==',
         ])
         ->assertOk()
         ->assertJsonPath('data.status', 'PENDING_MANAGER_SIGN');

    expect($contract->fresh()->worker_signed_at)->not->toBeNull();
    Storage::disk('s3')->assertExists('contract-signatures/' . $contract->id . '/worker.svg');
});

it('blocks signing in wrong state', function () {
    ['user' => $workerUser, 'token' => $token] = FirebaseTokenFactory::forRole('worker');
    $contract = Contract::factory()->pendingManagerSign()->create([
        'worker_id' => $workerUser->workerProfile->id,
    ]);

    $this->withToken($token)
         ->postJson('/api/v1/worker/contracts/' . $contract->id . '/sign', [
             'signature_data_url' => 'data:image/svg+xml;base64,PHN2Zy4uLg==',
         ])
         ->assertUnprocessable();
});
```

---

## 4. Playwright E2E Test Infrastructure

### 4.1 Config

```typescript
// tests/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,      // sequential for stateful flows
  workers: 2,
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://staging.gada.vn',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'setup',   testMatch: '**/global.setup.ts' },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-web',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
  ],

  reporter: [['html', { open: 'never' }], ['github']],
});
```

### 4.2 Auth State Fixtures

```typescript
// tests/e2e/fixtures/auth.ts
import { test as base, Page } from '@playwright/test';
import path from 'path';

// Pre-authenticated storage state files (generated by global.setup.ts)
export const AUTH_STATE = {
  worker:  path.join(__dirname, '.auth/worker.json'),
  manager: path.join(__dirname, '.auth/manager.json'),
  admin:   path.join(__dirname, '.auth/admin.json'),
};

// Custom fixture that provides pre-authenticated pages
export const test = base.extend<{
  workerPage: Page;
  managerPage: Page;
  adminPage: Page;
}>({
  workerPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: AUTH_STATE.worker });
    await use(await ctx.newPage());
    await ctx.close();
  },
  managerPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: AUTH_STATE.manager });
    await use(await ctx.newPage());
    await ctx.close();
  },
  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: AUTH_STATE.admin });
    await use(await ctx.newPage());
    await ctx.close();
  },
});
```

### 4.3 Global Setup (auth state generation)

```typescript
// tests/e2e/global.setup.ts
import { chromium, FullConfig } from '@playwright/test';
import { AUTH_STATE } from './fixtures/auth';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();

  for (const role of ['worker', 'manager', 'admin'] as const) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    // Log in using staging seed credentials
    await page.goto('/ko/login');
    await page.fill('[name=email]', `${role}@staging.gada.vn`);
    await page.fill('[name=password]', process.env[`STAGING_${role.toUpperCase()}_PASSWORD`]!);
    await page.click('[type=submit]');
    await page.waitForURL(/\/ko\/(worker|manager|admin)/);

    await ctx.storageState({ path: AUTH_STATE[role] });
    await ctx.close();
  }

  await browser.close();
}

export default globalSetup;
```

### 4.4 Example SEO Test

```typescript
// tests/e2e/seo/public-pages.spec.ts
import { test, expect } from '@playwright/test';

test('job detail has valid JSON-LD JobPosting', async ({ page }) => {
  const JOB_SLUG = process.env.TEST_JOB_SLUG || 'sat-thep-test-20260401';
  await page.goto(`/ko/jobs/${JOB_SLUG}`);

  const ldJsonEl = await page.$('script[type="application/ld+json"]');
  expect(ldJsonEl).not.toBeNull();

  const raw = await ldJsonEl!.textContent();
  const ld = JSON.parse(raw!);

  expect(ld['@type']).toBe('JobPosting');
  expect(ld.title).toBeTruthy();
  expect(ld.baseSalary?.value).toBeTypeOf('number');
  expect(ld.jobLocation?.address?.addressCountry).toBe('VN');
  expect(new Date(ld.datePosted).toString()).not.toBe('Invalid Date');
});

test('province page returns 200 with ItemList schema', async ({ page }) => {
  const res = await page.goto('/ko/locations/ho-chi-minh');
  expect(res!.status()).toBe(200);

  const ldJson = await page.$eval(
    'script[type="application/ld+json"]',
    (el) => JSON.parse(el.textContent || '{}')
  );
  expect(ldJson['@type']).toBe('ItemList');
});

test('hreflang tags present on job detail', async ({ page }) => {
  const JOB_SLUG = process.env.TEST_JOB_SLUG || 'sat-thep-test-20260401';
  await page.goto(`/ko/jobs/${JOB_SLUG}`);

  const hrefs = await page.$$eval(
    'link[rel="alternate"][hreflang]',
    (els) => els.map((el) => el.getAttribute('hreflang'))
  );
  expect(hrefs).toContain('ko');
  expect(hrefs).toContain('vi');
  expect(hrefs).toContain('en');
});
```

---

## 5. Maestro Mobile Test Structure

```yaml
# tests/mobile/flows/worker-sign-contract.yaml
appId: vn.gada.worker
---
- launchApp
- tapOn:
    text: "계약서"
- tapOn:
    index: 0   # first contract in list
- assertVisible:
    text: "서명하기"
- tapOn:
    text: "서명하기"
# Draw on signature canvas (swipe to simulate drawing)
- swipe:
    startX: 50
    startY: 50
    endX: 250
    endY: 130
    duration: 800
- tapOn:
    text: "확인"
- assertVisible:
    text: "서명 완료"
```

```yaml
# tests/mobile/flows/worker-apply.yaml
appId: vn.gada.worker
---
- launchApp
- tapOn:
    text: "일자리"
- tapOn:
    index: 0   # first job in list
- assertVisible:
    id: "job-detail-wage"
- tapOn:
    text: "지원하기"
- tapOn:
    text: "확인"
- assertVisible:
    text: "지원 완료"
```

---

## 6. CI/CD Integration

### 6.1 Integration Tests (every push)

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  pest:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env:
          POSTGRES_DB: gada_test
          POSTGRES_USER: gada
          POSTGRES_PASSWORD: gada
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-retries 5
      redis:
        image: redis:7
        ports: ['6379:6379']

    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          extensions: pdo_pgsql

      - name: Install dependencies
        run: cd apps/admin-laravel && composer install --no-interaction

      - name: Run migrations
        run: cd apps/admin-laravel && php artisan migrate --database=pgsql

      - name: Run Pest
        run: cd apps/admin-laravel && ./vendor/bin/pest --parallel --coverage --min=70
        env:
          DB_CONNECTION: pgsql
          DB_HOST: localhost
          DB_DATABASE: gada_test
          DB_USERNAME: gada
          DB_PASSWORD: gada
          FIREBASE_USE_EMULATOR: true
```

### 6.2 E2E Tests (PRs to main)

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  pull_request:
    branches: [main]

jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: '20' }

      - run: pnpm install
      - run: pnpm --filter web-next exec playwright install --with-deps chromium

      - name: Run Playwright smoke suite
        run: pnpm --filter web-next exec playwright test --grep "@smoke"
        env:
          PLAYWRIGHT_BASE_URL: ${{ secrets.STAGING_URL }}
          STAGING_WORKER_PASSWORD: ${{ secrets.STAGING_WORKER_PASSWORD }}
          STAGING_MANAGER_PASSWORD: ${{ secrets.STAGING_MANAGER_PASSWORD }}
          STAGING_ADMIN_PASSWORD: ${{ secrets.STAGING_ADMIN_PASSWORD }}
          TEST_JOB_SLUG: ${{ secrets.TEST_JOB_SLUG }}

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/web-next/playwright-report/
```

### 6.3 Coverage Targets

| Layer | Tool | Minimum Coverage Target |
|-------|------|------------------------|
| Laravel controllers | Pest | 80% line coverage |
| Laravel services | Pest | 90% line coverage |
| DB constraints | Pest + psql | 100% of constraints exercised |
| Web E2E smoke | Playwright | All P0 TCs pass |
| Mobile critical paths | Maestro | 3 flows: login, apply, sign |

---

## 7. Tag Strategy for Selective Runs

Tag tests to enable selective CI execution:

```typescript
// Playwright — tag examples
test('@smoke @auth worker phone signup', async ({ page }) => { ... });
test('@regression @manager site creation', async ({ page }) => { ... });
test('@seo job detail json-ld', async ({ page }) => { ... });
```

```php
// Pest — tag examples
it('advances contract state machine', function () { ... })->group('contract', 'smoke');
it('blocks duplicate application', function () { ... })->group('apply', 'smoke');
```

**Run commands:**
```bash
# Smoke only (CI on push)
./vendor/bin/pest --group=smoke

# Full regression (nightly)
./vendor/bin/pest

# SEO tests only
playwright test --grep "@seo"

# Contract tests only
playwright test --grep "@contract"
```
