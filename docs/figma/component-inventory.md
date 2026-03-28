# Component Inventory — GADA VN

**Source**: Figma file `l9T36IlqSYGhGxAiRseRV7` — page `01. Style`
**Status key**: ✅ Designed in Figma · ⬜ To be designed · 🔵 In code (`packages/ui`) · ⚠️ Partial
**Last updated**: 2026-03-21

---

## Component Status Summary

| Category | Total | Designed | In Code | To Design |
|---|---|---|---|---|
| Atoms | 8 | 4 | 0 | 4 |
| Molecules | 9 | 5 | 0 | 4 |
| Organisms | 10 | 0 | 0 | 10 |
| Navigation | 4 | 3 | 0 | 1 |
| Feedback | 5 | 3 | 0 | 2 |
| Layout | 3 | 2 | 0 | 1 |

---

## 1. Atoms

Smallest reusable UI elements with no internal dependencies on other components.

### 1.1 Input Field
**Figma component**: `input_tobe` (8 instances), `input_tobe/inactive/n/a` (1 instance)
**Status**: ✅ Designed
**Variants required**:

| State | Figma | Code |
|---|---|---|
| Default / Active | ✅ | ⬜ |
| Inactive / Disabled | ✅ | ⬜ |
| Error | ⬜ To be designed | — |
| Success | ⬜ To be designed | — |
| With prefix icon | ⬜ To be designed | — |
| With suffix icon | ⬜ To be designed | — |

**Props**: `label`, `placeholder`, `value`, `error?: string`, `disabled?: boolean`, `prefix?: ReactNode`, `suffix?: ReactNode`

---

### 1.2 Button
**Figma component**: `button_large` (1 instance)
**Status**: ⚠️ Partial — only large variant designed

| Variant | Size | Figma | Code |
|---|---|---|---|
| Primary | Large | ✅ | ⬜ |
| Primary | Medium | ⬜ To be designed | — |
| Primary | Small | ⬜ To be designed | — |
| Secondary / Outlined | Large | ⬜ To be designed | — |
| Ghost / Text | Any | ⬜ To be designed | — |
| Destructive | Any | ⬜ To be designed | — |
| Disabled (all) | All | ⬜ To be designed | — |
| Loading state | All | ⬜ To be designed | — |

**Props**: `variant`, `size`, `disabled?`, `loading?`, `leftIcon?`, `rightIcon?`, `children`

---

### 1.3 Badge / Status Chip
**Figma component**: `Badge` (component defined)
**Status**: ✅ Designed

| Variant | Color | Figma | Code |
|---|---|---|---|
| Pending | Yellow | ✅ | ⬜ |
| Accepted / Active | Green | ✅ | ⬜ |
| Rejected / Cancelled | Red | ✅ | ⬜ |
| In Progress | Blue | ✅ | ⬜ |
| Neutral | Gray | ⬜ To be designed | — |

**Props**: `status: 'pending' | 'accepted' | 'rejected' | 'in-progress' | 'neutral'`, `label: string`

---

### 1.4 Avatar / User Image
**Figma component**: `User Image`
**Status**: ✅ Designed

| Variant | Figma | Code |
|---|---|---|
| With photo | ✅ | ⬜ |
| Placeholder (no photo) | ✅ | ⬜ |
| Small (32px) | ⬜ To be designed | — |
| Medium (40px) | ⬜ To be designed | — |
| Large (56px) | ⬜ To be designed | — |

---

### 1.5 Icon Button
**Figma component**: `Gada_Icon_button`
**Status**: ✅ Designed (single variant)

| Variant | Figma | Code |
|---|---|---|
| Default (outlined circle) | ✅ | ⬜ |
| Primary (filled) | ⬜ To be designed | — |
| Ghost | ⬜ To be designed | — |

---

### 1.6 Divider
**Figma component**: `divider_thin`
**Status**: ✅ Designed

| Variant | Figma | Code |
|---|---|---|
| Thin horizontal | ✅ | ⬜ |
| Inset (with left padding) | ⬜ To be designed | — |

---

### 1.7 Spinner / Loading Indicator
**Status**: ⬜ To be designed

---

### 1.8 Skeleton Loader
**Status**: ⬜ To be designed
**Note**: Must be defined as standard pattern per `docs/figma/figma-mcp-workflow.md § 7.2`.

