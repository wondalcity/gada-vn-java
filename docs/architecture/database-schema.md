# Database Schema — GADA VN

**Engine**: PostgreSQL 16 + PostGIS 3.4
**Migration owner**: `apps/admin-laravel/database/migrations/`
**Last updated**: 2026-03-21

---

## Schema Layout

| Schema | Purpose | Tables |
|---|---|---|
| `auth` | Identity, credentials, documents | `users`, `user_roles`, `identity_documents`, `signatures`, `bank_accounts` |
| `app` | Core business domain | `worker_profiles`, `worker_experiences`, `manager_profiles`, `sites`, `site_images`, `jobs`, `job_shifts`, `job_requirements`, `job_benefits`, `job_applications`, `hires`, `attendance_records`, `employment_contracts` |
| `ref` | Read-only reference / taxonomy | `provinces`, `trades` |
| `ops` | Operational / platform | `notifications`, `fcm_tokens`, `admin_approvals`, `audit_logs` |

---

## Conventions

- **PK**: `UUID DEFAULT gen_random_uuid()` on all tables
- **Timestamps**: `TIMESTAMPTZ` stored UTC; display in `Asia/Ho_Chi_Minh`
- **Soft delete**: `deleted_at TIMESTAMPTZ NULL` — never hard-delete business rows
- **Money**: `NUMERIC(15,0)` — VND as integer, never FLOAT
- **Encrypted fields**: suffixed `_encrypted TEXT`; AES-256-GCM, key from `ENCRYPTION_KEY` env
- **S3 keys**: bare key stored (`uploads/id/abc123.jpg`); CloudFront URL computed at runtime
- **Multilingual text**: parallel `_ko`, `_vi`, `_en` columns on user-visible strings; `_ko` is never null
- **Geometry**: `GEOMETRY(POINT, 4326)` — WGS84 (longitude, latitude)
- **Status enums**: stored as `VARCHAR(50)` with a `CHECK` constraint; values listed per table

---

## Schema: `auth`

### `auth.users`

Central identity record. Created on first Firebase login.

```sql
CREATE TABLE auth.users (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid        VARCHAR(128)    NOT NULL,
    email               VARCHAR(255),
    phone               VARCHAR(25),
    name                VARCHAR(150)    NOT NULL,
    photo_key           VARCHAR(500),
    locale              VARCHAR(10)     NOT NULL DEFAULT 'ko',   -- 'ko' | 'vi' | 'en'
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    last_login_at       TIMESTAMPTZ,
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_users_firebase_uid UNIQUE (firebase_uid),
    CONSTRAINT uq_users_email        UNIQUE (email),
    CONSTRAINT uq_users_phone        UNIQUE (phone)
);

CREATE INDEX idx_users_firebase_uid ON auth.users (firebase_uid);
CREATE INDEX idx_users_email        ON auth.users (email);
CREATE INDEX idx_users_phone        ON auth.users (phone);
CREATE INDEX idx_users_deleted_at   ON auth.users (deleted_at) WHERE deleted_at IS NULL;
```

**Notes**:
- `email` and `phone` are both nullable because Facebook login may supply neither.
- `locale` drives the UI language shown to this user.
- Soft-deleted users: `is_active = FALSE`, `deleted_at = NOW()`. Firebase token rejected server-side.

---

### `auth.user_roles`

One row per user per role. Worker role is inserted on signup; Manager role is inserted on approval.

```sql
CREATE TABLE auth.user_roles (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    role            VARCHAR(50) NOT NULL,   -- 'worker' | 'manager' | 'admin'
    status          VARCHAR(50) NOT NULL DEFAULT 'active',
                                            -- 'active' | 'suspended'
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by      UUID        REFERENCES auth.users (id),  -- NULL = system-granted
    revoked_at      TIMESTAMPTZ,
    revoked_by      UUID        REFERENCES auth.users (id),

    CONSTRAINT uq_user_roles_user_role UNIQUE (user_id, role),
    CONSTRAINT chk_user_roles_role   CHECK (role   IN ('worker', 'manager', 'admin')),
    CONSTRAINT chk_user_roles_status CHECK (status IN ('active', 'suspended'))
);

CREATE INDEX idx_user_roles_user_id ON auth.user_roles (user_id);
CREATE INDEX idx_user_roles_role    ON auth.user_roles (role);
```

