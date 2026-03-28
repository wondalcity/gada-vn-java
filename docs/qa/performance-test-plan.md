# Performance Test Plan — GADA VN

Vietnamese construction worker marketplace. Validates system capacity for peak morning traffic from Android mobile users on 4G/3G networks.

---

## Table of Contents

1. [Overview and Goals](#1-overview-and-goals)
2. [Performance SLOs](#2-performance-slos-service-level-objectives)
3. [Test Scenarios](#3-test-scenarios)
4. [k6 Test Script — Scenario 1](#4-k6-test-script--scenario-1-morning-rush)
5. [Infrastructure Metrics to Monitor](#5-infrastructure-metrics-to-monitor-during-tests)
6. [Web Vitals Targets](#6-web-vitals-targets-lighthouse-ci)
7. [Acceptance Criteria](#7-acceptance-criteria)

---

## 1. Overview and Goals

### Primary Goal

Validate that the GADA VN platform can handle Vietnamese construction worker peak traffic without degradation, and that the AWS infrastructure scales correctly to meet demand.

### Traffic Context

| Factor | Detail |
|---|---|
| Peak time | 06:00–07:00 Vietnam time (UTC+7) = 23:00–00:00 UTC |
| Why peak? | Construction workers check job listings before shift start; managers post attendance |
| Primary device | Android smartphone (low-mid range: 2–4 GB RAM) |
| Connection (majority) | 4G (~50 Mbps down, ~15 Mbps up, ~40ms RTT to Singapore) |
| Connection (minority) | 3G (~5 Mbps down, ~1 Mbps up, ~100ms RTT) |
| Geography | Hanoi (~30ms to Singapore), Ho Chi Minh City (~25ms to Singapore) |

### Test Tools

| Tool | Purpose |
|---|---|
| [k6](https://k6.io/) | Load testing — simulates concurrent users with scripted journeys |
| [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) | Web Vitals measurement on real page loads |
| [Artillery](https://www.artillery.io/) | API stress testing (alternative/complement to k6) |
| AWS CloudWatch | Infrastructure metrics during test runs |
| AWS X-Ray | Distributed tracing — identify bottlenecks |

### Scale Targets

| Phase | Concurrent Users | API req/s |
|---|---|---|
| MVP (now) | 500 | 50 |
| Phase 2 | 5,000 | 500 |
| Phase 3 | 20,000 | 2,000 |

Tests in this plan cover MVP targets with Phase 2 spike validation.

---

## 2. Performance SLOs (Service Level Objectives)

These are contractual thresholds. Any test run that violates a SLO threshold causes the CI/CD pipeline to fail.

| Metric | Target (passing) | Alert Threshold | Measured By |
|---|---|---|---|
| Job listing page LCP (4G mobile) | < 2.5s | > 3s | Lighthouse CI |
| Job detail page LCP (4G mobile) | < 2.5s | > 4s | Lighthouse CI |
| API p50 latency | < 150ms | > 300ms | k6 `http_req_duration` |
| API p95 latency | < 500ms | > 1,000ms | k6 `http_req_duration` |
| API p99 latency | < 1,000ms | > 2,000ms | k6 `http_req_duration` |
| Error rate (all requests) | < 0.1% | > 1% | k6 `http_req_failed` |
| Availability | 99.9% uptime | < 99.5% | CloudWatch ALB 5xx metric |
| Max concurrent users (MVP) | 500 without degradation | system degradation | Scenario 5 spike test |
| Throughput (MVP) | 50 req/s sustained | — | k6 `http_reqs` rate |

**Degradation definition:** p95 latency > 2× SLO target OR error rate > 1%.

---

## 3. Test Scenarios

### Scenario 1 — Morning Rush Simulation

Simulates the 06:00–07:00 Vietnam time peak: workers browsing job listings and submitting applications.

| Parameter | Value |
|---|---|
| Duration | 20 minutes |
| Peak concurrent users | 200 |
| Ramp | 0→200 in 5min, hold 200 for 10min, ramp down in 5min |
| User mix | 60% workers (browse + apply), 40% unauthenticated (browse only) |

User journey per virtual user:

1. `GET /ko/jobs` — job listing page (ISR, should be CloudFront cached)
2. `GET /ko/jobs/{slug}` — job detail page (SSR, cache miss likely)
3. `POST /api/v1/jobs/{jobId}/apply` — authenticated application submission
4. `GET /api/v1/worker/applications` — worker's own application list

Expected behavior:
- Job listing page served from CloudFront cache (> 80% cache hit rate)
- Apply endpoint hits DB (one write per request — not cacheable)
- 409 Conflict expected on duplicate apply (idempotent — treat as success)

### Scenario 2 — Manager Workflow

Simulates construction site managers using the platform during peak hours: reviewing applicants, posting attendance, accepting/rejecting applications.

| Parameter | Value |
|---|---|
| Duration | 10 minutes |
| Concurrent users | 50 |
| Profile | Authenticated managers only |

User journey:

1. `GET /api/v1/manager/sites` — paginated site list
2. `PUT /api/v1/manager/jobs/{jobId}/attendance` — bulk attendance write (heaviest DB operation)
3. `PATCH /api/v1/manager/applications/{id}/accept` — accept applicant (triggers hire + contract queue job)
4. `GET /api/v1/manager/jobs/{jobId}/applications` — applicant list with status

Watch for:
- DB write contention on attendance table (many managers writing simultaneously)
- Queue depth increase after application accepts (contract generation jobs)
- RDS connection count spike (Laravel creates connection per request)

### Scenario 3 — Auth Spike (OTP)

Simulates a burst of OTP login requests — common when a new job posting triggers a wave of new user registrations.

| Parameter | Value |
|---|---|
| Duration | 5 minutes |
| Peak concurrent OTP requests | 100 |
| Ramp | 0→100 in 1min, hold for 3min, ramp down in 1min |

Validates:

1. OTP rate limiting works: 5 OTPs per phone number per 15 minutes
   - Expected: HTTP 429 after 5th attempt from same phone
2. WAF rate limit activates: 100 req/5min per IP on `/api/v1/auth/otp/send`
   - Expected: WAF blocks at limit, logs spike in CloudWatch
3. Firebase Admin SDK handles burst without timeout
4. System returns to normal within 60s of spike

Pass criteria: rate limit 429 responses are returned correctly; no 500 errors during spike.

### Scenario 4 — Soak Test (Stability)

Long-running test at steady-state load to detect memory leaks, connection pool exhaustion, and gradual performance degradation.

| Parameter | Value |
|---|---|
| Duration | 2 hours |
| Concurrent users | 100 (steady, no ramp) |
| User mix | Mixed workers + managers |

Watch metrics every 15 minutes:

- ECS task memory: should be flat (not growing) — Laravel PHP-FPM reuses workers; Next.js Node.js should be stable
- RDS connection count: should be bounded by RDS Proxy pool size (max 100)
- Redis memory: should be bounded (eviction policy `allkeys-lru` kicks in at capacity)
- ECS task restart count: zero (no OOM kills)
- CloudWatch `/gada-vn/ecs/api` log errors: zero new error types after hour 1

Fail if: any ECS task memory increases by > 20% between first and last 15-minute window.

### Scenario 5 — Spike Test (Autoscaling Validation)

Validates that ECS autoscaling responds correctly to sudden load and that the system does not degrade during scale-out.

| Parameter | Value |
|---|---|
| Duration | 15 minutes |
| Pattern | 10 users (2min) → instant spike to 500 (5min hold) → back to 10 (2min) → spike to 500 again (5min) |
| Target | ECS autoscaling adds capacity in < 3 minutes |

Pass criteria:
- p95 latency stays < 1,000ms throughout the spike (2× SLO target — some grace during scale-out)
- Error rate stays < 1% throughout (ALB routes away from unhealthy tasks during scale-out)
- ECS task count increases within 3 minutes of spike start (visible in CloudWatch `DesiredTaskCount` metric)
- No tasks crash during scale-out (no `ECS_SERVICE_EVENTS` stop events)

---

## 4. k6 Test Script — Scenario 1 (Morning Rush)

Save as `tests/performance/morning-rush.js`.

```javascript
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter, Trend, Rate } from 'k6/metrics'

// Custom metrics for business-level tracking
const applySuccessRate = new Rate('apply_success_rate')
const jobDetailTrend = new Trend('job_detail_duration')
const applyTrend = new Trend('apply_duration')

export const options = {
  stages: [
    { duration: '5m', target: 200 },   // Ramp up to 200 concurrent users
    { duration: '10m', target: 200 },  // Hold peak load
    { duration: '5m', target: 0 },     // Ramp down
  ],
  thresholds: {
    // SLO thresholds — test fails if these are violated
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    apply_success_rate: ['rate>0.95'],   // 95% of applies succeed or return 409
  },
}

// Base URLs
const WEB_BASE = 'https://gada.vn'
const API_BASE = 'https://api.gada.vn/api/v1'

// Pre-generated Firebase ID tokens for test accounts (worker role)
// Generate with: node tests/performance/scripts/generate-tokens.js
const TOKENS = JSON.parse(open('./fixtures/test-tokens.json'))

// Sample job slugs for detail page testing
const JOB_SLUGS = [
  'xay-dung-ha-noi-001',
  'xay-dung-hcm-002',
  'tho-ho-ha-noi-003',
  'co-khi-binh-duong-004',
  'xay-dung-da-nang-005',
]

// Sample job UUIDs for apply testing (must match test data in DB)
const JOB_IDS = JSON.parse(open('./fixtures/test-job-ids.json'))

export default function () {
  const token = TOKENS[Math.floor(Math.random() * TOKENS.length)]
  const authHeaders = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  }

  // Step 1: Job listing page (public, ISR — should be CloudFront cached)
  const listing = http.get(`${WEB_BASE}/ko/jobs`, {
    tags: { name: 'job_listing' },
  })
  check(listing, {
    'listing status 200': (r) => r.status === 200,
    'listing has job results': (r) => r.body.includes('jobs') || r.body.includes('việc làm'),
  })

  sleep(1)

  // Step 2: Job detail page (SSR — not cached for dynamic content)
  const slug = JOB_SLUGS[Math.floor(Math.random() * JOB_SLUGS.length)]
  const detail = http.get(`${WEB_BASE}/ko/jobs/${slug}`, {
    tags: { name: 'job_detail' },
  })
  jobDetailTrend.add(detail.timings.duration)
  check(detail, {
    'detail status 200': (r) => r.status === 200,
    'detail load time < 3s': (r) => r.timings.duration < 3000,
  })

  sleep(1)

  // Step 3: Submit application (authenticated)
  const jobId = JOB_IDS[Math.floor(Math.random() * JOB_IDS.length)]
  const apply = http.post(
    `${API_BASE}/jobs/${jobId}/apply`,
    null,
    { ...authHeaders, tags: { name: 'job_apply' } }
  )
  applyTrend.add(apply.timings.duration)

  // 200 = success, 409 = already applied (idempotent — both are acceptable)
  const applyOk = apply.status === 200 || apply.status === 409
  applySuccessRate.add(applyOk)
  check(apply, {
    'apply 200 or 409': () => applyOk,
    'apply not 500': (r) => r.status < 500,
  })

  sleep(1)

  // Step 4: Fetch own application list (authenticated)
  const myApps = http.get(`${API_BASE}/worker/applications`, {
    ...authHeaders,
    tags: { name: 'worker_applications' },
  })
  check(myApps, {
    'applications status 200': (r) => r.status === 200,
  })

  sleep(2)
}

// Setup: called once before test starts
export function setup() {
  console.log(`Starting morning rush test against ${WEB_BASE}`)
  console.log(`Using ${TOKENS.length} test accounts, ${JOB_IDS.length} test jobs`)
}

// Teardown: called once after test completes
export function teardown(data) {
  console.log('Morning rush test complete')
}
```

### Running the Test

```bash
# Install k6
brew install k6   # macOS
# or download from https://k6.io/docs/getting-started/installation/

# Generate test tokens first
node tests/performance/scripts/generate-tokens.js

# Run scenario 1
k6 run tests/performance/morning-rush.js

# Run with CloudWatch output (recommended for production-like testing)
k6 run \
  --out cloudwatch \
  tests/performance/morning-rush.js

# Run with HTML report
k6 run \
  --out json=results/morning-rush-$(date +%Y%m%d).json \
  tests/performance/morning-rush.js
k6 reporter --format html results/morning-rush-$(date +%Y%m%d).json
```

### Test Fixtures

`tests/performance/fixtures/test-tokens.json` — array of valid Firebase ID tokens for test worker accounts. Tokens expire every hour; refresh before test runs:

```bash
node tests/performance/scripts/refresh-tokens.js
```

`tests/performance/fixtures/test-job-ids.json` — array of active job UUIDs in the test environment. Seeded by `php artisan db:seed --class=PerformanceTestSeeder`.

---

## 5. Infrastructure Metrics to Monitor During Tests

### CloudWatch Metrics to Watch in Real-Time

Open the `gada-vn-production` CloudWatch dashboard during all test runs.

**ECS Metrics:**

| Metric | Namespace | Normal | Alarm |
|---|---|---|---|
| `CPUUtilization` (api service) | AWS/ECS | < 60% | > 85% |
| `MemoryUtilization` (api service) | AWS/ECS | < 70% | > 85% |
| `DesiredTaskCount` (api service) | — | 2 at idle | should increase during spike |
| `RunningTaskCount` | — | = DesiredTaskCount | if lower → tasks crashing |

**ALB Metrics:**

| Metric | Namespace | Normal | Alarm |
|---|---|---|---|
| `TargetResponseTime` (p95) | AWS/ApplicationELB | < 500ms | > 1,000ms |
| `RequestCount` | AWS/ApplicationELB | varies | — |
| `HTTPCode_Target_5XX_Count` | AWS/ApplicationELB | 0 | > 5/min |
| `HealthyHostCount` | AWS/ApplicationELB | = RunningTaskCount | if lower → health check fails |
| `UnHealthyHostCount` | AWS/ApplicationELB | 0 | > 0 |

**RDS Metrics:**

| Metric | Namespace | Normal | Alarm |
|---|---|---|---|
| `CPUUtilization` | AWS/RDS | < 40% | > 80% |
| `DatabaseConnections` | AWS/RDS | < 50 at idle | > 150 (75% of max) |
| `ReadIOPS` / `WriteIOPS` | AWS/RDS | varies | — |
| `ReadLatency` / `WriteLatency` | AWS/RDS | < 5ms | > 20ms |
| `FreeStorageSpace` | AWS/RDS | > 80 GB | < 20 GB |

**ElastiCache (Redis) Metrics:**

| Metric | Namespace | Target | Alarm |
|---|---|---|---|
| `CacheHitRate` | AWS/ElastiCache | > 90% | < 80% |
| `CurrConnections` | AWS/ElastiCache | < 50 | > 200 |
| `FreeableMemory` | AWS/ElastiCache | > 200 MB | < 100 MB |
| `ReplicationLag` | AWS/ElastiCache | < 1s | > 5s |

**CloudFront Metrics:**

| Metric | Namespace | Target | Alarm |
|---|---|---|---|
| `CacheHitRate` | AWS/CloudFront | > 80% (job listing) | < 60% |
| `Requests` | AWS/CloudFront | — | — |
| `4xxErrorRate` | AWS/CloudFront | < 1% | > 5% |
| `5xxErrorRate` | AWS/CloudFront | < 0.1% | > 1% |
| `BytesDownloaded` | AWS/CloudFront | varies | — |

### X-Ray Analysis Post-Test

After each test run, review X-Ray service map for:

1. Slow traces (> 500ms) — identify which segment is slow (DB query? Redis miss? S3?)
2. Throttling traces — identify if any downstream service is rate-limiting
3. Error traces — group by error type and trace root cause

```bash
# Get X-Ray groups and filter by slow traces
aws xray get-service-graph \
  --start-time $(date -u -v-30M +%s) \
  --end-time $(date -u +%s)
```

---

## 6. Web Vitals Targets (Lighthouse CI)

Web Vitals are measured from a simulated mobile device (Moto G4 class) on throttled 4G connection.

### Targets

| Metric | Target | Measured On |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | `/ko/jobs`, `/ko/jobs/{slug}` |
| FID (First Input Delay) | < 100ms | Job listing page (filter interaction) |
| CLS (Cumulative Layout Shift) | < 0.1 | All pages |
| TTFB (Time to First Byte) | < 600ms | SSR pages (measures SSR performance) |
| FCP (First Contentful Paint) | < 1.8s | All pages |
| TBT (Total Blocking Time) | < 300ms | All pages |
| Performance Score | > 80 | All pages |

### Lighthouse CI Configuration

`lighthouserc.js` in project root:

```javascript
module.exports = {
  ci: {
    collect: {
      url: [
        'https://gada.vn/ko/jobs',
        'https://gada.vn/ko/jobs/xay-dung-ha-noi-001',
        'https://gada.vn/ko',
      ],
      numberOfRuns: 3,
      settings: {
        throttlingMethod: 'simulate',
        throttling: {
          rttMs: 40,           // 4G RTT to Singapore from Vietnam
          throughputKbps: 25000, // 4G downlink
          cpuSlowdownMultiplier: 4, // mid-range Android CPU
        },
        emulatedFormFactor: 'mobile',
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 412,
          height: 823,
          deviceScaleFactor: 2.625,
        },
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'interactive': ['warn', { maxNumericValue: 3500 }],
      },
    },
    upload: {
      target: 'lhci',
      serverBaseUrl: 'https://lhci.internal.gada.vn',
    },
  },
}
```

### Running Lighthouse CI

```bash
# Install
npm install -g @lhci/cli

# Run against production (use after deployment)
lhci autorun

# Run against staging
LHCI_BUILD_CONTEXT__CURRENT_BRANCH=staging \
lhci autorun --collect.url=https://staging.gada.vn/ko/jobs
```

Lighthouse CI runs in the GitHub Actions `post-deploy.yml` workflow after every production deployment.

---

## 7. Acceptance Criteria

All criteria must be met before production launch. Mark each as passed during pre-launch testing.

### Load Test Acceptance Criteria

- [ ] **Scenario 1 (Morning Rush):** k6 thresholds all green — p95 < 500ms, p99 < 1,000ms, error rate < 1%
- [ ] **Scenario 2 (Manager Workflow):** No 5xx errors during 50-user manager soak; DB connection count stays < 150
- [ ] **Scenario 3 (OTP Spike):** Rate limiting returns 429 correctly; no 500 errors during OTP burst
- [ ] **Scenario 4 (Soak Test):** ECS task memory flat over 2 hours; no OOM kills; no new error types after hour 1
- [ ] **Scenario 5 (Spike Test):** ECS autoscaling triggers within 3 minutes; p95 < 1,000ms throughout 500-user spike

### Infrastructure Acceptance Criteria

- [ ] CloudFront cache hit rate > 80% for `/ko/jobs` listing page during Scenario 1
- [ ] RDS connection count never exceeds 150 during any test scenario
- [ ] Redis cache hit rate > 90% for job listing keys after warmup
- [ ] ECS HealthyHostCount always equals RunningTaskCount (no task health check failures)
- [ ] Zero `UnHealthyHostCount` events during steady-state tests

### Web Vitals Acceptance Criteria

- [ ] LCP < 2.5s for `/ko/jobs` (Lighthouse CI, throttled 4G, 3 runs average)
- [ ] LCP < 2.5s for `/ko/jobs/{slug}` (Lighthouse CI, throttled 4G, 3 runs average)
- [ ] CLS < 0.1 on all tested pages
- [ ] Performance score > 80 on all tested pages
- [ ] TTFB < 600ms for SSR pages

### Regression Gate (Pre-Production Deploy)

The `post-deploy.yml` GitHub Actions workflow runs Lighthouse CI and a short k6 smoke test (30-second, 10-user run of Scenario 1) after every production deployment. If any threshold is violated, a PagerDuty P2 alert fires automatically and the on-call engineer investigates before the next deploy.

---

## Appendix: Test Data Setup

Before running tests, seed test data:

```bash
# In staging environment
php artisan db:seed --class=PerformanceTestSeeder

# Generates:
# - 100 test worker accounts with Firebase tokens
# - 10 test manager accounts
# - 5 test construction sites
# - 20 active job listings with known slugs
# - Pre-populated worker applications (for conflict testing)
```

Test accounts use phone numbers in the range `+84900000001` to `+84900000200`. These numbers are blocked from sending real Firebase SMS via Firebase App Check allowlist.
