# Future Roadmap — GADA VN

**Version**: 0.1
**Status**: Draft
**Last updated**: 2026-03-20

---

## 1. Roadmap Philosophy

Each phase builds on confirmed learning from the previous phase. Nothing in Phase 2+ is scheduled until Phase 1 metrics are validated. Features are listed in priority order within each phase.

**MVP = Phase 1.** This document covers Phase 2 onward.

---

## 2. Phase 1: MVP (Current)

**Goal**: Complete one hire-to-attendance loop end-to-end in production.

**Exit criteria** (all must be met before Phase 2 work begins):
- 50 completed hire cycles (application → contract signed → attendance recorded)
- Manager approval median review time < 24h
- Public job pages indexed by Google (GSC impressions > 0)
- No P0 bugs open for > 48h

---

## 3. Phase 2: Trust & Quality

**Theme**: Make the platform reliable enough for workers to depend on it for income.

| # | Feature | Description | Depends on |
|---|---|---|---|
| 2-01 | Worker ID verification | Integrate third-party OCR/ID check API (e.g., VNPay ID or VeriKYC) to auto-verify ID documents | MVP ID upload (W-02) |
| 2-02 | Worker rating (by manager) | Manager rates worker 1–5 after contract completes; aggregate score shown on profile | Completed contracts in production |
| 2-03 | Manager rating (by worker) | Worker rates manager after contract; shown on public site page | Same |
| 2-04 | Review / dispute flow | Worker or manager can flag a rating as inappropriate; admin resolves | 2-02, 2-03 |
| 2-05 | Attendance history for worker | Worker sees own attendance log per job; download as PDF | MVP attendance (M-07) |
| 2-06 | Work summary / wage estimate | Show worker: days present × daily wage = estimated earnings per job | 2-05 |
| 2-07 | In-app messaging | Worker ↔ manager direct messages, scoped to an application | MVP applications |
| 2-08 | Contract amendment | Re-issue a contract with changed wage or dates; both parties re-sign | MVP contracts |
| 2-09 | Manager: bulk attendance import | CSV upload for attendance instead of manual row-by-row | MVP attendance |

---

## 4. Phase 3: Discovery & Scale

**Theme**: Grow supply (workers) and demand (managers/sites) through better discovery and self-serve tools.

| # | Feature | Description | Depends on |
|---|---|---|---|
| 3-01 | Job recommendation engine | Recommend jobs to worker based on trade, preferred provinces, past applications | 50+ workers with applications |
| 3-02 | Worker search (for managers) | Manager searches for workers by trade + province + availability; invite to apply | Phase 2 worker ratings |
| 3-03 | Worker availability calendar | Worker marks available/unavailable dates; shown to managers in worker search | 3-02 |
| 3-04 | Public company / manager profile | SEO-indexed page for each approved manager/company; lists their open jobs | 3-01 |
| 3-05 | Multi-site manager dashboard | Manager with multiple active sites sees aggregate view: headcount, attendance, open applications | 10+ managers with 2+ sites |
| 3-06 | Google login | Firebase GoogleAuthProvider; lower signup friction | — |
| 3-07 | Apple login | Firebase AppleAuthProvider; required for iOS App Store | iOS App Store submission |
| 3-08 | Worker resume / CV builder | Generate a downloadable PDF resume from profile + experience + ratings | Phase 2 ratings |
| 3-09 | Saved jobs | Worker bookmarks jobs to apply later | — |
| 3-10 | Job alerts (email + push) | Worker subscribes to new jobs matching trade + province; notified on new posting | 3-01 |

---

## 5. Phase 4: Financial Layer

**Theme**: Facilitate payment and generate platform revenue.

| # | Feature | Description | Depends on |
|---|---|---|---|
| 4-01 | Wage payment integration | Manager pays worker through platform via VNPay / Napas; platform holds escrow | Phase 3 scale; Vietnamese PSP license |
| 4-02 | Worker wage history | Full earnings history across all jobs; downloadable PDF | 4-01 |
| 4-03 | Invoice generation (manager) | Manager downloads invoice per job for accounting | 4-01 |
| 4-04 | Tax document export | Generate PIT (personal income tax) documents for workers earning above threshold | 4-01; Vietnamese tax API |
| 4-05 | Platform fee model | Percentage-based fee on successful hires; billing to manager | 4-01 |
| 4-06 | Worker advance payment | Early wage release via BNPL partner; deducted from final payment | 4-01; BNPL partner |

