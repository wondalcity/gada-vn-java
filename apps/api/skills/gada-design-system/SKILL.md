---
name: gada-design-system
description: GADA unified cross-platform design system. Operational UI for construction workforce platform. One design language across web, mobile web, and native app. React + Tailwind output. Enforces GADA tokens, components, and UX patterns.
---

# GADA Design System — Cross-Platform UI Skill

## 1. Purpose

This skill governs all UI generation for the GADA platform: a construction workforce and job operations platform serving workers, site managers, and admins.

Every screen, component, and interaction must feel:
- **Practical** — built for daily operational use, not for showcase
- **Structured** — clear hierarchy, scannable at a glance
- **Fast** — minimal cognitive load, direct affordances
- **Trustworthy** — consistent, predictable, reliable
- **Operational** — dashboard-style, not marketing-style

---

## 2. Brand Context

| Token | Value |
|-------|-------|
| Primary | `#0669F7` (GADA Blue) |
| Secondary | `#FFC72C` (Amber) |
| Success | `#00C800` |
| Error | `#ED1C24` |
| Text | `#25282A` (near-black) |
| Subtle text | `#7A7B7A`, `#98A2B2` |
| Border | `#EFF1F5`, `#DDDDDD` |
| Background | `#F2F4F5` (page), `#FFFFFF` (card) |

GADA Blue is the dominant brand signal. Amber is used sparingly for warnings and secondary actions. Never invent colors outside the token set.

---

## 3. Cross-Platform Principle (NON-NEGOTIABLE)

ONE design system. THREE layout adaptations.

| Aspect | Web Desktop | Mobile Web / App |
|--------|-------------|------------------|
| Layout | Grid, sidebar, wide cards | Single column, stacked |
| Navigation | Top GNB + side nav | Bottom tab bar |
| Overlays | Modal dialogs | Bottom sheets |
| Density | Medium (more info visible) | Comfortable (larger tap targets) |
| Tooltips | Hover tooltips | Tap-to-reveal or inline labels |
| FAB | Rarely used | Primary CTA trigger |

**Colors, spacing scale, typography, and component semantics NEVER change between platforms.**

---

## 4. Design Tokens

All values come from `tokens.json`. Never substitute or interpolate.

### Colors
Use semantic aliases, not raw hex in component logic:
- `primary` → #0669F7
- `secondary` → #FFC72C
- `success` → #00C800
- `error` → #ED1C24
- `neutral.100` → #000000
- `neutral.0` → #FFFFFF

### Typography
Scale: Headline 01–03, Title 01–03, Paragraph 01–02, Button 01.
- Headline: page titles, hero labels
- Title: section headers, card titles
- Paragraph: body content, descriptions
- Button: all interactive labels

### Spacing
Base unit: 4px. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64.
- Layout margin: 24px
- Column gutter: 16px
- Never use arbitrary values (e.g., 7px, 13px, 22px)

### Radius
- Small: 4px → `rounded-sm` or `rounded`
- Large: 24px → `rounded-3xl`
- Full: 9999px → `rounded-full`

### Touch
Minimum tap target: 44×44pt. Never make interactive elements smaller.

---

## 5. Component Usage Rules

Always use the canonical component from `components.json`. Do not improvise new component patterns.

### Buttons
- Primary button: main CTA per screen. Maximum one per view.
- Secondary: supporting actions.
- Outline/Ghost: tertiary, destructive alternatives.
- All buttons: min-height 44px, full border-radius for pill shape (`rounded-full`), Bold weight.
- Loading state: spinner inside, disabled pointer.

### Text Fields
- Filled variant: default for forms.
- Outlined: when on colored background.
- Always show label. Error state with red border + error message below.
- Min height: 48px. Padding: 16px horizontal.

### Cards
- Elevated: default content card with shadow.
- Outlined: list items, secondary content.
- Never nest elevated inside elevated.
- Card padding: 16px (mobile), 24px (desktop).

