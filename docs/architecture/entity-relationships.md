# Entity Relationships — GADA VN

**Version**: 0.1
**Last updated**: 2026-03-21

---

## 1. Full ER Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  ref schema                                                                                  │
│                                                                                              │
│  ┌──────────────┐     ┌──────────────┐                                                      │
│  │  provinces   │     │    trades    │                                                      │
│  │──────────────│     │──────────────│                                                      │
│  │ id (PK)      │     │ id (PK)      │                                                      │
│  │ code         │     │ code         │                                                      │
│  │ name_ko      │     │ name_ko      │                                                      │
│  │ name_vi      │     │ name_vi      │                                                      │
│  │ name_en      │     │ name_en      │                                                      │
│  └──────┬───────┘     └──────┬───────┘                                                      │
└─────────┼────────────────────┼──────────────────────────────────────────────────────────────┘
          │                    │
          │      ┌─────────────┼─────────────────────────────────────┐
          │      │             │                                     │
┌─────────┼──────┼─────────────┼─────────────────────────────────────┼───────────────────────┐
│  auth schema   │             │                                     │                       │
│          │      │             │                                     │                       │
│  ┌───────▼──────▼─────────────────────────────────┐                │                       │
│  │                    users                        │                │                       │
│  │─────────────────────────────────────────────────│                │                       │
│  │ id (PK)                                         │                │                       │
│  │ firebase_uid  ◄── source of truth for auth      │                │                       │
│  │ email                                           │                │                       │
│  │ phone                                           │                │                       │
│  │ name                                            │                │                       │
│  │ photo_key                                       │                │                       │
│  │ locale  ('ko'|'vi'|'en')                        │                │                       │
│  │ is_active                                       │                │                       │
│  │ deleted_at                                      │                │                       │
│  └──┬──────┬──────┬──────┬──────┬──────────────────┘                │                       │
│     │      │      │      │      │                                   │                       │
│     │      │  ┌───┘      │      └──────────────┐                   │                       │
│     │      │  │          │                     │                   │                       │
│  ┌──▼──┐ ┌─▼──▼──┐ ┌─────▼──────┐ ┌───────────▼──┐                │                       │
│  │user │ │identit│ │ signatures │ │bank_accounts │                │                       │
│  │roles│ │y_docs │ │────────────│ │──────────────│                │                       │
│  │─────│ │───────│ │id (PK)     │ │id (PK)       │                │                       │
│  │id   │ │id     │ │user_id(FK) │ │user_id (FK)  │                │                       │
│  │user_│ │user_id│ │image_key   │ │bank_code     │                │                       │
│  │id   │ │doc_   │ │is_current  │ │account_num   │                │                       │
│  │role │ │type   │ └────────────┘ │  _encrypted  │                │                       │
│  │stat │ │front_ │                │is_primary    │                │                       │
│  │us   │ │key    │                └──────────────┘                │                       │
│  └──┬──┘ │back_  │                                                 │                       │
│     │    │key    │                                                 │                       │
│     │    │status │                                                 │                       │
│     │    └───────┘                                                 │                       │
└─────┼──────────────────────────────────────────────────────────────┼───────────────────────┘
      │                                                              │
      │                                                              │