**Notes**:
- A user with `role = 'manager'` AND `status = 'active'` is a fully approved manager.
- Revoking manager: set `revoked_at`, `revoked_by`, then `status = 'suspended'` on this row.
- Do not delete role rows — revoke only. Deletion loses audit history.

---

### `auth.identity_documents`

Uploaded ID documents (national ID, citizen card, passport).

```sql
CREATE TABLE auth.identity_documents (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    doc_type        VARCHAR(50) NOT NULL DEFAULT 'national_id',
                                -- 'national_id' | 'passport' | 'citizen_card'
    front_key       VARCHAR(500),
    back_key        VARCHAR(500),
    id_number_encrypted TEXT,   -- AES-256-GCM encrypted
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
                                -- 'pending' | 'verified' | 'rejected'
    verified_at     TIMESTAMPTZ,
    verified_by     UUID        REFERENCES auth.users (id),
    rejection_note  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_identity_doc_type   CHECK (doc_type IN ('national_id', 'passport', 'citizen_card')),
    CONSTRAINT chk_identity_doc_status CHECK (status   IN ('pending', 'verified', 'rejected'))
);

CREATE INDEX idx_identity_docs_user_id ON auth.identity_documents (user_id);
CREATE INDEX idx_identity_docs_status  ON auth.identity_documents (status);
```

---

### `auth.signatures`

Drawn signature images. A user may update their signature (new row, old marked non-current).

```sql
CREATE TABLE auth.signatures (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    image_key       VARCHAR(500) NOT NULL,  -- S3 key for PNG
    is_current      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signatures_user_id    ON auth.signatures (user_id);
CREATE INDEX idx_signatures_is_current ON auth.signatures (user_id, is_current) WHERE is_current = TRUE;
```

**Notes**: When a user draws a new signature, set `is_current = FALSE` on all prior rows, then insert new row.

---

### `auth.bank_accounts`

Used post-MVP for wage disbursement.

```sql
CREATE TABLE auth.bank_accounts (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    bank_code               VARCHAR(20) NOT NULL,   -- e.g., 'VCB', 'TCB', 'ACB'
    bank_name               VARCHAR(150) NOT NULL,
    account_number_encrypted TEXT       NOT NULL,   -- AES-256-GCM encrypted
    account_holder          VARCHAR(150) NOT NULL,
    is_primary              BOOLEAN     NOT NULL DEFAULT FALSE,
    verified_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bank_accounts_user_id ON auth.bank_accounts (user_id);
```

---

## Schema: `app`

### `app.worker_profiles`

One row per user (created on signup with defaults).

```sql
CREATE TABLE app.worker_profiles (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID        NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
    date_of_birth           DATE,
    gender                  VARCHAR(20),            -- 'male' | 'female' | 'other'
    nationality             VARCHAR(100),
    current_province_id     INT         REFERENCES ref.provinces (id),
    preferred_province_ids  INT[]       NOT NULL DEFAULT '{}',
    primary_trade_id        INT         REFERENCES ref.trades (id),
    secondary_trade_ids     INT[]       NOT NULL DEFAULT '{}',
    years_of_experience     SMALLINT    NOT NULL DEFAULT 0,
    level                   SMALLINT    NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
    emergency_contact_name  VARCHAR(150),
    emergency_contact_phone VARCHAR(25),
    bio                     TEXT,
    profile_completed_at    TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_worker_profiles_user_id          ON app.worker_profiles (user_id);
CREATE INDEX idx_worker_profiles_province_id      ON app.worker_profiles (current_province_id);
CREATE INDEX idx_worker_profiles_primary_trade_id ON app.worker_profiles (primary_trade_id);
```

---

### `app.worker_experiences`

Past job experience entries — multiple per worker.

```sql
CREATE TABLE app.worker_experiences (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    trade_id        INT         REFERENCES ref.trades (id),
    role            VARCHAR(150),
    site_name       VARCHAR(250),
    company_name    VARCHAR(250),
    start_date      DATE        NOT NULL,
    end_date        DATE,
    is_current      BOOLEAN     NOT NULL DEFAULT FALSE,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_worker_experiences_user_id ON app.worker_experiences (user_id);
```

