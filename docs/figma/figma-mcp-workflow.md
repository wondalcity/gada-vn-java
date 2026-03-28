# Figma MCP Workflow — GADA VN

**Version**: 0.1
**Status**: Draft
**Last updated**: 2026-03-21

---

## 1. Overview

Figma is the **single source of truth** for all visual design decisions in GADA VN.
Engineers never invent spacing, color, typography, or component structure. If it is not in Figma, it does not ship — or a Figma frame is created first and then reviewed before implementation starts.

The **Figma MCP server** (Model Context Protocol) is the integration that allows Claude Code to read Figma files, extract design context, and generate implementation-ready code directly from the design. This document defines how the team uses this integration.

---

## 2. Project Figma Structure

The Figma workspace is organized as follows. Engineers must know this map before touching any implementation.

```
GADA VN — Master File
├── 🎨 Design System
│   ├── Colors          ← color styles (primitives + semantic)
│   ├── Typography      ← text styles
│   ├── Spacing         ← spacing scale (4px base grid)
│   ├── Elevation       ← shadow tokens
│   └── Icons           ← icon component set
│
├── 📦 Components
│   ├── Atoms           ← Button, Input, Badge, Avatar, Tag, Spinner
│   ├── Molecules       ← Card, FormField, Modal, Toast, ListItem
│   └── Organisms       ← JobCard, WorkerCard, AttendanceRow, ContractBanner
│
├── 📱 Mobile Screens   ← Capacitor shell (maps to apps/web-next + mobile viewport)
│   ├── Auth            ← Login, OTP, Register
│   ├── Worker          ← Home, Job Feed, Job Detail, Apply, My Applications,
│   │                      Profile, ID Upload, Signature, Experience, Notifications
│   └── Manager         ← Manager Home, Site List, Site Detail, Job List,
│                          Applicant List, Attendance, Contract Preview
│
├── 🌐 Web Screens      ← Next.js (desktop + tablet breakpoints)
│   ├── Public          ← Landing, Job Listing /jobs, Job Detail, Province Index,
│   │                      Site Detail
│   └── App             ← Worker Dashboard, Manager Dashboard (logged-in web views)
│
└── 🛠 Admin Screens    ← Laravel admin panel (desktop only)
    ├── Auth            ← Admin Login
    ├── Dashboard       ← Overview stats
    ├── Manager Approvals
    ├── Users
    ├── Sites
    ├── Jobs
    └── Translations
```

**Figma links are stored in** `docs/figma/links.md` (not in this document — links change, structure does not).

---

## 3. How Figma MCP Works

The Figma MCP server exposes Figma file content as structured data that Claude Code can read and act on. The key tools:

| MCP Tool | What it returns | When to use |
|---|---|---|
| `get_design_context(fileKey, nodeId)` | Component tree, styles, code hints, screenshot | Primary tool — use before implementing any screen or component |
| `get_screenshot(fileKey, nodeId)` | PNG of the selected frame | Use for visual comparison during QA review |
| `get_metadata(fileKey)` | File name, pages, last modified | Use to check if design has been updated since last implementation |
| `get_variable_defs(fileKey)` | Design tokens (colors, spacing, etc.) | Use when setting up or updating `packages/config/tokens` |

### How to get `fileKey` and `nodeId`

From any Figma URL:
```
https://www.figma.com/design/{fileKey}/{fileName}?node-id={nodeId}
```
- `fileKey` — the alphanumeric string after `/design/`
- `nodeId` — the `node-id` query param; replace `-` with `:` when passing to MCP tools

---

## 4. Implementation Workflow (Screen-by-Screen)

This is the required sequence for implementing any screen. Do not skip steps.

### Step 1 — Get design context before writing any code

```bash
# In Claude Code, before implementing a screen:
# Share the Figma URL or node ID and run:
get_design_context(fileKey="...", nodeId="...")
```

Read the returned output fully:
- Component tree hierarchy
- All applied styles (color, font, spacing)
- Any Code Connect mappings (if set up)
- Annotations from the designer

### Step 2 — Map Figma nodes to code

Use the mapping rules in Section 5. Identify which nodes are:
- Already implemented components in `packages/ui`
- New components that need to be built
- One-off layout compositions (assemble from existing components, no new component needed)

### Step 3 — Implement

- Use `packages/ui` components wherever they exist.
- Do not hardcode design tokens — use CSS variables or Tailwind tokens that map to the design system (see Section 6).
- For new components: build in `packages/ui`, not inside `apps/web-next` directly, unless the component is strictly app-specific and will never be reused.

### Step 4 — Visual check