┌─────┼──────────────────────────────────────────────────────────────┼───────────────────────┐
│  app schema                                                        │                       │
│     │                                                              │                       │
│     ├──────────────────────────────────────────────────────────────┤                       │
│     │                           [worker role]                      │                       │
│     │                                                              │                       │
│  ┌──▼───────────────────┐   ┌──────────────────────┐              │                       │
│  │   worker_profiles    │   │  worker_experiences  │              │                       │
│  │──────────────────────│   │──────────────────────│              │                       │
│  │ id (PK)              │   │ id (PK)              │              │                       │
│  │ user_id (FK→users)   │──▶│ user_id (FK→users)   │              │                       │
│  │ date_of_birth        │   │ trade_id (FK→trades)─┼──────────────┘                       │
│  │ nationality          │   │ role                 │                                      │
│  │ current_province_id──┼───┘ site_name            │                                      │
│  │   (FK→provinces)     │   │ start_date           │                                      │
│  │ preferred_province_  │   │ end_date             │                                      │
│  │   ids (INT[])        │   │ is_current           │                                      │
│  │ primary_trade_id ────┼──────────────────────────┘                                      │
│  │   (FK→trades)        │                                                                  │
│  │ level  (1–5)         │                                                                  │
│  └──────────────────────┘                                                                  │
│                                                                                             │
│     │                            [manager role]                                            │
│     │                                                                                      │
│  ┌──▼──────────────────────┐                                                               │
│  │    manager_profiles     │                                                               │
│  │─────────────────────────│                                                               │
│  │ id (PK)                 │                                                               │
│  │ user_id (FK→users)      │                                                               │
│  │ business_name           │                                                               │
│  │ business_reg_number     │                                                               │
│  │ business_type           │                                                               │
│  │ representative_name     │                                                               │
│  │ business_doc_key        │                                                               │
│  │ approval_status         │──── pending|approved|rejected|revoked                        │
│  │ is_current              │                                                               │
│  └──────────┬──────────────┘                                                               │
│             │ 1                                                                             │
│             │                                                                               │
│          ┌──▼──────────────────────────────────────────┐                                   │
│          │                   sites                     │                                   │
│          │─────────────────────────────────────────────│                                   │
│          │ id (PK)                                     │                                   │
│          │ manager_user_id (FK→users)                  │                                   │
│          │ name / slug                                 │                                   │
│          │ province_id (FK→provinces)                  │                                   │
│          │ address                                     │                                   │
│          │ location  GEOMETRY(POINT)                   │                                   │
│          │ start_date / end_date                       │                                   │
│          │ status  draft|active|closed|archived        │                                   │
│          └──────────┬──────────────────────────────────┘                                   │
│                     │ 1                                                                     │
│          ┌──────────┼──────────────┐                                                       │
│          │ *        │              │ *                                                      │
│  ┌───────▼────────┐ │    ┌─────────▼──────────────────────────────────────────┐            │
│  │  site_images   │ │    │                         jobs                       │            │
│  │────────────────│ │    │────────────────────────────────────────────────────│            │
│  │ id (PK)        │ │    │ id (PK)                                            │            │
│  │ site_id (FK)   │ │    │ site_id (FK→sites)                                 │            │
│  │ image_key      │ │    │ title_ko / title_vi / title_en                     │            │
│  │ sort_order     │ │    │ trade_id (FK→trades)                               │            │
│  │ is_cover       │ │    │ headcount                                          │            │
│  └────────────────┘ │    │ wage_amount (NUMERIC VND)                          │            │
│                     │    │ wage_type  daily|hourly|monthly                    │            │
│                     │    │ start_date / end_date                              │            │
│                     │    │ work_start_time / work_end_time                    │            │
│                     │    │ status  draft|open|filled|closed                   │            │
│                     │    │ slug                                               │            │
│                     │    └─────┬──────────┬──────────┬─────────────┐          │            │
│                     │          │ *        │ *        │ *           │ *         │            │
│                     │  ┌───────▼──┐ ┌────▼─────┐ ┌──▼──────────┐ │           │            │
│                     │  │job_shifts│ │job_reqts │ │job_benefits │ │           │            │
│                     │  │──────────│ │──────────│ │─────────────│ │           │            │
│                     │  │id (PK)   │ │id (PK)   │ │id (PK)      │ │           │            │
│                     │  │job_id FK │ │job_id FK │ │job_id FK    │ │           │            │
│                     │  │shift_date│ │req_type  │ │benefit_type │ │           │            │
│                     │  │start/end │ │descr_ko  │ │descr_ko     │ │           │            │
│                     │  │  _time   │ │descr_vi  │ │descr_vi     │ │           │            │
│                     │  │headcount │ │is_mand.. │ │sort_order   │ │           │            │
│                     │  │status    │ └──────────┘ └─────────────┘ │           │            │
│                     │  └───────┬──┘                              │           │            │
│                     │          │                                  │ *         │            │
│                     │          │              ┌───────────────────▼────────┐  │            │
│                     │          │              │      job_applications      │  │            │
│                     │          │              │────────────────────────────│  │            │
│                     │          │              │ id (PK)                    │  │            │
│                     │          │              │ job_id (FK→jobs)           │  │            │
│                     │          │              │ worker_user_id (FK→users)  │  │            │
│                     │          │              │ status                     │  │            │
│                     │          │              │  pending|accepted|rejected │  │            │
│                     │          │              │  |withdrawn|expired        │  │            │
│                     │          │              │ applied_at                 │  │            │
│                     │          │              │ reviewed_by (FK→users)     │  │            │
│                     │          │              └────────────┬───────────────┘  │            │
│                     │          │                           │ 1:1              │            │
│                     │          │              ┌────────────▼───────────────┐  │            │
│                     │          │              │           hires             │  │            │
│                     │          │              │────────────────────────────│  │            │
│                     │          │              │ id (PK)                    │  │            │
│                     │          │              │ application_id (FK, UNIQUE)│  │            │
│                     │          │              │ job_id (FK→jobs)           │  │            │
│                     │          │              │ worker_user_id (FK→users)  │  │            │
│                     │          │              │ manager_user_id (FK→users) │  │            │
│                     │          │              │ status active|completed    │  │            │
│                     │          │              │   |cancelled|no_show       │  │            │
│                     │          │              │ daily_wage_vnd (snapshot)  │  │            │
│                     │          │              └──┬─────────────────────────┘  │            │
│                     │          │                 │                            │            │
│                     │    ┌─────┘         ┌───────┴────────┐                  │            │
│                     │    │ * (optional)  │ 1:1            │ 1:1             │            │
│                     │  ┌─▼──────────────▼──────────┐  ┌───▼────────────────┐ │            │
│                     │  │    attendance_records      │  │employment_contracts│ │            │
│                     │  │────────────────────────────│  │────────────────────│ │            │
│                     │  │ id (PK)                    │  │ id (PK)            │ │            │
│                     │  │ hire_id (FK→hires)         │  │ hire_id (FK,UNIQUE)│ │            │
│                     │  │ job_shift_id (FK, nullable)│  │ pdf_key            │ │            │
│                     │  │ attendance_date            │  │ signed_pdf_key     │ │            │
│                     │  │ status present|absent      │  │ worker_sig_id (FK) │ │            │
│                     │  │   |half_day|late|excused   │  │ manager_sig_id(FK) │ │            │
│                     │  │ hours_worked               │  │ worker_signed_at   │ │            │
│                     │  │ wage_amount (computed)     │  │ manager_signed_at  │ │            │
│                     │  │ recorded_by (FK→users)     │  │ status pending     │ │            │
│                     │  └────────────────────────────┘  │  |worker_signed    │ │            │
│                     │                                  │  |fully_signed     │ │            │
│                     │                                  │  |voided           │ │            │
│                     │                                  └────────────────────┘ │            │
└─────────────────────┼──────────────────────────────────────────────────────────────────────┘
                      │