---

### `app.manager_profiles`

Business registration submitted by a user seeking manager role.
One active profile per user; rejected profiles are archived, not deleted.

```sql
CREATE TABLE app.manager_profiles (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    business_name               VARCHAR(250) NOT NULL,
    business_registration_number VARCHAR(100),
    business_type               VARCHAR(50) NOT NULL DEFAULT 'individual',
                                            -- 'individual' | 'corporation'
    representative_name         VARCHAR(150) NOT NULL,
    representative_phone        VARCHAR(25),
    business_address            TEXT,
    business_doc_key            VARCHAR(500),       -- S3 key for registration document
    approval_status             VARCHAR(50) NOT NULL DEFAULT 'pending',
                                            -- 'pending' | 'approved' | 'rejected' | 'revoked'
    is_current                  BOOLEAN     NOT NULL DEFAULT TRUE,
    submitted_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at                 TIMESTAMPTZ,
    reviewed_by                 UUID        REFERENCES auth.users (id),
    rejection_reason            TEXT,
    approved_at                 TIMESTAMPTZ,
    revoked_at                  TIMESTAMPTZ,
    revoked_by                  UUID        REFERENCES auth.users (id),
    revocation_reason           TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_manager_approval_status CHECK (
        approval_status IN ('pending', 'approved', 'rejected', 'revoked')
    )
);

-- Only one pending/approved profile per user at a time
CREATE UNIQUE INDEX uq_manager_profiles_active
    ON app.manager_profiles (user_id)
    WHERE is_current = TRUE;

CREATE INDEX idx_manager_profiles_user_id         ON app.manager_profiles (user_id);
CREATE INDEX idx_manager_profiles_approval_status ON app.manager_profiles (approval_status);
```

---

### `app.sites`

A physical construction project/worksite. One manager may own many sites.

```sql
CREATE TABLE app.sites (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_user_id     UUID        NOT NULL REFERENCES auth.users (id),
    name                VARCHAR(250) NOT NULL,
    slug                VARCHAR(300) NOT NULL,
    description         TEXT,
    province_id         INT         NOT NULL REFERENCES ref.provinces (id),
    address             TEXT,
    location            GEOMETRY(POINT, 4326),  -- PostGIS POINT (lng, lat)
    start_date          DATE,
    end_date            DATE,
    status              VARCHAR(50) NOT NULL DEFAULT 'active',
                                    -- 'draft' | 'active' | 'closed' | 'archived'
    total_workers_needed INT        NOT NULL DEFAULT 0,
    deleted_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_sites_slug   UNIQUE (slug),
    CONSTRAINT chk_sites_status CHECK (status IN ('draft', 'active', 'closed', 'archived'))
);

CREATE INDEX idx_sites_manager_user_id ON app.sites (manager_user_id);
CREATE INDEX idx_sites_province_id     ON app.sites (province_id);
CREATE INDEX idx_sites_status          ON app.sites (status);
CREATE INDEX idx_sites_deleted_at      ON app.sites (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_sites_location        ON app.sites USING GIST (location);
```

---

### `app.site_images`

Gallery images attached to a site.

```sql
CREATE TABLE app.site_images (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id     UUID        NOT NULL REFERENCES app.sites (id) ON DELETE CASCADE,
    image_key   VARCHAR(500) NOT NULL,
    alt_text_ko VARCHAR(250),
    alt_text_vi VARCHAR(250),
    alt_text_en VARCHAR(250),
    sort_order  SMALLINT    NOT NULL DEFAULT 0,
    is_cover    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_site_images_site_id ON app.site_images (site_id);
```

---

### `app.jobs`

A job posting under a site. Represents a role/trade requirement for a period.
**Distinct from `job_shifts`**: a job is the posting; a shift is a specific daily occurrence within that job.