### Bottom Sheets (mobile) / Modals (desktop)
- Selection, confirmation, form flows that don't warrant a new page.
- Desktop: centered modal, max-width 480px.
- Mobile: bottom sheet, 90vh max.

### Tabs
- Fixed tabs: ≤4 items, full-width.
- Scrollable: 5+ items.
- Active state: GADA Blue underline + bold label.

### Chips/Tags
- Status tags: use semantic colors (success/error/warning).
- Filter chips: outline when unselected, filled-primary when active.

### Snackbar
- Bottom of screen, auto-dismiss after 4s.
- Error snackbars: persistent until dismissed.

---

## 6. Responsive Layout Rules

### Breakpoints (Tailwind)
- Mobile: default (< 768px)
- Tablet: `md:` (768px–1023px)
- Desktop: `lg:` (1024px+)
- Wide: `xl:` (1280px+), `2xl:` (1760px max-content-width)

### Grid
- Mobile: 1 column, 16px margin
- Tablet: 2 columns, 24px gutter
- Desktop: 3–4 columns, 24px gutter
- Max content width: 1760px, centered

### Page Structure
```
Desktop:
  [GNB full-width]
  [Sidebar 240px] [Main content flex-1] [Optional panel]

Mobile:
  [TopAppBar]
  [Main content, full-width, scroll]
  [BottomTabBar fixed]
```

### Spacing adaptation
- Mobile: use 16px section padding
- Desktop: use 24–32px section padding
- Never use different spacing values, only different scale steps

---

## 7. Accessibility Rules

- All interactive elements: keyboard focusable, visible focus ring (`ring-2 ring-[#0669F7]`)
- Color is never the sole indicator of state (always add icon or text)
- ARIA labels on icon-only buttons
- Form fields: always associated `<label>` via `htmlFor`
- Contrast: text on white min 4.5:1, large text min 3:1
- Tap targets: minimum 44×44pt even if visually smaller

---

## 8. Output Rules (React + Tailwind)

### Structure
- Functional components, TypeScript
- Props typed with interfaces
- No inline styles except for CSS custom properties (`style={{ '--var': value }}`)
- className with Tailwind only — no CSS modules, no styled-components

### Tailwind Conventions
```tsx
// Colors: use exact hex values for non-standard GADA colors
className="text-[#25282A] bg-[#0669F7] border-[#EFF1F5]"

// Standard Tailwind for spacing/layout:
className="px-4 py-3 rounded-full font-bold text-sm"

// Responsive:
className="px-4 md:px-6 xl:px-20"
```

### Animation
- Use Tailwind `transition-colors`, `transition-all` for state changes
- Duration: 150ms default. Never exceed 300ms for UI transitions.
- `press-effect` class for tap feedback on mobile (scale-down)

### Icons
- Use inline SVG with `currentColor`
- Standard size: w-5 h-5 (20px), w-4 h-4 (16px) for dense UI
- Never use emoji as icons

---

## 9. Strict Prohibitions

- NEVER invent colors outside the token set
- NEVER use arbitrary spacing values (e.g., `mt-[7px]`)
- NEVER create hover-only interactions without mobile alternative
- NEVER use `shadow-lg` or larger — GADA uses subtle shadows only
- NEVER use gradients on interactive elements
- NEVER make tap targets smaller than 44px
- NEVER use separate design logic per platform — adapt layout, not identity
- NEVER add marketing copywriting patterns (hero sections, testimonials, pricing tables) to operational views
- NEVER use emoji in production UI
- NEVER nest modals inside modals

---

## 10. Instruction Priority

When instructions conflict, follow this order:

1. Token values (colors, spacing, radius) — absolute truth
2. Component definitions from `components.json`
3. Cross-platform layout rules
4. Accessibility rules
5. React/Tailwind output conventions
6. This SKILL.md

If a design decision is not covered, default to: **clarity > consistency > novelty**.