---

## 6. Phase 5: Platform Expansion

**Theme**: Expand geography and use cases beyond construction day labor.

| # | Feature | Description | Depends on |
|---|---|---|---|
| 5-01 | Korean language job listings | Expose GADA KR jobs to Vietnamese workers seeking Korean employment | API bridge with GADA KR |
| 5-02 | Long-term contract support | Support contracts > 30 days with monthly attendance summary | Phase 4 financials |
| 5-03 | Sub-contractor management | GC manager can add sub-contractor managers under a site; delegated attendance | Phase 3 multi-site |
| 5-04 | Equipment rental listings | Extend job model to equipment listings (cranes, scaffolding) | — |
| 5-05 | Training / certification module | Workers can record completed training certificates; managers can filter by cert | — |
| 5-06 | Thailand / Myanmar expansion | Clone locale config; new province reference data; local phone OTP | Phase 3 product maturity |

---

## 7. Technical Roadmap (Infrastructure & Platform)

| # | Item | Phase | Description |
|---|---|---|---|
| T-01 | Multi-AZ RDS | 2 | Promote RDS to Multi-AZ for failover; currently single-AZ |
| T-02 | Read replica | 3 | Add RDS read replica; route GET queries to replica |
| T-03 | CDN for API responses | 3 | Cache public job/site list API responses at CloudFront edge |
| T-04 | WebSocket support | 3 | Add for in-app messaging real-time delivery (Phase 2 messaging feature) |
| T-05 | Full-text search | 3 | PostgreSQL `tsvector` or Elasticsearch for job/worker search |
| T-06 | Observability stack | 2 | Datadog or AWS CloudWatch dashboards; error rate + p95 latency alerts |
| T-07 | Load testing | 2 | k6 load test: 500 concurrent job list requests; tune before Phase 3 growth |
| T-08 | GDPR / data export | 2 | User data export endpoint (ZIP: profile, contracts, attendance, notifications) |
| T-09 | Native Capacitor plugins | 3 | Camera (ID capture), GPS (site check-in), biometric auth |
| T-10 | Admin panel rebuild (Inertia.js) | 3 | Replace Blade admin with Laravel Inertia + React for better UX |

---

## 8. Deferred Feature Detail Notes

### 8.1 In-App Messaging (2-07)
- Scope: one thread per application (not general DM).
- Requires: WebSocket or long-poll; Laravel Echo + Pusher (or self-hosted Soketi on ECS).
- DB table: `ops.messages (id, application_id, sender_user_id, body, sent_at, read_at)`.
- Not in MVP because: no confirmed user demand; adds real-time infrastructure complexity.

### 8.2 Wage Payment (4-01)
- Requires: Vietnamese PSP license or partner (VNPay, Momo, or Napas).
- Escrow model: manager deposits per-job budget; platform releases on attendance confirmation.
- Regulatory consideration: platform may need Vietnamese fintech license for escrow.
- Not in MVP because: legal + integration complexity too high; manual payment acceptable at MVP scale.

### 8.3 Job Recommendation Engine (3-01)
- Minimum data needed: 200+ workers with ≥1 completed application.
- Initial version: rule-based (match trade + preferred province + date overlap) — no ML.
- ML version: collaborative filtering once 1,000+ application events exist.

### 8.4 Korean Job Listings (5-01)
- Requires: API contract negotiation with GADA KR team.
- Vietnamese workers applying for Korean jobs need separate visa/work permit flow.
- Out of scope until GADA VN has proven PMF in Vietnamese market.

---

## 9. Metrics by Phase

| Phase | Key metric | Target |
|---|---|---|
| 1 (MVP) | Completed hire cycles | 50 |
| 1 (MVP) | Manager approval time (median) | < 24h |
| 2 | Worker retention (2+ jobs via platform) | 40% of workers |
| 2 | Contract signing rate | > 90% of accepted applications |
| 3 | Monthly active workers | 500 |
| 3 | Monthly active managers | 50 |
| 3 | Job fill rate | > 70% of posted jobs reach headcount |
| 4 | Payments processed | 1,000 VND transactions/month |
| 4 | Platform GMV | TBD based on Phase 3 wage data |
