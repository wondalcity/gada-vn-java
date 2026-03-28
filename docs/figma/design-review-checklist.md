# Design Review Checklist — GADA VN

**Version**: 0.1
**Status**: Draft
**Last updated**: 2026-03-21

---

## How to Use This Checklist

Run this checklist for every screen before moving its status from `built` to `approved` in `docs/figma/links.md`.

**Who runs it**: QA or the implementing engineer on a screen they did not build.
**Tool required**: Figma MCP `get_screenshot` to pull the reference frame.
**Pass threshold**: All items in sections 1–5 must pass. Section 6 (Admin) is required only for admin screens. Section 7 items are best-effort for MVP — record failures as tech debt tickets, not blockers.

Mark each item: ✓ Pass · ✗ Fail (with note) · N/A (item does not apply to this screen)

---

## Review Header

```
Screen name:
Figma frame node ID:
Figma last modified:
Implementation PR / branch:
Reviewer:
Review date:
Build target: [ ] web-next mobile  [ ] web-next desktop  [ ] admin-laravel
```

---

## Section 1 — Layout & Spacing

| # | Check | Pass | Notes |
|---|---|---|---|
| 1-01 | Overall layout structure matches Figma (column count, section order, sidebars) | | |
| 1-02 | All spacing values are multiples of 4px (check via browser inspector) | | |
| 1-03 | Padding inside each container matches Figma (use `get_design_context` to read exact values) | | |
| 1-04 | Gap between sibling elements matches Figma | | |
| 1-05 | Max-width constraints applied correctly (content does not stretch to full viewport on wide screens) | | |
| 1-06 | Element alignment (left/center/right) matches Figma | | |
| 1-07 | Sticky or fixed elements (header, bottom nav, FAB) behave as designed | | |
| 1-08 | No unintended overflow (horizontal scroll, clipped content) | | |

---

## Section 2 — Typography

| # | Check | Pass | Notes |
|---|---|---|---|
| 2-01 | Font family matches Figma text style (inspect via `get_design_context`) | | |
| 2-02 | Font size matches exactly (px or rem equivalent) | | |
| 2-03 | Font weight matches (400/500/600/700) | | |
| 2-04 | Line height matches | | |
| 2-05 | Letter spacing matches | | |
| 2-06 | Text color uses the correct semantic token (not hardcoded hex) | | |
| 2-07 | Text truncation / ellipsis applied where Figma shows clipped text | | |
| 2-08 | All text is selectable (no `user-select: none` unless Figma specifies) | | |

---

## Section 3 — Color & Elevation

| # | Check | Pass | Notes |
|---|---|---|---|
| 3-01 | Background colors match Figma (use Tailwind token, not raw hex) | | |
| 3-02 | Border colors and border widths match | | |
| 3-03 | Border radius values match exactly | | |
| 3-04 | Shadow / elevation applied where Figma shows it; absent where it does not | | |
| 3-05 | Dividers present where designed; absent where not designed | | |
| 3-06 | Icon colors match the Figma fill color | | |
| 3-07 | Image or avatar placeholder color matches Figma empty state | | |

---

## Section 4 — Components

| # | Check | Pass | Notes |
|---|---|---|---|
| 4-01 | Correct `packages/ui` component used (not a one-off reimplementation) | | |
| 4-02 | Component variant/props match the Figma instance variant | | |
| 4-03 | Button labels match Figma (including case — "Apply Now" ≠ "APPLY NOW") | | |
| 4-04 | Icon used matches Figma icon name exactly | | |
| 4-05 | Badge / tag / status chip text and color match designed values | | |
| 4-06 | Form inputs: label, placeholder, helper text match Figma | | |
| 4-07 | Form inputs: error state renders correctly (error color, error message position) | | |
| 4-08 | Cards: all data fields shown in correct order, matching Figma layout | | |
| 4-09 | Loading / skeleton state visually consistent with app-wide skeleton pattern | | |
| 4-10 | Empty state (no data) renders the correct illustration or message as designed | | |

---

## Section 5 — Interaction & States

| # | Check | Pass | Notes |
|---|---|---|---|
| 5-01 | Default state matches Figma screenshot pixel-for-pixel (within 2px tolerance) | | |
| 5-02 | Hover state: background / text color shift is present and correct | | |
| 5-03 | Focus state: visible focus ring (`focus-visible`) on all interactive elements | | |
| 5-04 | Disabled state: element is visually muted and not interactive | | |
| 5-05 | Active / pressed state: visual feedback present on tap (mobile) | | |
| 5-06 | Loading state: spinner or skeleton shown; underlying content hidden or dimmed | | |
| 5-07 | Error state (API error): error message appears in the correct position | | |
| 5-08 | Success state: success toast or confirmation UI matches Figma | | |
| 5-09 | Modal / bottom sheet: overlay color, z-index, animation direction match Figma | | |
| 5-10 | Scroll behavior: infinite scroll or pagination controls present where designed | | |
| 5-11 | Navigation: back button / breadcrumb present where Figma shows it | | |

---

## Section 6 — Admin Panel Consistency (admin-laravel only)

Run this section only for screens under `apps/admin-laravel`.