┌─────────────────────┼──────────────────────────────────────────────────────────────────────┐
│  ops schema         │                                                                      │
│                     │                                                                      │
│  ┌──────────────────▼──┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐│
│  │    notifications    │  │   fcm_tokens     │  │ admin_approvals  │  │   audit_logs     ││
│  │─────────────────────│  │──────────────────│  │──────────────────│  │──────────────────││
│  │ id (PK)             │  │ id (PK)          │  │ id (PK)          │  │ id (PK)          ││
│  │ user_id (FK→users)  │  │ user_id(FK)      │  │ subject_type     │  │ actor_user_id FK ││
│  │ type                │  │ token            │  │ subject_id       │  │ actor_type       ││
│  │ title_ko/vi/en      │  │ platform         │  │ requester_user_id│  │ action           ││
│  │ body_ko/vi/en       │  │ is_active        │  │ status           │  │ resource_type    ││
│  │ payload (JSONB)     │  └──────────────────┘  │ reviewed_by FK   │  │ resource_id      ││
│  │ delivery_status     │                        │ review_note      │  │ old_values JSONB ││
│  │ read_at             │                        └──────────────────┘  │ new_values JSONB ││
│  └─────────────────────┘                                              └──────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Relationship Reference Table

| From | To | Type | FK column | Constraint |
|---|---|---|---|---|
| `auth.user_roles` | `auth.users` | N:1 | `user_id` | CASCADE DELETE |
| `auth.identity_documents` | `auth.users` | N:1 | `user_id` | CASCADE DELETE |
| `auth.signatures` | `auth.users` | N:1 | `user_id` | CASCADE DELETE |
| `auth.bank_accounts` | `auth.users` | N:1 | `user_id` | CASCADE DELETE |
| `app.worker_profiles` | `auth.users` | 1:1 | `user_id` (UNIQUE) | CASCADE DELETE |
| `app.worker_profiles` | `ref.provinces` | N:1 | `current_province_id` | SET NULL |
| `app.worker_profiles` | `ref.trades` | N:1 | `primary_trade_id` | SET NULL |
| `app.worker_experiences` | `auth.users` | N:1 | `user_id` | CASCADE DELETE |
| `app.worker_experiences` | `ref.trades` | N:1 | `trade_id` | SET NULL |
| `app.manager_profiles` | `auth.users` | N:1 | `user_id` | CASCADE DELETE |
| `app.sites` | `auth.users` | N:1 | `manager_user_id` | RESTRICT |
| `app.sites` | `ref.provinces` | N:1 | `province_id` | RESTRICT |
| `app.site_images` | `app.sites` | N:1 | `site_id` | CASCADE DELETE |
| `app.jobs` | `app.sites` | N:1 | `site_id` | CASCADE DELETE |
| `app.jobs` | `ref.trades` | N:1 | `trade_id` | RESTRICT |
| `app.job_shifts` | `app.jobs` | N:1 | `job_id` | CASCADE DELETE |
| `app.job_requirements` | `app.jobs` | N:1 | `job_id` | CASCADE DELETE |
| `app.job_benefits` | `app.jobs` | N:1 | `job_id` | CASCADE DELETE |
| `app.job_applications` | `app.jobs` | N:1 | `job_id` | CASCADE DELETE |
| `app.job_applications` | `auth.users` | N:1 | `worker_user_id` | CASCADE DELETE |
| `app.job_applications` | `auth.users` | N:1 | `reviewed_by` | SET NULL |
| `app.hires` | `app.job_applications` | 1:1 | `application_id` (UNIQUE) | RESTRICT |
| `app.hires` | `app.jobs` | N:1 | `job_id` | RESTRICT |
| `app.hires` | `auth.users` | N:1 | `worker_user_id` | RESTRICT |
| `app.hires` | `auth.users` | N:1 | `manager_user_id` | RESTRICT |
| `app.attendance_records` | `app.hires` | N:1 | `hire_id` | CASCADE DELETE |
| `app.attendance_records` | `app.job_shifts` | N:1 | `job_shift_id` (nullable) | SET NULL |
| `app.attendance_records` | `auth.users` | N:1 | `recorded_by` | RESTRICT |
| `app.employment_contracts` | `app.hires` | 1:1 | `hire_id` (UNIQUE) | RESTRICT |
| `app.employment_contracts` | `auth.signatures` | N:1 | `worker_signature_id` | SET NULL |
| `app.employment_contracts` | `auth.signatures` | N:1 | `manager_signature_id` | SET NULL |
| `ops.notifications` | `auth.users` | N:1 | `user_id` | CASCADE DELETE |
| `ops.fcm_tokens` | `auth.users` | N:1 | `user_id` | CASCADE DELETE |
| `ops.admin_approvals` | `auth.users` | N:1 | `requester_user_id` | RESTRICT |
| `ops.admin_approvals` | `auth.users` | N:1 | `reviewed_by` | SET NULL |
| `ops.audit_logs` | `auth.users` | N:1 | `actor_user_id` | SET NULL |