After implementation, run `get_screenshot` on the Figma frame and compare against your rendered output side-by-side.
Use the Design Review Checklist (`docs/figma/design-review-checklist.md`) to pass each screen before it is marked done.

### Step 5 — Mark implementation status

Update the screen's implementation status in `docs/figma/links.md`:

| Status | Meaning |
|---|---|
| `not-started` | No implementation begun |
| `in-progress` | Being built; do not review yet |
| `built` | Implementation complete; pending QR review |
| `approved` | Passed design review checklist |
| `deferred` | Screen is post-MVP; skip |

---

## 5. Figma Node → Code Mapping Rules

### 5.1 Component Mapping

| Figma node type | Code output |
|---|---|
| Component Set (variants) | `packages/ui` React component with props matching variant names |
| Component (single, reused 3+ times) | `packages/ui` React component |
| Component (single, used once) | Inline JSX in the parent screen; no new component |
| Frame (screen-level) | Next.js page (`app/[locale]/...`) or admin Blade view |
| Frame (section within screen) | React section or layout wrapper — not exported as standalone component |
| Auto Layout frame | `<div>` with `flex` or `grid`; spacing from design token |
| Instance | Use the mapped `packages/ui` component; pass variant as props |

### 5.2 Naming Convention

Figma component names map directly to code names. The Figma name is the source; code must follow.

| Figma name | React component | Tailwind class prefix |
|---|---|---|
| `Button/Primary/Large` | `<Button variant="primary" size="lg">` | — |
| `JobCard/Default` | `<JobCard>` | — |
| `Badge/Status/Pending` | `<Badge status="pending">` | — |
| `FormField/Input/Error` | `<FormField error>` → `<Input>` inside | — |

**Rule**: If a Figma component name changes, the prop value or component name changes in code on the same PR. Never let them drift.

### 5.3 Variant → Prop Mapping

Figma variant properties become React props. Name them identically (camelCase the Figma label).

```
Figma variant: Size = [Small, Medium, Large]
→ React prop:  size: 'sm' | 'md' | 'lg'

Figma variant: State = [Default, Hover, Disabled, Loading]
→ React prop:  disabled?: boolean  +  loading?: boolean
               (Hover is CSS :hover — not a prop)

Figma variant: Type = [Primary, Secondary, Ghost, Destructive]
→ React prop:  variant: 'primary' | 'secondary' | 'ghost' | 'destructive'
```

### 5.4 Admin UI Mapping (Laravel)

The admin panel (`apps/admin-laravel`) does not use `packages/ui` (PHP, not React). Admin screens map as follows:

| Figma node | Admin output |
|---|---|
| Admin screen frame | Blade view in `resources/views/admin/` |
| Table component | `<x-table>` Blade component in `resources/views/components/` |
| Form | `<x-form>` Blade component |
| Status badge | `<x-badge>` Blade component with Tailwind classes matching web-next tokens |

**Admin styling rule**: Admin uses the same Tailwind config as `packages/config/tailwind`. Token names (colors, spacing) must be identical to `packages/ui`. Only layout and interactivity differ (Alpine.js vs React).

---

## 6. Design Token Rules

Figma design tokens map to `packages/config/tokens.css` (CSS custom properties) and `packages/config/tailwind.config.ts`.

### 6.1 Token Hierarchy

```
Figma primitive  →  CSS variable  →  Tailwind token
─────────────────────────────────────────────────────
Colors/Blue/500  →  --color-blue-500  →  blue-500
Colors/Primary   →  --color-primary   →  primary         (semantic)
Spacing/4        →  (not a variable)  →  Tailwind p-4    (use directly)
Typography/Body  →  (not a variable)  →  Tailwind prose  (or custom class)
```

### 6.2 Rules

1. **Never hardcode hex values** in JSX, Blade, or CSS. Always use a Tailwind token or CSS variable.
2. **Never invent token names.** If a color exists in Figma but not in `tokens.css`, add it to `tokens.css` first, then use it.
3. **Semantic tokens over primitive tokens.** Use `bg-primary` not `bg-blue-500`, because the semantic token can be themed.
4. **Spacing must follow the 4px grid.** All spacing values must be multiples of 4px. If Figma uses 6px, raise it with the designer before implementing.

### 6.3 Extracting Tokens from Figma

When the design system is updated in Figma:

```bash
# In Claude Code:
# 1. Fetch updated token definitions
get_variable_defs(fileKey="...")

# 2. Update packages/config/tokens.css with any new/changed variables
# 3. Update packages/config/tailwind.config.ts to expose new tokens
# 4. Run build to verify no broken references
pnpm --filter @gada/ui build
```

---

## 7. Handling Missing Components or States