---

## 2. Molecules

Composed of 2+ atoms.

### 2.1 Form Field (Label + Input + Helper)
**Status**: ⬜ To be designed
**Structure**: `<label>` + `<Input>` + optional `<error or hint text>`

---

### 2.2 Segmented Controls
**Figma component**: `segmented controls` (1 instance)
**Status**: ✅ Designed

| Variant | Figma | Code |
|---|---|---|
| 2 segments | ✅ | ⬜ |
| 3 segments | ⬜ To be designed | — |

---

### 2.3 Level / Worker Rank Indicator
**Figma component**: `level` (2 instances)
**Status**: ✅ Designed
**Note**: Unique to GADA — displays worker skill level/grade.

| Variant | Figma | Code |
|---|---|---|
| Compact (inline) | ✅ | ⬜ |
| Expanded (with label) | ✅ | ⬜ |

---

### 2.4 Notice / Info Banner
**Figma component**: `notice`, `info`
**Status**: ✅ Designed

| Type | Figma | Code |
|---|---|---|
| Info (blue) | ✅ | ⬜ |
| Warning (yellow) | ✅ | ⬜ |
| Error (red) | ⬜ To be designed | — |
| Success (green) | ⬜ To be designed | — |

---

### 2.5 Snackbar / Toast
**Figma component**: `snackbar` (1 instance)
**Status**: ✅ Designed

| Variant | Figma | Code |
|---|---|---|
| Default (with message) | ✅ | ⬜ |
| With action button | ⬜ To be designed | — |

---

### 2.6 Warning Banner
**Figma component**: `warning` (1 instance)
**Status**: ✅ Designed

---

### 2.7 Modal / Dialog
**Status**: ⬜ To be designed
**Required states**: confirm, destructive confirm, informational

---

### 2.8 Bottom Sheet
**Figma component**: `bottom_sheet_close_btn` (present as subcomponent)
**Status**: ⚠️ Partial — close button designed; sheet container not defined
> **To be designed**: full bottom sheet frame with header, handle, scrollable content area

---

### 2.9 Dropdown / Select
**Status**: ⬜ To be designed

---

## 3. Organisms

Feature-level compound components used directly in screens.

### 3.1 Job Card
**Figma component**: `work_pin` (component for map), `bookmark` (subcomponent)
**Status**: ⚠️ Partial — map pin variant present; list card **⬜ To be designed**

| Variant | Figma | Code |
|---|---|---|
| List card (feed) | ⬜ To be designed | — |
| Map pin | ✅ | ⬜ |
| Compact (search result) | ⬜ To be designed | — |

**Required fields**: job title, trade, province, daily wage (VND), work dates, headcount remaining, bookmark action

---

### 3.2 Worker Card
**Status**: ⬜ To be designed
**Required fields**: worker name, photo, trade, level badge, province, experience count, rating (post-MVP)

---

### 3.3 Application Status Row
**Status**: ⬜ To be designed
**Required states**: pending, accepted, rejected, contract pending, contract signed

---

### 3.4 Attendance Row
**Status**: ⬜ To be designed
**Required states**: present, absent, half_day; hours input field

---

### 3.5 Contract Banner
**Figma component**: `doc_visual` (confetti variant present — contract complete celebration)
**Status**: ⚠️ Partial — success state present; action/pending state **⬜ To be designed**

---

### 3.6 Profile Header
**Status**: ⬜ To be designed
**Variants**: Worker profile header, Manager profile header

---

### 3.7 Site Card
**Figma component**: `construct` (component defined)
**Status**: ⚠️ Partial — icon/illustration present; full card **⬜ To be designed**

---

### 3.8 Notification Item
**Figma component**: `bell`, `note` (subcomponents present)
**Status**: ⚠️ Partial — icons present; full list item **⬜ To be designed**

---

### 3.9 Applicant List Item (Manager view)
**Status**: ⬜ To be designed
**Required fields**: worker name, photo, trade, ID verified indicator, experience count, apply date, action buttons (hire/reject)

---

### 3.10 Admin Table Row
**Status**: ⬜ To be designed
**Note**: Admin panel (Laravel Blade) — desktop only. Define as Blade component, not React.

---

## 4. Navigation

### 4.1 App Header / Top Bar
**Figma component**: `header` (6 instances — highest usage)
**Status**: ✅ Designed