```sql
CREATE TABLE app.jobs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id         UUID        NOT NULL REFERENCES app.sites (id) ON DELETE CASCADE,

    -- Multilingual fields
    title_ko        VARCHAR(250) NOT NULL,
    title_vi        VARCHAR(250),
    title_en        VARCHAR(250),
    description_ko  TEXT,
    description_vi  TEXT,
    description_en  TEXT,

    trade_id        INT         NOT NULL REFERENCES ref.trades (id),
    headcount       SMALLINT    NOT NULL CHECK (headcount > 0),
    wage_amount     NUMERIC(15, 0) NOT NULL CHECK (wage_amount > 0),
    wage_type       VARCHAR(50) NOT NULL DEFAULT 'daily',
                                -- 'daily' | 'hourly' | 'monthly'
    start_date      DATE        NOT NULL,
    end_date        DATE        NOT NULL,
    work_start_time TIME,       -- typical daily start (e.g., 07:30)
    work_end_time   TIME,       -- typical daily end (e.g., 17:00)
    status          VARCHAR(50) NOT NULL DEFAULT 'open',
                                -- 'draft' | 'open' | 'filled' | 'closed'
    slug            VARCHAR(300) NOT NULL,

    -- Denormalized counters (updated via trigger or application layer)
    applications_count  INT     NOT NULL DEFAULT 0,
    accepted_count      INT     NOT NULL DEFAULT 0,

    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_jobs_slug   UNIQUE (slug),
    CONSTRAINT chk_jobs_status CHECK (status IN ('draft', 'open', 'filled', 'closed')),
    CONSTRAINT chk_jobs_dates  CHECK (end_date >= start_date)
);

CREATE INDEX idx_jobs_site_id    ON app.jobs (site_id);
CREATE INDEX idx_jobs_trade_id   ON app.jobs (trade_id);
CREATE INDEX idx_jobs_status     ON app.jobs (status);
CREATE INDEX idx_jobs_start_date ON app.jobs (start_date);
CREATE INDEX idx_jobs_deleted_at ON app.jobs (deleted_at) WHERE deleted_at IS NULL;

-- SEO public listing: open jobs sorted by start_date
CREATE INDEX idx_jobs_public_listing ON app.jobs (status, start_date)
    WHERE status = 'open' AND deleted_at IS NULL;
```

---

### `app.job_shifts`

A specific scheduled work day within a job. Created either explicitly by the manager or auto-generated from the job's date range.

**Concept**: `jobs` is the posting (what is needed, for how long, at what wage). `job_shifts` is the per-day schedule (which specific days, any variation in headcount or hours).

```sql
CREATE TABLE app.job_shifts (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID        NOT NULL REFERENCES app.jobs (id) ON DELETE CASCADE,
    shift_date      DATE        NOT NULL,
    start_time      TIME,
    end_time        TIME,
    headcount       SMALLINT,   -- NULL = inherit from job.headcount
    notes_ko        TEXT,
    notes_vi        TEXT,
    status          VARCHAR(50) NOT NULL DEFAULT 'scheduled',
                                -- 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_job_shifts_job_date UNIQUE (job_id, shift_date),
    CONSTRAINT chk_job_shifts_status  CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX idx_job_shifts_job_id     ON app.job_shifts (job_id);
CREATE INDEX idx_job_shifts_shift_date ON app.job_shifts (shift_date);
```

---

### `app.job_requirements`

Specific prerequisites for a job (certifications, physical requirements, tools).

```sql
CREATE TABLE app.job_requirements (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id              UUID        NOT NULL REFERENCES app.jobs (id) ON DELETE CASCADE,
    requirement_type    VARCHAR(50) NOT NULL DEFAULT 'general',
                                    -- 'certification' | 'tool' | 'experience' | 'physical' | 'language' | 'general'
    description_ko      TEXT        NOT NULL,
    description_vi      TEXT,
    description_en      TEXT,
    is_mandatory        BOOLEAN     NOT NULL DEFAULT TRUE,
    sort_order          SMALLINT    NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_requirements_job_id ON app.job_requirements (job_id);
```

---

### `app.job_benefits`

Perks and benefits offered by the job.