These situations will occur. Follow the decision tree exactly — do not improvise.

### 7.1 Missing Component in Figma

> The screen references a UI element that does not exist as a named Figma component.

```
Is it used in more than one screen?
    │
    ├── YES → Block implementation.
    │          File a Figma request to the designer:
    │          "Component needed: [name], used in [screens]. Blocking [ticket]."
    │          Do not implement until component exists in Figma.
    │
    └── NO  → Treat as a layout composition.
               Implement inline using existing tokens.
               Add a comment: // TODO: Figma component not yet defined — [date]
               Add to docs/figma/links.md under "Pending Figma Components"
```

### 7.2 Missing State in Figma

> A component exists in Figma but a state (e.g., empty, loading, error, skeleton) is not designed.

| Missing state | Action |
|---|---|
| Loading / skeleton | Use project-standard skeleton pattern (`<Skeleton>` component); no designer input needed |
| Empty state | Block. File Figma request: "Empty state needed for [screen/component]." |
| Error state | Block. File Figma request: "Error state needed for [component]." |
| Disabled state | Implement using 40% opacity on the component + `cursor-not-allowed`; annotate with `// standard disabled pattern` |
| Hover / Focus | Implement using Tailwind `hover:` / `focus-visible:` matching the active state color at 80% intensity; annotate |

### 7.3 Figma Design Differs from PRD

> The Figma frame is inconsistent with `docs/prd/`.

- The Figma frame takes precedence for **visual** decisions (layout, color, spacing).
- The PRD takes precedence for **functional** decisions (which fields are required, what an action does).
- If they conflict on function (e.g., Figma shows a field the PRD doesn't mention), flag in Slack to product lead + designer before implementing.

### 7.4 Figma Frame Is Outdated

> `get_metadata` shows `lastModified` is older than the last PRD update.

- Do not implement from an outdated Figma frame.
- Comment in the ticket: "Figma frame [name / node ID] last modified [date]. PRD updated [date]. Needs design refresh."
- Assign to designer; do not implement until frame is updated.

---

## 8. Breakpoints and Responsive Rules

| Breakpoint | Tailwind prefix | Target |
|---|---|---|
| 0–639px | (default) | Mobile — Capacitor shell primary viewport |
| 640–1023px | `sm:` | Tablet — browser fallback |
| 1024–1279px | `lg:` | Desktop web — web-next authenticated views |
| 1280px+ | `xl:` | Admin panel — admin-laravel |

**Rule**: Every `apps/web-next` screen must be designed in Figma at both mobile (375px) and desktop (1280px) frames. If only one breakpoint is designed, implement for that breakpoint and leave a `// TODO: responsive — [breakpoint] not designed` comment.

The admin panel is **desktop-only** (1280px+). No mobile admin frames exist or are needed in MVP.

---

## 9. Code Connect (Planned, Not Yet Active)

Code Connect links Figma components to their code implementations so that `get_design_context` returns the actual component signature instead of raw CSS.

When a `packages/ui` component is stable (not changing variant structure), register it with Code Connect:

```typescript
// packages/ui/src/components/Button/Button.figma.tsx
import figma from '@figma/code-connect'
import { Button } from './Button'

figma.connect(Button, 'https://www.figma.com/design/...?node-id=...', {
  props: {
    variant: figma.enum('Type', {
      Primary: 'primary',
      Secondary: 'secondary',
      Ghost: 'ghost',
      Destructive: 'destructive',
    }),
    size: figma.enum('Size', {
      Small: 'sm',
      Medium: 'md',
      Large: 'lg',
    }),
    disabled: figma.boolean('Disabled'),
    children: figma.string('Label'),
  },
  example: ({ variant, size, disabled, children }) => (
    <Button variant={variant} size={size} disabled={disabled}>
      {children}
    </Button>
  ),
})
```

Code Connect is registered via the Figma MCP tool `send_code_connect_mappings`. Track registration status in `docs/figma/links.md` alongside screen status.

---

## 10. Roles and Responsibilities

| Role | Figma responsibility |
|---|---|
| Designer | Owns Figma file; defines components, variants, states, tokens; reviews design-review checklist failures |
| UX Engineer | Reads Figma via MCP; implements to spec; flags missing states; maintains `docs/figma/links.md` |
| Frontend Engineer | Implements screens; uses `packages/ui`; does not modify Figma |
| Backend Engineer | No Figma access required; API responses shaped by PRD, not Figma |
| Admin Engineer (Laravel) | References Figma admin screens; extracts Tailwind tokens from shared config |
| QA | Uses `get_screenshot` to compare Figma vs built UI; runs design-review checklist |