---

## 3. Core Domain Chains

The business logic of GADA VN runs through three sequential chains:

### Chain A — Hire Loop
```
users ─▶ job_applications ─▶ hires ─▶ attendance_records
                                  └──▶ employment_contracts
```

### Chain B — Job Posting Loop
```
users (manager) ─▶ sites ─▶ jobs ─▶ job_shifts
                                 ─▶ job_requirements
                                 ─▶ job_benefits
                                 ─▶ job_applications ─▶ [Chain A]
```

### Chain C — Worker Profile Loop
```
users ─▶ worker_profiles ─▶ (province, trade lookups from ref)
      ─▶ worker_experiences
      ─▶ identity_documents
      ─▶ signatures ────────────▶ employment_contracts.worker_signature_id
```

### Chain D — Approval Loop
```
users ─▶ manager_profiles ─▶ ops.admin_approvals ─▶ auth.user_roles (manager)
                                                  ─▶ ops.notifications
                                                  ─▶ ops.audit_logs
```

---

## 4. Key Cardinalities

| Relationship | Cardinality | Notes |
|---|---|---|
| user → worker_profile | 1:1 (mandatory) | Created on signup |
| user → manager_profile | 1:N | Only 1 `is_current=true` at a time; history kept |
| user → user_roles | 1:N | One row per role; max 3 rows (worker+manager+admin) |
| manager_profile → sites | 1:N | One manager may run many sites |
| site → jobs | 1:N | One site has many job postings |
| job → job_shifts | 1:N | One row per work day; may be absent (use job dates) |
| job → job_applications | 1:N | One per worker (unique constraint) |
| job_application → hire | 1:1 | Only `accepted` applications generate a hire |
| hire → attendance_records | 1:N | One row per calendar day |
| hire → employment_contract | 1:1 | One contract per hire |
| user (worker) → signatures | 1:N | Latest `is_current=true`; old ones preserved |
| user → identity_documents | 1:N | One per doc_type; re-upload creates new row |

