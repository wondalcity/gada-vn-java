/**
 * k6 Load Test — GADA VN API
 *
 * Target: 500 concurrent users, p95 latency < 200ms
 *
 * Run:
 *   k6 run --env API_BASE=https://api.staging.gada.vn tests/load/api-load-test.js
 *
 * Or against localhost:
 *   k6 run --env API_BASE=http://localhost:3001 tests/load/api-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const API_BASE = __ENV.API_BASE || 'http://localhost:3001';

// Custom metrics
const errorRate = new Rate('error_rate');
const jobListLatency = new Trend('job_list_latency', true);
const jobDetailLatency = new Trend('job_detail_latency', true);
const healthLatency = new Trend('health_latency', true);

export const options = {
  scenarios: {
    // Ramp up to 500 VUs over 2 minutes, sustain for 5 min, ramp down
    peak_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '2m', target: 300 },
        { duration: '2m', target: 500 },
        { duration: '5m', target: 500 }, // sustain
        { duration: '2m', target: 0 },   // ramp down
      ],
    },
  },
  thresholds: {
    // p95 API latency < 200ms
    http_req_duration: ['p(95)<200'],
    // Error rate < 1%
    error_rate: ['rate<0.01'],
    // Job list p95 < 200ms
    job_list_latency: ['p(95)<200'],
    // Job detail p95 < 150ms (cached)
    job_detail_latency: ['p(95)<150'],
  },
};

// Sample job IDs — replace with real IDs for staging
const SAMPLE_JOB_IDS = [
  'job-test-001',
  'job-test-002',
  'job-test-003',
];

const DATES = [
  '2026-04-01',
  '2026-04-02',
  '2026-04-03',
  '2026-04-07',
];

// VN geo coordinates (Ho Chi Minh City area)
const GEO_PARAMS = [
  { lat: 10.762622, lng: 106.660172 }, // HCMC center
  { lat: 10.823099, lng: 106.629664 }, // Tan Binh
  { lat: 10.727672, lng: 106.717498 }, // Thu Duc
];

export default function () {
  const scenario = Math.random();
  const geo = GEO_PARAMS[Math.floor(Math.random() * GEO_PARAMS.length)];

  if (scenario < 0.1) {
    // 10% — health check
    const res = http.get(`${API_BASE}/health`);
    const ok = check(res, { 'health ok': (r) => r.status === 200 });
    healthLatency.add(res.timings.duration);
    errorRate.add(!ok);

  } else if (scenario < 0.5) {
    // 40% — geo job list
    const res = http.get(
      `${API_BASE}/v1/jobs?lat=${geo.lat}&lng=${geo.lng}&radiusKm=20&limit=20`,
    );
    const ok = check(res, {
      'job list 200': (r) => r.status === 200,
      'has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data);
        } catch { return false; }
      },
    });
    jobListLatency.add(res.timings.duration);
    errorRate.add(!ok);

  } else if (scenario < 0.75) {
    // 25% — daily feed
    const date = DATES[Math.floor(Math.random() * DATES.length)];
    const res = http.get(`${API_BASE}/v1/jobs/date/${date}?limit=20`);
    const ok = check(res, { 'daily feed 200': (r) => r.status === 200 });
    jobListLatency.add(res.timings.duration);
    errorRate.add(!ok);

  } else {
    // 25% — job detail (cache hit after first request)
    const jobId = SAMPLE_JOB_IDS[Math.floor(Math.random() * SAMPLE_JOB_IDS.length)];
    const res = http.get(`${API_BASE}/v1/jobs/${jobId}`);
    const ok = check(res, { 'job detail 200 or 404': (r) => r.status === 200 || r.status === 404 });
    jobDetailLatency.add(res.timings.duration);
    errorRate.add(!ok);
  }

  sleep(Math.random() * 2 + 0.5); // Think time 0.5–2.5s
}
