# Content and Translation Management — GADA VN

**Product**: GADA VN
**Date**: 2026-03-21
**Version**: MVP
**Audience**: Developers, content managers, translators

---

## 1. Supported Languages

| Locale code | Language | Default? | Apps |
|-------------|----------|----------|------|
| `ko` | Korean (한국어) | Yes — default for all apps | Web, Mobile, Admin |
| `vi` | Vietnamese (Tiếng Việt) | — | Web, Mobile |
| `en` | English | — | Web (future), Mobile (future) |

Korean is the platform default and the source language for all translations. All new copy is written in Korean first, then translated to Vietnamese.

---

## 2. Current State (MVP)

> **Important**: As of the MVP release, translation source files have not been committed to the repository. The sections below describe the intended file structure and workflow that must be implemented before multilingual content can be managed.

No `messages/` or `locales/` directories currently exist under `apps/web-next/src/` or `apps/mobile/`. The following is the target structure to be created.

---

## 3. Web App Translation Files (next-intl)

### 3.1 File Structure

The web app uses `next-intl` for internationalisation. Translation files must be placed at:

```
apps/web-next/
└── messages/
    ├── ko.json        ← Korean (source / default)
    ├── vi.json        ← Vietnamese
    └── en.json        ← English (future)
```

These files are loaded at build time by next-intl's `getMessages()` in `i18n.ts`.

### 3.2 Key Naming Convention

All keys use `snake_case`, grouped by feature namespace:

```json
{
  "common": {
    "save": "저장",
    "cancel": "취소",
    "loading": "로딩 중...",
    "error_unknown": "오류가 발생했습니다"
  },
  "auth": {
    "otp_request_title": "전화번호 인증",
    "otp_placeholder": "인증번호 6자리 입력",
    "otp_resend": "재전송",
    "login_button": "로그인"
  },
  "jobs": {
    "apply_button": "지원하기",
    "withdraw_button": "지원 취소",
    "daily_wage_label": "일급",
    "slots_remaining": "{count}명 모집 중"
  },
  "contracts": {
    "sign_button": "서명하기",
    "download_button": "계약서 다운로드",
    "status_pending_worker": "근로자 서명 대기",
    "status_pending_manager": "현장소장 서명 대기",
    "status_fully_signed": "계약 완료"
  }
}
```

**Rules**:
- Never use numeric suffixes (e.g., `button_1`).
- Plurals use ICU message format with `{count}` variable.
- Never interpolate raw HTML into translation strings.
- Keys are never deleted — deprecate by prefixing `_DEPRECATED_`.

### 3.3 Using Translations in Web Components

```typescript
// In a Server Component or Client Component:
import { useTranslations } from 'next-intl';

export default function ApplyButton() {
  const t = useTranslations('jobs');
  return <button>{t('apply_button')}</button>;
}

// With variable interpolation:
t('slots_remaining', { count: 5 }) // → "5명 모집 중"
```

---

## 4. Mobile App Translation Files (react-i18next)

### 4.1 File Structure

The mobile app uses `react-i18next` with `i18next`. Translation files must be placed at:

```
apps/mobile/
└── src/
    └── locales/
        ├── ko/
        │   └── translation.json
        ├── vi/
        │   └── translation.json
        └── en/
            └── translation.json
```

### 4.2 Key Naming Convention

Same `snake_case` + feature namespace approach as web:

```json
{
  "common": {
    "save": "저장",
    "cancel": "취소"
  },
  "jobs": {
    "apply_button": "지원하기",
    "slots_remaining": "{{count}}명 모집 중"
  }
}
```

> Note: react-i18next uses `{{count}}` (double curly braces) while next-intl uses `{count}` (single). Ensure you use the correct syntax per app.

### 4.3 i18next Configuration

```typescript
// apps/mobile/src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from './locales/ko/translation.json';
import vi from './locales/vi/translation.json';

i18n.use(initReactI18next).init({
  resources: { ko: { translation: ko }, vi: { translation: vi } },
  lng: 'ko',              // default language
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
});
```

Language is stored in `AsyncStorage` under key `gada_locale` and applied on app launch.

---

## 5. Admin Panel (PHP / Twig)

