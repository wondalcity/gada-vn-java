-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS ref;
CREATE SCHEMA IF NOT EXISTS ops;

-- ============================================================
-- REF SCHEMA — reference/lookup data
-- ============================================================

CREATE TABLE ref.construction_trades (
    id          SERIAL PRIMARY KEY,
    code        TEXT UNIQUE NOT NULL,
    name_ko     TEXT NOT NULL,
    name_vi     TEXT NOT NULL,
    name_en     TEXT
);

CREATE TABLE ref.vn_provinces (
    code        TEXT PRIMARY KEY,
    name_vi     TEXT NOT NULL,
    name_en     TEXT
);

-- ============================================================
-- AUTH SCHEMA — user identity
-- ============================================================

CREATE TABLE auth.users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid    TEXT UNIQUE NOT NULL,
    phone           TEXT UNIQUE,
    email           TEXT UNIQUE,
    role            TEXT NOT NULL CHECK (role IN ('WORKER', 'MANAGER', 'ADMIN')),
    status          TEXT NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_users_firebase_uid ON auth.users(firebase_uid);
CREATE INDEX idx_auth_users_phone ON auth.users(phone);

-- ============================================================
-- APP SCHEMA — WORKER PROFILES
-- ============================================================

CREATE TABLE app.worker_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name           TEXT NOT NULL,
    date_of_birth       DATE NOT NULL,
    gender              TEXT CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    experience_months   INT NOT NULL DEFAULT 0,
    primary_trade_id    INT REFERENCES ref.construction_trades(id),
    -- Location
    current_province    TEXT REFERENCES ref.vn_provinces(code),
    current_district    TEXT,
    lat                 NUMERIC(10, 7),
    lng                 NUMERIC(10, 7),
    -- ID Verification
    id_number           TEXT,
    id_front_s3_key     TEXT,
    id_back_s3_key      TEXT,
    id_verified         BOOLEAN NOT NULL DEFAULT FALSE,
    id_verified_at      TIMESTAMPTZ,
    -- Signature
    signature_s3_key    TEXT,
    -- Profile
    profile_picture_s3_key TEXT,
    bio                 TEXT,
    bank_account_number TEXT,
    bank_name           TEXT,
    profile_complete    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE app.worker_trade_skills (
    worker_id   UUID NOT NULL REFERENCES app.worker_profiles(id) ON DELETE CASCADE,
    trade_id    INT NOT NULL REFERENCES ref.construction_trades(id),
    years       INT NOT NULL DEFAULT 0,
    PRIMARY KEY (worker_id, trade_id)
);

-- ============================================================
-- APP SCHEMA — MANAGER PROFILES
-- ============================================================

CREATE TABLE app.manager_profiles (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_type           TEXT NOT NULL CHECK (business_type IN ('INDIVIDUAL', 'CORPORATE')),
    company_name            TEXT,
    representative_name     TEXT NOT NULL,
    representative_dob      DATE,
    representative_gender   TEXT CHECK (representative_gender IN ('MALE', 'FEMALE', 'OTHER')),
    -- Business registration
    business_reg_number     TEXT,
    business_reg_s3_key     TEXT,
    -- Contact
    contact_phone           TEXT,
    contact_address         TEXT,
    province                TEXT,
    -- Profile
    profile_picture_s3_key  TEXT,
    signature_s3_key        TEXT,
    -- Approval
    approval_status         TEXT NOT NULL DEFAULT 'PENDING'
                            CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_at             TIMESTAMPTZ,
    approved_by             UUID REFERENCES auth.users(id),
    rejection_reason        TEXT,
    -- Terms
    terms_accepted          BOOLEAN NOT NULL DEFAULT FALSE,
    privacy_accepted        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_manager_profiles_approval ON app.manager_profiles(approval_status);

-- ============================================================
-- APP SCHEMA — CONSTRUCTION SITES
-- ============================================================

CREATE TABLE app.construction_sites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id  UUID NOT NULL REFERENCES app.manager_profiles(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    address     TEXT NOT NULL,
    province    TEXT NOT NULL,
    district    TEXT,
    lat         NUMERIC(10, 7),
    lng         NUMERIC(10, 7),
    location    GEOMETRY(Point, 4326),  -- PostGIS geometry for spatial queries
    site_type   TEXT,
    status      TEXT NOT NULL DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE', 'COMPLETED', 'PAUSED')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_construction_sites_manager ON app.construction_sites(manager_id);
CREATE INDEX idx_construction_sites_location ON app.construction_sites USING GIST(location);
CREATE INDEX idx_construction_sites_province ON app.construction_sites(province);

-- Trigger to keep PostGIS location in sync with lat/lng
CREATE OR REPLACE FUNCTION app.sync_site_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
        NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_site_location
    BEFORE INSERT OR UPDATE OF lat, lng ON app.construction_sites
    FOR EACH ROW EXECUTE FUNCTION app.sync_site_location();

-- ============================================================
-- APP SCHEMA — JOBS
-- ============================================================

CREATE TABLE app.jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id         UUID NOT NULL REFERENCES app.construction_sites(id) ON DELETE CASCADE,
    manager_id      UUID NOT NULL REFERENCES app.manager_profiles(id),
    title           TEXT NOT NULL,
    description     TEXT,
    trade_id        INT REFERENCES ref.construction_trades(id),
    -- Scheduling
    work_date       DATE NOT NULL,
    start_time      TIME,
    end_time        TIME,
    -- Compensation (VND as integer)
    daily_wage      NUMERIC(12, 0) NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'VND',
    -- Benefits JSONB: {meals, transport, accommodation, insurance}
    benefits        JSONB NOT NULL DEFAULT '{}',
    requirements    JSONB NOT NULL DEFAULT '{}',
    -- Headcount
    slots_total     INT NOT NULL DEFAULT 1 CHECK (slots_total > 0),
    slots_filled    INT NOT NULL DEFAULT 0 CHECK (slots_filled >= 0),
    -- Status
    status          TEXT NOT NULL DEFAULT 'OPEN'
                    CHECK (status IN ('OPEN', 'FILLED', 'CANCELLED', 'COMPLETED')),
    -- SEO
    slug            TEXT UNIQUE,
    published_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    -- Images (array of S3 keys)
    image_s3_keys   TEXT[] NOT NULL DEFAULT '{}',
    cover_image_idx INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT slots_check CHECK (slots_filled <= slots_total)
);

CREATE INDEX idx_jobs_work_date ON app.jobs(work_date);
CREATE INDEX idx_jobs_site_id ON app.jobs(site_id);
CREATE INDEX idx_jobs_manager_id ON app.jobs(manager_id);
CREATE INDEX idx_jobs_status ON app.jobs(status);
CREATE INDEX idx_jobs_trade_id ON app.jobs(trade_id);
CREATE INDEX idx_jobs_slug ON app.jobs(slug) WHERE slug IS NOT NULL;

-- ============================================================
-- APP SCHEMA — APPLICATIONS
-- ============================================================

CREATE TABLE app.job_applications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID NOT NULL REFERENCES app.jobs(id) ON DELETE CASCADE,
    worker_id       UUID NOT NULL REFERENCES app.worker_profiles(id),
    status          TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'CONTRACTED')),
    applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at     TIMESTAMPTZ,
    reviewed_by     UUID REFERENCES app.manager_profiles(id),
    notes           TEXT,
    UNIQUE(job_id, worker_id)
);