```sql
CREATE TABLE app.job_benefits (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID        NOT NULL REFERENCES app.jobs (id) ON DELETE CASCADE,
    benefit_type    VARCHAR(50) NOT NULL DEFAULT 'other',
                                -- 'meal' | 'transport' | 'accommodation' | 'insurance' | 'equipment' | 'bonus' | 'other'
    description_ko  TEXT        NOT NULL,
    description_vi  TEXT,
    description_en  TEXT,
    sort_order      SMALLINT    NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_benefits_job_id ON app.job_benefits (job_id);
```

---

### `app.job_applications`

A worker's application to a job. One application per worker per job enforced by unique constraint.

```sql
CREATE TABLE app.job_applications (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID        NOT NULL REFERENCES app.jobs (id) ON DELETE CASCADE,
    worker_user_id  UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
                                -- 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired'
    cover_note      TEXT,
    applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at     TIMESTAMPTZ,
    reviewed_by     UUID        REFERENCES auth.users (id),  -- manager who acted
    rejection_reason VARCHAR(250),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_job_applications_job_worker UNIQUE (job_id, worker_user_id),
    CONSTRAINT chk_job_applications_status    CHECK (
        status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'expired')
    )
);

CREATE INDEX idx_job_applications_job_id        ON app.job_applications (job_id);
CREATE INDEX idx_job_applications_worker_user_id ON app.job_applications (worker_user_id);
CREATE INDEX idx_job_applications_status         ON app.job_applications (status);
```

---

### `app.hires`

Created when an application is accepted. The source of truth for an active employment relationship.

```sql
CREATE TABLE app.hires (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id      UUID        NOT NULL UNIQUE REFERENCES app.job_applications (id),
    job_id              UUID        NOT NULL REFERENCES app.jobs (id),
    worker_user_id      UUID        NOT NULL REFERENCES auth.users (id),
    manager_user_id     UUID        NOT NULL REFERENCES auth.users (id),
    status              VARCHAR(50) NOT NULL DEFAULT 'active',
                                    -- 'active' | 'completed' | 'cancelled' | 'no_show'
    daily_wage_vnd      NUMERIC(15, 0) NOT NULL,  -- snapshot at hire time
    hired_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at        TIMESTAMPTZ,
    cancellation_reason TEXT,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_hires_status CHECK (status IN ('active', 'completed', 'cancelled', 'no_show'))
);

CREATE INDEX idx_hires_application_id  ON app.hires (application_id);
CREATE INDEX idx_hires_job_id          ON app.hires (job_id);
CREATE INDEX idx_hires_worker_user_id  ON app.hires (worker_user_id);
CREATE INDEX idx_hires_manager_user_id ON app.hires (manager_user_id);
CREATE INDEX idx_hires_status          ON app.hires (status);
```

---

### `app.attendance_records`

Daily attendance log per hire. Linked to a shift if the job has defined shifts.

```sql
CREATE TABLE app.attendance_records (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    hire_id             UUID        NOT NULL REFERENCES app.hires (id) ON DELETE CASCADE,
    job_shift_id        UUID        REFERENCES app.job_shifts (id),  -- NULL if no shift defined
    attendance_date     DATE        NOT NULL,
    status              VARCHAR(50) NOT NULL,
                                    -- 'present' | 'absent' | 'half_day' | 'late' | 'excused'
    check_in_time       TIME,
    check_out_time      TIME,
    hours_worked        NUMERIC(4, 2),
    wage_amount         NUMERIC(15, 0),  -- computed: hours × rate (NULL = use daily rate)
    recorded_by         UUID        NOT NULL REFERENCES auth.users (id),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_attendance_hire_date UNIQUE (hire_id, attendance_date),
    CONSTRAINT chk_attendance_status   CHECK (
        status IN ('present', 'absent', 'half_day', 'late', 'excused')
    )
);

CREATE INDEX idx_attendance_hire_id        ON app.attendance_records (hire_id);
CREATE INDEX idx_attendance_job_shift_id   ON app.attendance_records (job_shift_id);
CREATE INDEX idx_attendance_date           ON app.attendance_records (attendance_date);
```

---

### `app.employment_contracts`

One contract per hire. PDF generated server-side; signature images snapshotted at signing.