| # | Check | Pass | Notes |
|---|---|---|---|
| 6-01 | Tailwind token names are identical to `packages/config/tailwind.config.ts` (same color names, same spacing scale) | | |
| 6-02 | Table headers: column names and order match Figma admin screen | | |
| 6-03 | Table rows: all columns render correct data types (date formatted, VND formatted, boolean as badge) | | |
| 6-04 | Pagination controls present and functional | | |
| 6-05 | Blade component structure mirrors the web-next component hierarchy (same semantic groupings) | | |
| 6-06 | Status badges (pending, approved, rejected) use same color tokens as web-next badges | | |
| 6-07 | Action buttons (Approve, Reject, Deactivate) have correct destructive styling where designed | | |
| 6-08 | Form validation errors appear in same position as web-next forms | | |
| 6-09 | Admin screens are desktop-only (1280px+); no responsive breakpoints below `xl:` required | | |
| 6-10 | S3 presigned document links open in a new tab (not inline download) | | |

---

## Section 7 — i18n & Locale (Best-Effort for MVP)

| # | Check | Pass | Notes |
|---|---|---|---|
| 7-01 | No hardcoded user-visible strings (all text via i18n key) | | |
| 7-02 | Vietnamese (`vi`) locale renders without layout breakage | | |
| 7-03 | English (`en`) locale renders without layout breakage | | |
| 7-04 | Korean (`ko`) locale renders without layout breakage (default) | | |
| 7-05 | Long strings (Vietnamese can be 40% longer than Korean) do not overflow buttons or badges | | |
| 7-06 | Date format matches locale convention (vi: dd/mm/yyyy, ko: yyyy.mm.dd) | | |
| 7-07 | Currency (VND) formatted correctly: integer, thousands separator, no decimal | | |
| 7-08 | RTL not required (all three locales are LTR) | | |

---

## Section 8 — Mobile-Specific (web-next mobile viewport + Capacitor)

Run this section only when the build target is mobile.

| # | Check | Pass | Notes |
|---|---|---|---|
| 8-01 | Screen renders correctly at 375px width (iPhone SE baseline) | | |
| 8-02 | Bottom navigation bar present and correct height (matches Figma) | | |
| 8-03 | Safe area insets applied (iOS notch, home indicator) | | |
| 8-04 | Touch targets ≥ 44×44px on all tappable elements | | |
| 8-05 | Keyboard does not cover active input field (layout shifts up correctly) | | |
| 8-06 | Scroll is native-feeling (no janky momentum on lists) | | |
| 8-07 | No hover-only interactions (hover is not reliable on touch) | | |
| 8-08 | Pull-to-refresh present on list screens that support it | | |
| 8-09 | Image uploads open native camera/gallery picker via Capacitor plugin | | |
| 8-10 | Signature canvas is responsive to device pixel ratio (retina-sharp) | | |

---

## Section 9 — Screenshot Diff Procedure

Use this procedure for every `built → approved` transition.

### Step 1 — Capture Figma reference

```
# In Claude Code:
get_screenshot(fileKey="...", nodeId="...")
# Save output as: docs/figma/screenshots/[screen-name]-figma.png
```

### Step 2 — Capture implementation screenshot

```bash
# In browser (Chrome DevTools):
# 1. Set device to match Figma frame size (e.g., 375×812 for mobile)
# 2. Right-click → Capture full size screenshot
# Save as: docs/figma/screenshots/[screen-name]-built.png
```

### Step 3 — Compare

Compare the two images side-by-side. Accept if:
- Layout structure is pixel-equivalent (±2px on spacing)
- No missing UI elements
- No color deviations beyond token aliasing (e.g., hover state may differ slightly)

Reject if:
- Any text content differs from Figma
- Any component is missing or replaced with a different component
- Spacing deviation > 4px (one grid unit)
- Wrong font weight or size

### Step 4 — Document failures

For each failed check item, file a comment in the PR with:
```
[DR-FAIL] Item {number}: {what was expected} vs {what was implemented}
Figma node: {nodeId}
Fix required before merge: YES / NO (severity: P1 / P2 / P3)
```

---

## Severity Definitions

| Severity | Definition | Merge policy |
|---|---|---|
| P1 | Wrong component, missing feature, broken layout | Block merge |
| P2 | Spacing off by > 4px, wrong color token, missing state | Block merge |
| P3 | Typography weight off by one step, minor alignment drift, missing hover | File tech debt ticket; allow merge |

---

## Missing Component / State Decision Reference

Quick reference for reviewers. Full rules in `docs/figma/figma-mcp-workflow.md § 7`.

| Situation | Reviewer action |
|---|---|
| Component not in `packages/ui` but used in 2+ screens | Fail review; request component extraction before approval |
| Component not in `packages/ui`, used in 1 screen only | Accept if implemented consistently with design tokens |
| Loading state not in Figma | Accept if standard `<Skeleton>` pattern used |
| Empty state not in Figma | Fail review; block until designed |
| Error state not in Figma | Fail review; block until designed |
| Disabled state not in Figma | Accept if standard disabled pattern (40% opacity + `cursor-not-allowed`) |
| Figma frame out of date (older than PRD) | Fail review; block until Figma updated by designer |
| Text string not in i18n file | Fail review (P1); no hardcoded strings allowed |

---

## Approval Sign-Off

Once all P1 and P2 items pass:

```
Reviewed by: ___________________
Date: ___________________
Screen: ___________________
Result: [ ] APPROVED  [ ] REQUIRES CHANGES

P3 tech debt tickets filed: ___________________

Figma links.md updated: [ ] Yes
```