---

## 5. Entities That Span Two Roles

`auth.users` is the only entity that spans both Worker and Manager roles. Every other entity belongs to one role domain.

```
                    auth.users
                       │
          ┌────────────┼────────────────┐
          │            │                │
   worker domain  manager domain   admin domain
   ─────────────  ───────────────  ────────────
   worker_profiles    sites           (no separate
   worker_experiences jobs              profile table)
   job_applications   job_shifts
   hires (as worker)  job_requirements
   attendance_records job_benefits
   employment_contracts hires (as manager)
   identity_documents  attendance_records
   signatures            (as recorder)
   bank_accounts       employment_contracts
                         (as issuer)
                       manager_profiles
```

A manager who also applies for jobs as a worker is represented as:
- `job_applications.worker_user_id = users.id`
- AND `hires.manager_user_id = users.id` (for jobs on their own sites)
These are independent relationships — no conflict.

---

## 6. Cascading Delete Rules

| Table deleted | What cascades |
|---|---|
| `auth.users` | `user_roles`, `identity_documents`, `signatures`, `bank_accounts`, `worker_profiles`, `worker_experiences`, `notifications`, `fcm_tokens` |
| `app.sites` | `site_images`, `jobs` → `job_shifts`, `job_requirements`, `job_benefits`, `job_applications` |
| `app.jobs` | `job_shifts`, `job_requirements`, `job_benefits`, `job_applications` |
| `app.hires` | `attendance_records` |

**RESTRICT** (block delete if child rows exist):
- `sites` blocked if `manager_user_id` user is deleted (use soft-delete on user)
- `hires` blocked if `job` or `users` deleted (business record must be preserved)
- `employment_contracts` blocked if hire deleted

---

## 7. Multilingual Field Pattern

All user-visible strings that vary by language follow this pattern:

```sql
-- Required: Korean (default locale)
-- Optional: Vietnamese and English
column_ko  TEXT NOT NULL,   -- never null; this is the fallback
column_vi  TEXT,
column_en  TEXT,
```

**Application-layer resolution** (Laravel):
```php
public function getLocalizedAttribute(string $field, string $locale): ?string
{
    return $this->{"{$field}_{$locale}"}
        ?? $this->{"{$field}_ko"}  // fallback to Korean
        ?? null;
}
```

Tables with multilingual columns:
- `ref.provinces` — `name_ko`, `name_vi`, `name_en`
- `ref.trades` — `name_ko`, `name_vi`, `name_en`
- `app.jobs` — `title_ko/vi/en`, `description_ko/vi/en`
- `app.job_shifts` — `notes_ko`, `notes_vi`
- `app.job_requirements` — `description_ko/vi/en`
- `app.job_benefits` — `description_ko/vi/en`
- `ops.notifications` — `title_ko/vi/en`, `body_ko/vi/en`

---

## 8. Denormalized Fields (Counters)

To avoid expensive COUNT queries on hot paths, two counters are maintained on `app.jobs`:

| Column | Updated by | Event |
|---|---|---|
| `jobs.applications_count` | Laravel Observer on `job_applications` | INSERT / status change |
| `jobs.accepted_count` | Laravel Observer on `job_applications` | status → `accepted` |

These are best-effort counters — authoritative counts still use `COUNT(*)` queries for accuracy.
