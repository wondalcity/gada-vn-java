# GADA VN — Admin Panel Information Architecture

## 1. Design Principles

**Information density.** Every table page shows the maximum useful data per row without resorting to horizontal scrolling. Secondary data (rejection history, JSON diffs) is revealed on demand.

**Progressive disclosure.** List rows surface identity + status + primary action. Clicking a row (or a [상세보기] button) reveals the full record — either as a separate detail page or an expanded side panel.

**Inline actions.** Approve, reject, deactivate, and close actions are reachable directly from the list page for the most common workflow (reviewing pending approvals). Only destructive or form-heavy actions require navigating to a detail page.

**Confirmation modals.** All destructive actions (delete user, deactivate site, close job, reject manager) trigger an Alpine.js modal component. `window.confirm()` is never used.

**Persistent filters.** Filter state is encoded in URL query parameters (`?status=pending&page=2`). Refreshing or sharing a URL preserves the view exactly. Filter bar submits are `GET` form submissions, not JavaScript state.

**Korean UI language.** All admin panel labels, button text, flash messages, and navigation items are in Korean. The ops team is Korean-speaking; Vietnamese/English are reserved for end-user-facing content. `SetLocaleMiddleware` is not applied to `/admin/*` routes.

---

## 2. Navigation Structure

```
/admin/
├── 대시보드                  /admin/
├── 매니저 승인               /admin/approvals         (pending badge)
├── 사용자 관리               /admin/users
├── 현장 관리                 /admin/sites
├── 공고 관리                 /admin/jobs
├── 번역 관리                 /admin/translations
└── 감사 로그                 /admin/audit-logs
```