| Variant | Figma | Code |
|---|---|---|
| With title + back button | ✅ | ⬜ |
| With title + action icon | ✅ | ⬜ |
| Transparent (over content) | ✅ | ⬜ |
| With notification bell | ✅ | ⬜ |

---

### 4.2 Bottom Navigation Bar — Worker
**Figma component**: `navbar.type01` (3 instances)
**Status**: ✅ Designed

Tabs: Home (`24/home`) · Job List (`24/list`) · _(Worker-specific tab)_ · My Page (`24/person`)

| State | Figma | Code |
|---|---|---|
| Default | ✅ | ⬜ |
| Active tab highlighted | ✅ | ⬜ |
| With notification badge | ⬜ To be designed | — |

---

### 4.3 Bottom Navigation Bar — Manager
**Figma component**: `navbar.type02` (2 instances)
**Status**: ✅ Designed

Tabs: Home · Work Manage (`24/workmanage`) · _(Manager-specific tabs)_

| State | Figma | Code |
|---|---|---|
| Default | ✅ | ⬜ |
| Active tab highlighted | ✅ | ⬜ |

---

### 4.4 Bottom Navigation Bar — Base (type00)
**Figma component**: `navbar.type00` (1 instance)
**Status**: ✅ Designed — base/empty variant

---

### 4.5 Admin Sidebar (Laravel)
**Status**: ⬜ To be designed
**Desktop only.** Nav items: Dashboard · Manager Approvals · Users · Sites · Jobs · Translations

---

## 5. Feedback Components

### 5.1 Snackbar — see 2.5

### 5.2 Notice Banner — see 2.4

### 5.3 Empty State
**Status**: ⬜ To be designed
**Required per screen**: Job feed empty, Application list empty, Attendance list empty, Notification list empty
> Per workflow rules: **blocks implementation** — must be designed before engineer can build the screen.

### 5.4 Error State (full-page)
**Status**: ⬜ To be designed
**Types**: API error, network offline, 404, 403

### 5.5 Loading / Skeleton State
**Status**: ⬜ To be designed (shared pattern)

---

## 6. Layout Shells

### 6.1 Android Status Bar
**Figma component**: `aos/status bar` (6 instances)
**Status**: ✅ Designed

### 6.2 Android Nav Bar
**Figma component**: `aos/nav bar` (1 instance)
**Status**: ✅ Designed

### 6.3 Page Scroll Container
**Status**: ⬜ To be designed
**Note**: Standard wrapper for scrollable screen content with bottom nav clearance.

---

## 7. Illustrations / Visuals

| Name | Figma | Code | Notes |
|---|---|---|---|
| `doc_visual/confetti` | ✅ | ⬜ | Contract signed celebration |
| `gada_logo` | ✅ | ⬜ | Main app logo |
| `Gada_Icon` | ✅ | ⬜ | App icon / favicon |
| `worker` illustration | ✅ | ⬜ | Worker character graphic |
| `emoji` set | ✅ | ⬜ | Status/feedback emojis |
| `addjob` illustration | ✅ | ⬜ | Add job CTA visual |
| `pin` (map) | ✅ | ⬜ | Map location pin |
| Empty state illustrations | ⬜ To be designed | — | Per-screen empty states |

---

## 8. `packages/ui` Implementation Order (Suggested)

Implement in this sequence to unblock screen development:

1. **Tokens setup** — `tokens.json` → Tailwind config (prerequisite for all)
2. **Icon system** — SVG sprite or component wrapper for 16px + 24px sets
3. **Input** — `input_tobe` variants (blocks all forms)
4. **Button** — all variants including loading (blocks all CTAs)
5. **Badge** — status chip (blocks job cards, application lists)
6. **Header** — top app bar (blocks all screens)
7. **Bottom Nav** — type01 (worker) + type02 (manager) (blocks navigation)
8. **Job Card** — list + map pin (blocks job feed)
9. **Skeleton** — standard pattern (blocks all loading states)
10. **Notice / Snackbar** — feedback (blocks form submission flows)
11. **Avatar** + **Level** — (blocks worker profile, applicant list)
12. **Bottom Sheet** — (blocks attendance, filter panels)
13. Remaining organisms (Worker Card, Application Row, Attendance Row, Contract Banner)