```sql
CREATE TABLE app.employment_contracts (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    hire_id                 UUID        NOT NULL UNIQUE REFERENCES app.hires (id),
    template_version        VARCHAR(20) NOT NULL DEFAULT 'v1',
    pdf_key                 VARCHAR(500),           -- unsigned PDF (S3)
    signed_pdf_key          VARCHAR(500),           -- fully signed PDF (S3)
    worker_signature_id     UUID        REFERENCES auth.signatures (id),
    manager_signature_id    UUID        REFERENCES auth.signatures (id),
    worker_signed_at        TIMESTAMPTZ,
    manager_signed_at       TIMESTAMPTZ,
    status                  VARCHAR(50) NOT NULL DEFAULT 'pending',
                                        -- 'pending' | 'worker_signed' | 'fully_signed' | 'voided'
    voided_at               TIMESTAMPTZ,
    voided_by               UUID        REFERENCES auth.users (id),
    voided_reason           TEXT,
    issued_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_contract_status CHECK (
        status IN ('pending', 'worker_signed', 'fully_signed', 'voided')
    )
);

CREATE INDEX idx_contracts_hire_id ON app.employment_contracts (hire_id);
CREATE INDEX idx_contracts_status  ON app.employment_contracts (status);
```

---

## Schema: `ref`

Read-only seed data. Migrations add rows; application never inserts/updates.

### `ref.provinces`

63 Vietnamese provinces + major cities.

```sql
CREATE TABLE ref.provinces (
    id          SERIAL      PRIMARY KEY,
    code        VARCHAR(10) NOT NULL,
    name_ko     VARCHAR(100) NOT NULL,
    name_vi     VARCHAR(100) NOT NULL,
    name_en     VARCHAR(100),
    region_ko   VARCHAR(50),
    region_vi   VARCHAR(50),
    sort_order  SMALLINT    NOT NULL DEFAULT 0,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_provinces_code UNIQUE (code)
);
```

### `ref.trades`

Construction trade types.

```sql
CREATE TABLE ref.trades (
    id              SERIAL      PRIMARY KEY,
    code            VARCHAR(50) NOT NULL,
    name_ko         VARCHAR(100) NOT NULL,
    name_vi         VARCHAR(100) NOT NULL,
    name_en         VARCHAR(100),
    category_ko     VARCHAR(50),
    category_vi     VARCHAR(50),
    sort_order      SMALLINT    NOT NULL DEFAULT 0,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,

    CONSTRAINT uq_trades_code UNIQUE (code)
);
```

---

## Schema: `ops`

### `ops.notifications`

Delivered via Firebase FCM. All user-visible strings stored in three locales.

```sql
CREATE TABLE ops.notifications (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    type            VARCHAR(100) NOT NULL,
                    -- 'application_status' | 'contract_ready' | 'attendance_recorded'
                    -- | 'manager_approved' | 'manager_rejected' | 'system'
    title_ko        VARCHAR(250) NOT NULL,
    title_vi        VARCHAR(250),
    title_en        VARCHAR(250),
    body_ko         TEXT        NOT NULL,
    body_vi         TEXT,
    body_en         TEXT,
    payload         JSONB       NOT NULL DEFAULT '{}',  -- deep link data
    delivery_status VARCHAR(50) NOT NULL DEFAULT 'pending',
                    -- 'pending' | 'sent' | 'failed'
    sent_at         TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id         ON ops.notifications (user_id);
CREATE INDEX idx_notifications_type            ON ops.notifications (type);
CREATE INDEX idx_notifications_unread          ON ops.notifications (user_id, read_at)
    WHERE read_at IS NULL;
```

### `ops.fcm_tokens`

Device tokens for Firebase Cloud Messaging.

```sql
CREATE TABLE ops.fcm_tokens (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    token           TEXT        NOT NULL,
    platform        VARCHAR(20) NOT NULL,   -- 'ios' | 'android' | 'web'
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    last_used_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_fcm_tokens_token UNIQUE (token)
);

CREATE INDEX idx_fcm_tokens_user_id ON ops.fcm_tokens (user_id);
```

### `ops.admin_approvals`

Approval workflow records. Covers manager registrations and, future, ID verifications.