The sidebar is always visible. The pending approval count badge on 매니저 승인 is a live DB count rendered server-side on each page load (via the shared layout's `@php $pendingCount = DB::table('ops.admin_approvals')->where('status','pending')->count() @endphp`).

---

## 3. Page-by-Page Specification

### 3.1 Dashboard `/admin/`

**Purpose:** Immediate situational awareness — answer "what needs my attention right now?" without drilling into sub-pages.

**URL:** `/admin/` (no query params)

**Layout:** 4 stat cards across the top row; below: two data tables side by side (pending approvals left, recent audit log right).

**Stat cards:**

| Card | Value | Color | Link target |
|---|---|---|---|
| 승인 대기 | `ops.admin_approvals WHERE status='pending'` count | Amber (attention) | `/admin/approvals?status=pending` |
| 활성 사용자 | `auth.users WHERE status='active'` count | Blue | `/admin/users` |
| 진행 중 공고 | `app.jobs WHERE status='open'` count | Green | `/admin/jobs?status=open` |
| 활성 채용 | `app.hires WHERE status='active'` count | Indigo | `/admin/jobs` |

Clicking a stat card navigates to the relevant section with the relevant filter pre-applied.

**Pending Approvals table (top 5 most recent):**

Columns: 신청자명, 전화번호, 회사명, 신청일시, [승인] [반려] buttons

[승인] and [반려] buttons POST directly to `/admin/approvals/{id}/approve` and trigger the confirm modal. The list does not paginate — it shows the 5 most urgent items. "더 보기 →" link goes to `/admin/approvals`.

**Recent Audit Log (last 10 entries):**

Columns: 일시, 사용자, 액션 (badge), 엔티티 유형, 엔티티 ID

No actions on this table. "전체 보기 →" link goes to `/admin/audit-logs`.

---

### 3.2 Manager Approvals `/admin/approvals`

**Purpose:** Process the manager registration queue. The primary daily workflow for ops.

**URL params:** `?status=pending|approved|rejected` (default: `pending`)

**Status tabs:** [대기 중 N] [승인됨] [반려됨] rendered as tab links that update the `?status=` param.

**List view columns:**

| # | 신청자명 | 전화번호 | 회사명 | 사업자등록번호 | 신청일시 | 상태 | 액션 |
|---|---|---|---|---|---|---|---|

- 상태: color-coded badge (pending→amber, approved→green, rejected→red)
- 액션 (pending rows only): [상세보기] button + [승인] and [반려] inline buttons
- 액션 (approved/rejected rows): [상세보기] only

**Detail page `/admin/approvals/{id}`:**

Split layout — left panel (60%) + right panel (40%).

Left panel:
- 신청자 정보: name, phone, email, submission timestamp
- 회사 정보: company name (KO), business registration number
- 반려 이력: if this is a re-submission, show previous rejection reasons in a collapsible table sorted newest first

Right panel:
- 사업자등록증: presigned S3 document viewer — renders image or PDF in an `<iframe>` (see `presigned-viewer` component). Server fetches presigned URL and injects into the template.

Action bar (bottom):
- [승인하기] button (green) → `POST /admin/approvals/{id}/approve` with confirm modal
- [반려하기] section: `<textarea name="reason" required>` + [반려하기] button (red) → `POST /admin/approvals/{id}/reject` with confirm modal

Only shown when `status=pending`. Approved/rejected records are read-only.

**Pagination:** 20 rows per page, Laravel standard paginator.

---

### 3.3 User Management `/admin/users`

**Purpose:** Search users, inspect profiles, soft-delete accounts that violate platform rules.

**URL params:** `?search=&role=worker|manager|admin&status=active|deleted&page=`

**Filter bar:** text search (name/phone/email), role dropdown, status dropdown. Auto-submits on dropdown change; text search on form submit (Enter or button).

**List view columns:**

| # | 이름 | 전화번호 | 이메일 | 역할 | 가입일시 | 상태 | 액션 |
|---|---|---|---|---|---|---|---|

- 역할: multi-badge (worker, manager, admin displayed as stacked badges)
- 상태: badge (active→green, deleted→gray)
- 액션: [상세보기], [삭제] (active accounts only — red, confirm modal with reason field)

**Detail page `/admin/users/{id}`:**

Sections rendered vertically:

1. **기본 정보** — name, phone, email, locale, joined date, Firebase UID, current status
2. **역할** — table: 역할, 상태, 부여일, 회수일 (from `auth.user_roles`)
3. **매니저 프로필** (conditional) — company name, approval status, business registration number, link to relevant approval record
4. **워커 프로필** (conditional) — ID document status, signature status, experience list (trade, employer, duration, role)
5. **최근 활동** — last 10 `ops.audit_logs` entries where `user_id = {id}` (compact: timestamp, action, entity)

Action bar:
- [계정 삭제] (red) → confirm modal with mandatory reason textarea → `DELETE /admin/users/{id}` → soft-delete sets `status='deleted'`

---

### 3.4 Site Management `/admin/sites`

**Purpose:** Oversight of all construction sites; ability to force-deactivate a site that violates platform rules.

**URL params:** `?status=active|closed|archived&search=&page=`

**Filter bar:** status dropdown, text search (site name), province dropdown.

**List view columns:**

| # | 현장명 (KO) | 지역 | 매니저 | 진행 공고 수 | 상태 | 등록일 | 액션 |
|---|---|---|---|---|---|---|---|

- 진행 공고 수: count of `app.jobs WHERE site_id={id} AND status='open'`
- 상태: badge (active→green, closed→gray, archived→gray-dark)
- 액션: [상세보기], [비활성화] (active only — red, confirm modal)

**Detail page `/admin/sites/{id}`:**

1. **현장 정보** — name (all three locales), address, province, created date
2. **매니저 정보** — name, phone, link to `/admin/users/{id}`
3. **이미지 갤러리** — thumbnails from `app.site_images`, each rendered via presigned URL
4. **공고 목록** — paginated table of jobs under this site: title, status, headcount, start date, [상세보기] link
5. **액션** — [비활성화] if status=active

---

### 3.5 Job Management `/admin/jobs`

**Purpose:** Oversight of all job postings; ability to force-close a job posting.

**URL params:** `?status=draft|open|closed&province=&trade=&search=&page=`

**Filter bar:** status dropdown, province dropdown, trade dropdown, text search.

**List view columns:**

| # | 공고 제목 (KO) | 현장명 | 지역 | 직종 | 모집인원 | 일당 (VND) | 시작일 | 상태 | 액션 |
|---|---|---|---|---|---|---|---|---|---|

- 일당: formatted as `1,200,000` (comma-separated VND integer, no decimal)
- 상태: badge (draft→gray, open→green, closed→red)
- 액션: [상세보기], [강제 마감] (open only — red, confirm modal)

**Detail page `/admin/jobs/{id}`:**

1. **공고 정보** — title (all locales), trade, headcount, daily wage, date range, description
2. **교대 근무** — shifts table if `app.job_shifts` records exist
3. **지원 현황** — summary counts: 전체 / 대기 / 합격 / 불합격
4. **채용 목록** — table: 워커 이름, 상태, 채용일
5. **출퇴근 요약** — if any `app.attendance_records` exist: date range, total days, total workers recorded
6. **액션** — [강제 마감] if status=open

---

### 3.6 Translation Management `/admin/translations`

**Purpose:** Edit i18n strings stored in `ops.translations` without a deployment. Used for notification copy, UI labels, and dynamic content.

**URL params:** `?locale=ko|vi|en&search=&page=`

**Layout:** filter bar on top; below it, an inline-editable table.

**Columns:**

| 키 | 한국어 값 | 베트남어 값 | 영어 값 | 최종 수정 | 저장 |
|---|---|---|---|---|---|

- All three value columns are rendered as `<textarea>` inputs (single-row, expands on focus)
- [저장] per row submits `PUT /admin/translations` with `{key, locale, value}` payload
- Alternatively, a [전체 저장] button at the bottom batch-saves all dirty rows (tracked via Alpine.js `x-data` dirty flag per row)
- Missing translations (null value) displayed with a dimmed placeholder, not empty string
- Search filters by key substring across all locales simultaneously

**Pagination:** 50 keys per page.

---

### 3.7 Audit Logs `/admin/audit-logs`

**Purpose:** Compliance trail and debugging. Read-only.

**URL params:** `?user_id=&entity_type=&action=created|updated|deleted&from=&to=&page=`

**Filter bar:** date range picker (`from`/`to`), entity type dropdown (Site, Job, JobApplication, Hire, EmploymentContract, ManagerProfile, UserRole), action type dropdown, user ID/name search.

**List view columns:**

| 일시 | 사용자 | 액션 | 엔티티 유형 | 엔티티 ID | IP 주소 | |
|---|---|---|---|---|---|---|

- 액션: badge (created→green, updated→blue, deleted→red)
- Last column: [▼] toggle button for inline diff expansion

**Inline diff expansion (accordion row):**

When [▼] is clicked, a row below expands (Alpine.js `x-show`) showing a two-column JSON diff:

```
이전 값                    변경된 값
{                          {
  "status": "pending"        "status": "approved"
}                          }
```

Rendered with `<pre>` and monospace font. Keys that changed are highlighted.

**Pagination:** 50 rows per page.

---

## 4. Shared UI Components

All components live in `resources/views/components/admin/`.

### `stat-card`

```blade
<x-admin.stat-card
    label="승인 대기"
    :value="$stats['pending_approvals']"
    color="amber"
    :href="route('admin.approvals.index', ['status' => 'pending'])"
/>
```

Renders a bordered card with a large number, label, and optional color accent. Wraps in an `<a>` tag if `href` is provided.

### `data-table`

```blade
<x-admin.data-table :items="$approvals">
    <x-slot:head>
        <th>신청자명</th>
        <th>회사명</th>
        ...
    </x-slot:head>
    @foreach($approvals as $row)
        <tr>...</tr>
    @endforeach
    <x-slot:pagination>{{ $approvals->links() }}</x-slot:pagination>
</x-admin.data-table>
```

Provides the `<table>` shell with consistent padding, border, and hover styles. Pagination slot renders Laravel's paginator below the table.

### `badge`

```blade
<x-admin.badge :status="$approval->status" />
```

Maps status strings to Tailwind color classes:

| Status | Color class |
|---|---|
| `pending` | `bg-amber-100 text-amber-800` |
| `approved` / `active` / `open` | `bg-green-100 text-green-800` |
| `rejected` / `deleted` / `closed` | `bg-red-100 text-red-800` |
| `draft` / `archived` | `bg-gray-100 text-gray-600` |
| `worker_signed` | `bg-blue-100 text-blue-800` |

### `confirm-modal`

```blade
<x-admin.confirm-modal
    id="deactivate-modal"
    title="현장 비활성화"
    message="이 현장을 비활성화하면 진행 중인 모든 공고가 함께 마감됩니다. 계속하시겠습니까?"
    confirmText="비활성화"
    :action="route('admin.sites.deactivate', $site->id)"
/>
```

Alpine.js component. Trigger: any element with `@click="$dispatch('open-modal', 'deactivate-modal')"`. Renders a centered overlay with title, message, [취소] (closes modal) and a red confirm button that submits the `<form action="{action}" method="POST">` with hidden `_method` override if needed.

Never uses `window.confirm()`.

### `filter-bar`

```blade
<x-admin.filter-bar :action="route('admin.approvals.index')">
    <select name="status" @change="$el.closest('form').submit()">
        <option value="pending" {{ request('status','pending')==='pending' ? 'selected' : '' }}>대기 중</option>
        <option value="approved" {{ request('status')==='approved' ? 'selected' : '' }}>승인됨</option>
        <option value="rejected" {{ request('status')==='rejected' ? 'selected' : '' }}>반려됨</option>
    </select>
    <input type="text" name="search" value="{{ request('search') }}" placeholder="이름 / 전화번호 검색">
    <button type="submit">검색</button>
</x-admin.filter-bar>
```

Wraps a `<form method="GET">` with consistent flex layout and spacing. Dropdown inputs auto-submit via `@change`. Text inputs submit on button click or Enter.

### `presigned-viewer`

```blade
<x-admin.presigned-viewer :s3key="$approval->business_registration_doc_s3_key" />
```

Server-side: the component calls `S3Service::presignedUrl($s3key)` in its `__construct` to generate the URL. Template renders `<img>` for image MIME types, `<iframe>` for PDFs. The presigned URL is injected at render time; it is never stored in the DB or exposed in a separate API call.

### `flash-message`

```blade
{{-- In layouts/app.blade.php --}}
@if(session('success'))
    <x-admin.flash-message type="success" :message="session('success')" />
@endif
@if(session('error'))
    <x-admin.flash-message type="error" :message="session('error')" />
@endif
```

Renders a fixed-position toast (bottom-right). Alpine.js `x-init="setTimeout(() => show = false, 3000)"` auto-dismisses after 3 seconds. The `[×]` button allows manual dismissal.

---

## 5. Sidebar Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  GADA VN Admin                   관리자명 ▾        로그아웃       │
├──────────────────┬───────────────────────────────────────────────┤
│                  │                                               │
│  대시보드         │                                               │
│  매니저 승인  ⚠ 3 │           MAIN CONTENT AREA                  │
│  사용자 관리      │                                               │
│  현장 관리        │                                               │
│  공고 관리        │                                               │
│  번역 관리        │                                               │
│  감사 로그        │                                               │
│                  │                                               │
│  ─────────────── │                                               │
│  v1.0.0          │                                               │
└──────────────────┴───────────────────────────────────────────────┘
```

**Sidebar:** fixed left, 240px wide, full viewport height. Background: `bg-gray-900`. Text: `text-gray-300`. Active item: `bg-gray-700 text-white` with left border accent `border-l-2 border-blue-500`.

**Pending count badge:** amber pill `⚠ N` next to 매니저 승인. Count is rendered server-side in the layout on every page load via a view composer or injected variable.

**Topbar:** fixed top, full width, `bg-white border-b`. Left: app logo/name. Right: admin display name with a dropdown (profile link, logout button).

**Content area:** left margin 240px, top margin for topbar, consistent `p-6` padding inside.

---

## 6. Table Row Patterns

**Status badge:** always the first visual indicator after identity columns, color-coded as per `badge` component spec.

**Actions column:** right-aligned, `text-sm` buttons. Text buttons preferred over icon-only for clarity. Order: primary action ([상세보기]) first, destructive action ([삭제] / [비활성화] / [강제 마감]) last with `text-red-600`.

**Destructive action click flow:**
1. Admin clicks [비활성화] (red text button)
2. Alpine.js dispatches `open-modal` event to the pre-rendered `confirm-modal` component on the page
3. Admin reads the warning message and clicks [비활성화] (red button) inside the modal
4. Modal submits hidden `<form>` to the action URL
5. Server redirects back with `session()->flash('success', '...')`
6. Flash message toast appears and auto-dismisses

**Pagination:** rendered below the table. Format: `← Previous  1 2 3 ... 9  Next →` with "1–20 of 85 건" info text on the left. Preserves all current query params when navigating pages (via `$paginator->appends(request()->query())->links()`).

**Empty state:** when a table has no rows, a centered empty-state row spans all columns: `데이터가 없습니다.` in gray text.

---

## 7. Form Patterns

**Method:** all forms submit `POST` with CSRF token (`@csrf`). Destructive actions that semantically are `DELETE` or `PATCH` use `@method('DELETE')` / `@method('PATCH')` hidden inputs. Confirm modals wrap the `<form>` so the modal's confirm button triggers the hidden form's submit.

**Validation errors:** displayed inline under each field using `@error('field_name') <p class="text-red-600 text-sm mt-1">{{ $message }}</p> @enderror`. Fields with errors get `border-red-500` class added via `@error`.

**Required field marking:** asterisk `*` after the label text, `text-red-500` color.

**File inputs:** if a field already has an uploaded file (e.g., business registration document), show the current file name and a presigned preview thumbnail above the input, plus a "현재 파일 변경" toggle to show the file input.

**Submit button states:** buttons use `wire:loading`-style Alpine.js disabling — `@click="submitting = true"` with `:disabled="submitting"` and `:class="{ 'opacity-50 cursor-not-allowed': submitting }"` to prevent double-submit.

**Success/redirect pattern:** on successful form submit, controller calls `return redirect()->back()->with('success', '저장되었습니다.')` or `return redirect()->route('admin.approvals.index')->with('success', '승인되었습니다.')`. The flash message component in the layout renders it.