CREATE INDEX idx_applications_job_id ON app.job_applications(job_id);
CREATE INDEX idx_applications_worker_id ON app.job_applications(worker_id);
CREATE INDEX idx_applications_status ON app.job_applications(status);

-- ============================================================
-- APP SCHEMA — CONTRACTS
-- ============================================================

CREATE TABLE app.contracts (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id              UUID UNIQUE REFERENCES app.job_applications(id),
    job_id                      UUID NOT NULL REFERENCES app.jobs(id),
    worker_id                   UUID NOT NULL REFERENCES app.worker_profiles(id),
    manager_id                  UUID NOT NULL REFERENCES app.manager_profiles(id),
    -- Contract content
    contract_html               TEXT NOT NULL,
    contract_pdf_s3_key         TEXT,
    -- Signatures (S3 keys for PNG files)
    worker_signature_s3_key     TEXT,
    manager_signature_s3_key    TEXT,
    worker_signed_at            TIMESTAMPTZ,
    manager_signed_at           TIMESTAMPTZ,
    worker_signed_ip            INET,
    manager_signed_ip           INET,
    status                      TEXT NOT NULL DEFAULT 'PENDING_WORKER_SIGN'
                                CHECK (status IN (
                                    'PENDING_WORKER_SIGN',
                                    'PENDING_MANAGER_SIGN',
                                    'FULLY_SIGNED',
                                    'VOID'
                                )),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contracts_job_id ON app.contracts(job_id);
CREATE INDEX idx_contracts_worker_id ON app.contracts(worker_id);
CREATE INDEX idx_contracts_status ON app.contracts(status);

-- ============================================================
-- APP SCHEMA — ATTENDANCE
-- ============================================================

CREATE TABLE app.attendance_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID NOT NULL REFERENCES app.jobs(id),
    worker_id       UUID NOT NULL REFERENCES app.worker_profiles(id),
    contract_id     UUID REFERENCES app.contracts(id),
    work_date       DATE NOT NULL,
    status          TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('ATTENDED', 'ABSENT', 'HALF_DAY', 'PENDING')),
    check_in_time   TIME,
    check_out_time  TIME,
    hours_worked    NUMERIC(4, 2),
    marked_by       UUID REFERENCES app.manager_profiles(id),
    marked_at       TIMESTAMPTZ,
    notes           TEXT,
    UNIQUE(job_id, worker_id, work_date)
);

CREATE INDEX idx_attendance_job_id ON app.attendance_records(job_id);
CREATE INDEX idx_attendance_worker_id ON app.attendance_records(worker_id);
CREATE INDEX idx_attendance_work_date ON app.attendance_records(work_date);

-- ============================================================
-- OPS SCHEMA — NOTIFICATIONS
-- ============================================================

CREATE TABLE ops.notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    data            JSONB NOT NULL DEFAULT '{}',
    read            BOOLEAN NOT NULL DEFAULT FALSE,
    sent_via_fcm    BOOLEAN NOT NULL DEFAULT FALSE,
    fcm_message_id  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON ops.notifications(user_id);
CREATE INDEX idx_notifications_read ON ops.notifications(user_id, read) WHERE read = FALSE;

CREATE TABLE ops.fcm_tokens (
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token           TEXT NOT NULL,
    platform        TEXT CHECK (platform IN ('IOS', 'ANDROID')),
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, token)
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables
             WHERE table_schema IN ('auth', 'app')
               AND table_name IN (
                   'users', 'worker_profiles', 'manager_profiles',
                   'construction_sites', 'jobs', 'contracts'
               )
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION app.set_updated_at()',
            (SELECT table_schema FROM information_schema.tables WHERE table_name = t LIMIT 1), t
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;