```sql
CREATE TABLE ops.admin_approvals (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_type        VARCHAR(100) NOT NULL,  -- 'manager_registration' | 'identity_document'
    subject_id          UUID        NOT NULL,   -- FK into relevant table
    requester_user_id   UUID        NOT NULL REFERENCES auth.users (id),
    status              VARCHAR(50) NOT NULL DEFAULT 'pending',
                                    -- 'pending' | 'approved' | 'rejected'
    reviewed_by         UUID        REFERENCES auth.users (id),
    reviewed_at         TIMESTAMPTZ,
    review_note         TEXT,
    submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_admin_approvals_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX idx_admin_approvals_subject     ON ops.admin_approvals (subject_type, subject_id);
CREATE INDEX idx_admin_approvals_status      ON ops.admin_approvals (status);
CREATE INDEX idx_admin_approvals_requester   ON ops.admin_approvals (requester_user_id);
```

### `ops.audit_logs`

Immutable write-only log. Never updated or deleted.

```sql
CREATE TABLE ops.audit_logs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id   UUID        REFERENCES auth.users (id),  -- NULL for system actions
    actor_type      VARCHAR(50) NOT NULL DEFAULT 'user',     -- 'user' | 'system' | 'admin'
    action          VARCHAR(100) NOT NULL,  -- 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'login' | ...
    resource_type   VARCHAR(100) NOT NULL,  -- table name: 'jobs', 'hires', 'manager_profiles', ...
    resource_id     UUID        NOT NULL,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor_user_id ON ops.audit_logs (actor_user_id);
CREATE INDEX idx_audit_logs_resource      ON ops.audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at    ON ops.audit_logs (created_at);
```

---

## State Machines

### Application Status
```
pending ──[manager accepts]──▶ accepted ──▶ (hire record created)
        ──[manager rejects]──▶ rejected
        ──[worker withdraws]─▶ withdrawn   (only from pending)
        ──[job closes]───────▶ expired
```

### Hire Status
```
active ──[job dates complete]──▶ completed
       ──[manager cancels]─────▶ cancelled
       ──[worker no-show]──────▶ no_show
```

### Contract Status
```
pending ──[worker signs]──▶ worker_signed ──[manager signs]──▶ fully_signed
        ──[admin voids]──▶  voided
worker_signed ──[admin voids]──▶ voided
```

### Manager Approval Status
```
(not submitted)
       │
       ▼ [user submits business registration]
     pending
       │
       ├──[admin approves]──▶ approved  ──[admin revokes]──▶ revoked
       └──[admin rejects]───▶ rejected
                                │
                                └──[user resubmits]──▶ pending (new row, old is_current=false)
```

### Site / Job Status
```
draft ──[publish]──▶ open/active ──[fill / close]──▶ filled/closed ──[archive]──▶ archived
```

---

## Full Table Inventory

| # | Table | Schema | Rows (est. MVP) |
|---|---|---|---|
| 1 | users | auth | 1 K–10 K |
| 2 | user_roles | auth | 1.5× users |
| 3 | identity_documents | auth | ≈ users |
| 4 | signatures | auth | ≈ users |
| 5 | bank_accounts | auth | post-MVP |
| 6 | worker_profiles | app | ≈ users |
| 7 | worker_experiences | app | 3× workers |
| 8 | manager_profiles | app | 5–10% of users |
| 9 | sites | app | managers × 2 |
| 10 | site_images | app | sites × 3 |
| 11 | jobs | app | sites × 3 |
| 12 | job_shifts | app | jobs × work days |
| 13 | job_requirements | app | jobs × 2 |
| 14 | job_benefits | app | jobs × 3 |
| 15 | job_applications | app | jobs × 10 |
| 16 | hires | app | applications × 0.3 |
| 17 | attendance_records | app | hires × work days |
| 18 | employment_contracts | app | = hires |
| 19 | provinces | ref | 63 (fixed) |
| 20 | trades | ref | ~50 (fixed) |
| 21 | notifications | ops | 5× events |
| 22 | fcm_tokens | ops | 1.5× users |
| 23 | admin_approvals | ops | = manager_profiles |
| 24 | audit_logs | ops | high volume |