The admin panel (`apps/admin-laravel/`) is Korean-only for MVP. If Vietnamese admin support is needed:

- Laravel's localisation uses `lang/ko/` and `lang/vi/` directories.
- Files follow Laravel's standard key-value array format.
- Admin panel copy changes are deployed with the application (no runtime update).

---

## 6. Translation Workflow

### 6.1 Adding New Copy

When a developer adds a new feature that requires user-facing text:

1. **Add the Korean key first** in `messages/ko.json` (web) or `locales/ko/translation.json` (mobile).
2. **Use a placeholder** in Vietnamese file with the prefix `[TODO] `:
   ```json
   "new_feature_label": "[TODO] 새 기능 레이블"
   ```
3. **Open a translation ticket** in the project tracker with:
   - Feature name
   - List of new keys (ko values included as context)
   - Deadline (before the feature release)
4. **Translator updates** the `vi.json` file (and `en.json` if needed).
5. **Developer reviews** the PR for key naming and format correctness.
6. **Merge** the translation PR before the feature PR is deployed.

### 6.2 Translation Review Process

All Vietnamese translations must be reviewed by a native Vietnamese speaker before deployment. For MVP:
- The reviewer is: [assign a native Vietnamese speaker on the team]
- Review checklist:
  - Correct Vietnamese construction industry terminology
  - Formal/polite register (xưng hô lịch sự)
  - Province names match official Vietnamese administrative names
  - Trade names match standard industry usage
  - Numbers and currency formatted correctly (VND, no decimal)

### 6.3 Translation Tools

For MVP, translations are managed directly in JSON files via PRs. Post-MVP options:
- **Lokalise**: cloud-based, imports/exports JSON, supports in-context preview
- **Crowdin**: open-source project integration, GitHub sync
- **PhraseApp**: enterprise, supports ICU message format

---

## 7. Reference Data — Trades (직종)

Trade names are stored in the `ref.construction_trades` database table. They have multilingual name columns:

```sql
-- Table structure (from packages/db/migrations/)
ref.construction_trades (
  id          SERIAL PRIMARY KEY,
  name_ko     TEXT NOT NULL,   -- Korean name (canonical)
  name_vi     TEXT NOT NULL,   -- Vietnamese name
  name_en     TEXT,            -- English name (optional)
  slug        TEXT UNIQUE      -- URL-safe identifier (derived from name_ko)
)
```

### 7.1 Updating Trade Names

To add or rename a trade:

1. Write a new SQL migration file in `packages/db/migrations/`:
   ```sql
   -- NNN_add_trade_name.sql
   INSERT INTO ref.construction_trades (name_ko, name_vi, name_en, slug)
   VALUES ('새 직종', 'Ngành nghề mới', 'New Trade', 'new-trade');
   ```
   Or to rename:
   ```sql
   UPDATE ref.construction_trades
   SET name_vi = 'Tên mới tiếng Việt'
   WHERE slug = 'existing-trade-slug';
   ```
2. Run migration on staging: `pnpm db:migrate` (confirm data correct).
3. Merge and deploy to production via the standard CI pipeline.
4. **Note**: Trade names used in posted job listings are stored by ID reference — renaming a trade in the `ref` table immediately updates all job listings that reference it.

### 7.2 Current Trade Categories (MVP)

The database is seeded with standard Vietnamese construction trade categories. Key examples:

| Slug | Korean | Vietnamese |
|------|--------|-----------|
| `concrete` | 콘크리트 | Bê tông |
| `rebar` | 철근 | Cốt thép |
| `formwork` | 거푸집 | Ván khuôn |
| `masonry` | 조적 | Xây gạch |
| `plumbing` | 배관 | Ống nước |
| `electrical` | 전기 | Điện |
| `finishing` | 마감 | Hoàn thiện |
| `general` | 일반 | Phổ thông |

Full list: query `SELECT * FROM ref.construction_trades ORDER BY id` on the database.

---

## 8. Reference Data — Provinces (지역)

Province data is stored in `ref.vn_provinces`:

```sql
ref.vn_provinces (
  id          SERIAL PRIMARY KEY,
  name_vi     TEXT NOT NULL,   -- Official Vietnamese name
  name_ko     TEXT NOT NULL,   -- Korean transliteration
  slug        TEXT UNIQUE,     -- URL path segment (derived from name_vi)
  gso_code    TEXT             -- Vietnam GSO administrative code
)
```

### 8.1 Updating Province Data

Province boundaries and names rarely change. If an update is needed (e.g., administrative reorganisation):

1. Write a SQL migration.
2. Update the `slug` only if the URL has never been indexed — changing an existing slug breaks SEO and bookmarks.
3. If a slug must change, add a permanent redirect in `apps/web-next/next.config.ts` under `redirects`.

### 8.2 Province URL Structure

Job listing pages use province slugs in URLs:
```
/vi/jobs/ho-chi-minh-city     → 호치민
/vi/jobs/ha-noi               → 하노이
/vi/jobs/binh-duong           → 빈즈엉
```

If a province slug changes in the DB, the URL changes. Always add redirects.

---

## 9. Deploying Content Updates

### 9.1 Translation-Only Changes (Web)

If only `messages/vi.json` (or `en.json`) is updated with no code changes:

1. Merge the translation PR to `main` (or `staging`).
2. The Next.js web app will be rebuilt automatically by CI (`ci.yml` triggers on push to `main`).
3. Because `NEXT_PUBLIC_*` vars are baked at build time, the Docker image is rebuilt. Translation files (JSON) are bundled into the Next.js build at compile time.
4. ECS will pull the new image and restart tasks.

**Deployment time**: ~5–10 minutes from merge to live.

### 9.2 Translation-Only Changes (Mobile)

Mobile app translations are bundled in the JavaScript bundle at EAS build time.

1. Update `locales/vi/translation.json`.
2. Merge to `staging` → EAS builds a new `preview` APK automatically (`mobile.yml`).
3. Distribute via TestFlight / internal distribution to QA.
4. Merge to `main` → EAS builds production APK → submit to stores.

**Deployment time**: ~30–60 minutes for EAS build; 24–72h for App Store review if app store submission is needed.

> **OTA Updates (future)**: Expo EAS Update can push JavaScript-only changes (including translation files) as over-the-air updates without app store review. This is not configured for MVP.

### 9.3 Reference Data Changes (DB Migrations)

1. Write SQL migration file in `packages/db/migrations/`.
2. Merge to `staging` → CI runs `pnpm db:migrate` as ECS one-shot task.
3. Verify on staging.
4. Merge to `main` → CI runs migration on production DB before deploying new images.

---

## 10. Missing Translations (Fallback Behaviour)

If a translation key exists in `ko.json` but is missing from `vi.json`:

- **next-intl (web)**: Falls back to `ko` (the `fallbackLocale` in `i18n.ts`). The user sees Korean text — not ideal but not a crash.
- **react-i18next (mobile)**: Falls back to `fallbackLng: 'ko'`. Same behaviour.
- **Detection**: During development, missing keys log a warning in the browser/React Native console. In CI, run `pnpm i18n:check` (to be implemented — see action items).

### 10.1 Detecting Missing Keys (Action Item)

Add to the CI pipeline:

```bash
# Check for keys in ko.json that are missing from vi.json
node scripts/check-translations.js
```

Script logic: parse both JSON files, compare all key paths, report any keys present in `ko.json` but absent from `vi.json`. Fail CI if `[TODO]` placeholder strings remain.

---

## 11. Action Items (Pre-MVP)

| Item | Owner | Priority |
|------|-------|----------|
| Create `apps/web-next/messages/ko.json` and `vi.json` with all current UI strings | Frontend developer | P0 before staging |
| Create `apps/mobile/src/locales/ko/` and `vi/` directories with `translation.json` | Mobile developer | P0 before staging |
| Implement `i18n.ts` in mobile app using react-i18next | Mobile developer | P0 |
| Write `scripts/check-translations.js` and add to CI | Backend/DevOps | P1 |
| Assign Vietnamese translation reviewer | Operations/Management | P1 |
| Evaluate Lokalise or Crowdin for post-MVP translation management | Operations | P2 |
| Implement Expo EAS Update for OTA translation deploys | Mobile developer | P2 post-MVP |
