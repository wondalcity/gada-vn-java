# GADA Design System — UX Patterns

Reusable layout and interaction patterns for GADA's operational UI.
Each pattern defines how to handle the same design problem across platforms consistently.

---

## 1. Form

### Usage
Data entry for worker profiles, job postings, site registration, contract signing.

### Desktop
- Max-width: 640px, centered or left-aligned in content column
- Fields: full-width within form column
- Label above input, helper text below
- Section dividers between logical groups
- Primary submit button right-aligned or full-width at bottom
- Inline error messages directly below the invalid field

### Mobile
- Full-width fields, 16px horizontal margin
- Fields stack vertically with 16px gap
- Keyboard-aware layout (scroll to focused field)
- Submit button: full-width, fixed bottom or in-flow at end of form
- Error summary at top on submit failure + inline errors per field

### What stays consistent
- Token colors for states (focused: blue, error: red)
- Label-above-input layout (never floating labels)
- Error message format: icon + text-[#ED1C24] below field
- Field min-height: 48px
- Button label and placement semantics

---

## 2. Card / List

### Usage
Job listings, worker profiles, application history, site cards, hire records.

### Desktop
- Grid: 2–3 columns, 16px gutter
- Card: Elevated with p-6, max content inside card
- Hover: subtle shadow intensify or border color change
- Click navigates to detail page

### Mobile
- Single column list of Outlined cards, p-4
- Press feedback: scale-[0.98] (press-effect)
- Swipe actions optional for quick actions (withdraw, delete)
- Infinite scroll or pagination at bottom

### What stays consistent
- Card structure: title → subtitle → key metric → status tag
- Status tag position: top-right corner
- Primary info hierarchy: job title > site > date > wage
- Empty state: centered icon + message + CTA button
- Loading: skeleton cards (animate-pulse gray bars)

---

## 3. Bottom Sheet / Modal

### Usage
Confirmation dialogs, selection pickers, quick-add forms, action menus.

### Desktop
- Centered modal, max-w-[480px], rounded-2xl
- Backdrop: rgba(0,0,0,0.4)
- Close: X button top-right or ESC key
- Focus trap inside modal
- Scroll within modal if content overflows

### Mobile
- Bottom sheet slides up from bottom
- Handle bar at top for drag-to-dismiss
- Max height: 90vh, scrollable content inside
- Dismiss: swipe down or tap backdrop
- Full-screen variant for complex forms

### What stays consistent
- Backdrop color and opacity
- Title: Title 02
- Primary action button: full-width at bottom
- Cancel/secondary: Outline button or Ghost text
- z-index: 100+ (above all other content)

---

## 4. Popup / Dialog

### Usage
Irreversible action confirmation (withdraw, delete, cancel contract), critical alerts.

### Desktop
- Centered in viewport, max-w-[400px]
- Title + message + 2 action buttons (right-aligned)
- Primary action: danger/confirm (Outline or Primary)
- Secondary: Ghost "취소" button

### Mobile
- Same centered layout (not bottom sheet for confirm dialogs)
- Buttons: stacked full-width OR side-by-side if labels are short
- Avoid on mobile for non-critical decisions — prefer inline confirmation instead

### What stays consistent
- Never block UI with non-critical alerts
- Always provide a cancel path
- Destructive primary: bg-[#ED1C24] not bg-[#0669F7]
- Max one popup visible at a time

---

## 5. Tabs Navigation

### Usage
Filtering application status (전체/대기/수락/거절), switching between view modes, content categories.

### Desktop
- Horizontal tab bar below page header
- Fixed tabs for ≤4 items, scrollable for more
- Tab content loads inline below

### Mobile
- Sticky tab bar below TopAppBar
- Scrollable horizontally when 5+ tabs
- Tab counts shown as badges when relevant
- Swiping content area switches tabs (optional)

### What stays consistent
- Active indicator: 2px border-b in #0669F7
- Active label: text-[#0669F7] font-semibold
- Inactive: text-[#7A7B7A]
- Tab bar border: border-b border-[#EFF1F5]
- Min tab height: 44px

---

## 6. Selection / Filter

### Usage
Trade filter, province filter, status filter, date range on job search.

### Desktop
- Filter chips in a horizontal row below search bar
- Dropdown for multi-select options
- "초기화" (reset) ghost button when any filter active
- Filter state reflected in URL query params

### Mobile
- Filter chips scrollable horizontally (overflow-x-auto)
- "필터" FAB or button opens BottomSheet with all filter options
- Bottom sheet: checklist with "적용" primary button at bottom
- Active filter count badge on filter trigger button

### What stays consistent
- Selected chip: bg-[#0669F7] text-white
- Unselected: border border-[#DDDDDD] text-[#25282A]
- Filter count badge: bg-[#0669F7] text-white number
- Clear all: removes all chips and resets state
- Applied filters always visible as chips (both platforms)

---

## 7. Snackbar / Toast

### Usage
Success confirmation after actions (지원 완료, 저장 완료), error feedback, undo affordance.

### Desktop
- Bottom-center of viewport, min-w-[240px] max-w-[480px]
- Slides up from bottom with fade

### Mobile
- Bottom-center, above tab bar: `bottom-[calc(var(--tab-bar-height)+8px)]`
- Full-width with 16px margin on very small screens

### What stays consistent
- Auto-dismiss: 4000ms (success/info), manual dismiss only (error)
- Success: bg-[#00C800], Error: bg-[#ED1C24], Default: bg-[#25282A]
- Text: text-white text-sm font-medium
- Optional action button: right-aligned, same row
- One snackbar at a time (queue subsequent ones)

---

## 8. Dashboard / Overview

### Usage
Worker home (오늘의 일정, 최근 지원), Manager home (활성 현장, 대기 지원자), Admin overview.

### Desktop
- Grid layout: KPI cards top row (3–4 columns), detail panels below
- KPI card: Elevated, metric number (Headline 02), label (Paragraph 02), trend indicator
- Side panel for recent activity or quick actions
- Date range selector in page header

### Mobile
- Vertical scroll layout
- KPI cards: horizontal scroll row (peek pattern) or stacked
- Section headings with "더보기" links
- Quick action buttons prominent (지원하기, 출근 체크)

### What stays consistent
- KPI number: Headline 02 or 03, text-[#25282A]
- Section heading: Title 02
- "더보기" / "View all" link: text-[#0669F7] text-sm
- Empty sections: inline empty state (no full-page empty)
- Real-time data: show loading skeleton then content

---

## 9. Search / Header

### Usage
Job search, worker search (admin), site/contract search.

### Desktop
- Search bar in GNB or prominent below GNB
- Results appear inline below in a grid
- Filters visible as chips row below search
- Sort dropdown top-right of results

### Mobile
- Search icon in TopAppBar expands to full search input
- OR dedicated search page (tap search → route to /search)
- Results as scrollable list, filter chips below search bar
- Recent searches shown when input is empty

### What stays consistent
- Search input: Outlined TextField with leading search icon
- Clear button (X): appears when input has value
- Results count: text-sm text-[#7A7B7A] "N건의 결과"
- No results state: icon + "검색 결과가 없습니다" + suggestion
- Loading: skeleton list while fetching
- Debounce: 300ms before triggering search API

---

## Cross-Pattern Rules

These apply to every pattern above:

| Concern | Rule |
|---------|------|
| Empty state | Always show icon + message + actionable CTA |
| Loading state | Skeleton placeholders (not spinner for whole page) |
| Error state | Inline error + retry option where possible |
| Touch targets | All interactive elements min 44×44pt |
| Hover effects | Only on desktop; mobile uses press-effect (scale) |
| Animations | ≤150ms for state changes, ≤300ms for transitions |
| Z-index | Consistent layering: content → sticky → modal → snackbar → tooltip |
| Locale | All text via i18n — never hardcode Korean/Vietnamese/English strings |
