# Design Tokens — GADA VN

**Source**: Figma file `l9T36IlqSYGhGxAiRseRV7` — page `01. Style`
**Token file**: `packages/ui/tokens.json`
**Architecture**: Material Design 3 (MD3) semantic token system
**Last extracted**: 2026-03-21

---

## Token Architecture

```
Figma palette (primitives)
        │
        ▼
color.blue.40, color.neutral.10, ...     ← raw scales in tokens.json
        │
        ▼
theme.primary, theme.onSurface, ...      ← semantic roles (use these in components)
        │
        ▼
Tailwind config / CSS variables          ← implementation layer
```

**Rule**: Components use semantic theme tokens. Never reference palette primitives (e.g., `color.blue.40`) directly in component code.

---

## 1. Color Palette (Primitives)

All palettes run from 0 (black) to 100 (white).

### Blue — Primary (`B`)
> Main brand color. Represents the company/manager side (신뢰 — trust).
> In attendance flow: "in progress" stage.

| Scale | Hex | Usage note |
|---|---|---|
| B-10 | `#072857` | Dark text on light primary containers |
| B-20 | `#07397E` | |
| B-30 | `#0454C5` | |
| **B-40** | **`#0669F7`** | **Primary — main interactive color** |
| B-50 | `#3186FF` | |
| B-60 | `#539AFF` | |
| B-70 | `#82B4FB` | Inverse primary |
| B-80 | `#A3C8FF` | |
| B-90 | `#C1DAFF` | Primary container background |
| B-95 | `#E3EFFF` | |
| B-99 | `#F5F9FF` | |
| B-100 | `#FFFFFF` | On Primary text |

### Yellow — Secondary (`Y`)
> Represents workers (따뜻함 — warmth). **Do not use as text color** — fails WCAG contrast.
> In attendance flow: "post-work" stage.

| Scale | Hex | Usage note |
|---|---|---|
| Y-10 | `#3C2C02` | Dark text on yellow containers |
| Y-30 | `#DCA302` | |
| **Y-40** | **`#FDBC08`** | **Secondary** |
| Y-50/60 | `#FFC72C` | Brand gradient anchor |
| Y-70 | `#FFDB73` | |
| Y-90 | `#FCECBB` | Secondary container |
| Y-95 | `#FDF6E0` | |

### Green — Tertiary / Success (`G`)
> Completion feedback. In attendance flow: "pre-work" stage.

| Scale | Hex | Usage note |
|---|---|---|
| G-10 | `#024209` | Dark text on green containers |
| **G-40** | **`#00C800`** | **Tertiary — success state** |
| G-50 | `#5BD858` | |
| G-80 | `#B2EBB8` | |
| G-90 | `#D1F3D3` | Tertiary container |
| G-95 | `#E8F8E9` | |

### Red — Error (`R`)
> Error and warning states. Badge color. In attendance flow: "cancelled" stage.

| Scale | Hex | Usage note |
|---|---|---|
| R-10 | `#540C0E` | Dark text on error containers |
| **R-40** | **`#ED1C24`** | **Error** |
| R-50 | `#EE3B4F` | |
| R-80 | `#FFC4CB` | |
| R-90 | `#FFDCE0` | Error container |
| R-95 | `#FFEFF1` | |

### Orange — Event (`O`)
> Used when promotions or events are active.

| Scale | Hex |
|---|---|
| **O-40** | **`#FF460D`** |
| O-50 | `#FF7205` |
| O-60 | `#FF8B32` |
| O-70 | `#FFA762` |

### Neutral (`N`)
> Surfaces, text, borders. **N-70 is the standard disabled color.**

| Scale | Hex | Usage note |
|---|---|---|
| N-0 | `#000000` | Shadow |
| N-10 | `#25282A` | Primary text (On Surface) |
| N-20 | `#353535` | |
| N-30 | `#474747` | |
| N-40 | `#595959` | |
| N-50 | `#7A7B7A` | Secondary text (On Surface Variant) |
| N-60 | `#8E8E8E` | |
| **N-70** | **`#B2B2B2`** | **Disabled state** |
| N-80 | `#C4C4C4` | Surface Container Highest |
| N-90 | `#DDDDDD` | Outline, Surface Container High |
| N-95 | `#F2F2F2` | Surface Container |
| N-99 | `#F8F8FA` | Surface Dim, Surface Container Low |
| N-100 | `#FFFFFF` | Surface, On Primary |

### Neutral Variant (`NV`)
> Primarily for surface backgrounds with subtle blue-gray tint.

| Scale | Hex |
|---|---|
| NV-10 | `#161D25` |
| NV-20 | `#233040` |
| NV-30 | `#444F5D` |
| NV-40 | `#657181` |
| NV-50 | `#7E8A99` |
| NV-60 | `#ADBAC8` |
| NV-70 | `#C3CEDA` |
| NV-80 | `#D6DCE5` |
| NV-90 | `#DEE3EC` |
| NV-95 | `#EEF1F6` |
| NV-99 | `#F5F7FB` |

### Layer — Transparent Overlays
> Used for floating panels, hover states, press feedback. **Black-80 for modal backdrop.**

| Token | Value |
|---|---|
| `layer.black80` | `rgba(0,0,0,0.80)` — modal scrim |
| `layer.black30` | `rgba(0,0,0,0.30)` — Scrim overlay |
| `layer.black16` | `rgba(0,0,0,0.16)` — hover overlay |
| `layer.black8` | `rgba(0,0,0,0.08)` — press / ripple |
| `layer.white80` | `rgba(255,255,255,0.80)` |
| `layer.white16` | `rgba(255,255,255,0.16)` |
| `layer.primary8` | `rgba(6,105,247,0.08)` — primary hover |
| `layer.primary16` | `rgba(6,105,247,0.16)` — primary press |

### GADA Brand Gradient
> Symbolizes co-existence and connection of workers and companies.

```css
background: linear-gradient(135deg, #FFC72C, #0669F7, #2BA170, #0A5ED6);
```

---

## 2. Semantic Theme Tokens

Use these names in all component code. They map to the palette above.

| Token | Palette ref | Hex | Use case |
|---|---|---|---|
| `theme.primary` | B-40 | `#0669F7` | Buttons, links, active states |
| `theme.onPrimary` | B-100 | `#FFFFFF` | Text/icons on primary background |
| `theme.primaryContainer` | B-90 | `#C1DAFF` | Tinted backgrounds (chips, banners) |
| `theme.onPrimaryContainer` | B-10 | `#072857` | Text on primary container |
| `theme.secondary` | Y-40 | `#FDBC08` | Secondary actions, worker badges |
| `theme.onSecondary` | Y-10 | `#3C2C02` | Text on secondary |
| `theme.secondaryContainer` | Y-90 | `#FCECBB` | Worker role highlights |
| `theme.tertiary` | G-40 | `#00C800` | Success states, completed status |
| `theme.onTertiary` | G-100 | `#FFFFFF` | Text on success bg |
| `theme.tertiaryContainer` | G-90 | `#D1F3D3` | Success container bg |
| `theme.error` | R-40 | `#ED1C24` | Error messages, rejection badges |
| `theme.onError` | R-100 | `#FFFFFF` | Text on error bg |
| `theme.errorContainer` | R-90 | `#FFDCE0` | Error banner bg |
| `theme.surface` | N-100 | `#FFFFFF` | Page/card background |
| `theme.surfaceDim` | N-99 | `#F8F8FA` | Slightly dimmed surface |
| `theme.surfaceContainer` | N-95 | `#F2F2F2` | List item background |
| `theme.surfaceContainerHigh` | N-90 | `#DDDDDD` | Dividers, pressed states |
| `theme.onSurface` | N-10 | `#25282A` | Primary text |
| `theme.onSurfaceVariant` | N-50 | `#7A7B7A` | Secondary text, placeholders |
| `theme.outline` | N-90 | `#DDDDDD` | Input borders, dividers |
| `theme.shadow` | N-0 | `#000000` | Box shadow |
| `theme.scrim` | layer.black30 | `rgba(0,0,0,0.30)` | Modal scrim |
| `theme.inversePrimary` | B-70 | `#82B4FB` | Text on dark/inverted surfaces |

**WCAG note**: For Yellow (Y-40) and Green (G-40) as backgrounds, use Y-10 / G-10 as text/icon color.

---

## 3. Typography

Font stack: **Noto Sans KR** (Korean default) → **Noto Sans** (Vietnamese, English fallback).
All sizes in `px`. Line heights in `px`.

### Headline (large display text)

| Name | Size | Line-height | Weight | CSS token |
|---|---|---|---|---|
| Headline 01 Medium | 32 | 40 | 500 | `text-h1-medium` |
| Headline 01 Bold | 32 | 40 | 700 | `text-h1-bold` |
| Headline 02 Medium | 28 | 35 | 500 | `text-h2-medium` |
| Headline 02 Bold | 28 | 35 | 700 | `text-h2-bold` |
| Headline 03 Medium | 24 | 30 | 500 | `text-h3-medium` |
| Headline 03 Bold | 24 | 30 | 700 | `text-h3-bold` |

### Title (section headings)

| Name | Size | Line-height | Weight | CSS token |
|---|---|---|---|---|
| Title 01 Bold | 20 | 25 | 700 | `text-t1-bold` |
| Title 02 Bold | 18 | 23 | 700 | `text-t2-bold` |
| Title 03 Medium | 16 | 20 | 500 | `text-t3-medium` |
| Title 03 Bold | 16 | 20 | 700 | `text-t3-bold` |
| Title 04 Medium | 14 | 18 | 500 | `text-t4-medium` |
| Title 04 Bold | 14 | 18 | 700 | `text-t4-bold` |

### Paragraph (body text)

| Name | Size | Line-height | Weight | Note |
|---|---|---|---|---|
| Paragraph 01 | 18 | 26 | 400 | 바디 텍스트 기본 — default body |
| Paragraph 02 | 16 | 24 | 400 | |
| Paragraph 02 Underline | 16 | 24 | 400 | text-decoration: underline |
| Paragraph 03 | 14 | 20 | 400 | 서브 텍스트 |
| Paragraph 04 | 13 | 18 | 400 | 서브 텍스트 |
| Paragraph 05 | 11 | 16 | 400 | 서브 텍스트 (smallest) |

### Button (interactive labels)

| Name | Size | Line-height | Weight |
|---|---|---|---|
| Button 01 Medium | 20 | 20 | 500 |
| Button 01 Bold | 20 | 20 | 700 |
| Button 02 Medium/Bold | 18 | 18 | 500/700 |
| Button 03 Medium/Bold | 16 | 16 | 500/700 |
| Button 04 Medium/Bold | 14 | 14 | 500/700 |
| Button 05 Medium/Bold | 12 | 12 | 500/700 |

**Vietnamese note**: Vietnamese text can run ~40% longer than Korean. Test all button labels and badges with Vietnamese strings.

---

## 4. Spacing Scale

Base unit: **4px**. Use only these values for all spacing (margin, padding, gap).

| Token | px | Tailwind equivalent |
|---|---|---|
| `spacing.4` | 4px | `p-1` / `m-1` |
| `spacing.8` | 8px | `p-2` / `m-2` |
| `spacing.12` | 12px | `p-3` / `m-3` |
| `spacing.16` | 16px | `p-4` / `m-4` |
| `spacing.20` | 20px | `p-5` / `m-5` |
| `spacing.24` | 24px | `p-6` / `m-6` |
| `spacing.32` | 32px | `p-8` / `m-8` |
| `spacing.40` | 40px | `p-10` / `m-10` |
| `spacing.48` | 48px | `p-12` / `m-12` |
| `spacing.56` | 56px | `p-14` / `m-14` |
| `spacing.64` | 64px | `p-16` / `m-16` |

---

## 5. Layout Grid

| Property | Value | Note |
|---|---|---|
| Page margin (default) | 24px | Standard left/right margin |
| Page margin (compact) | 16px | Used in some screens |
| Column gutter | 16px | Between grid columns |
| Columns | 4 or 3 | 4-col and 3-col grids both used |
| Min viewport | 320px | Minimum supported width |
| Max viewport | 480px | Maximum (no wider layout needed) |
| Touch target | 44px | Minimum recommended for interactive elements |

---

## 6. Border Radius

Only **two** radius values are used across the entire product.

| Token | Value | Where |
|---|---|---|
| `radius.sm` | `4px` | Inputs, cards, standard buttons |
| `radius.full` | `24px` | Pill chips, rounded CTA buttons, FABs |

---

## 7. Icon System

Two size classes. All icons are outlined, not filled.

| Size | Token | Stroke | Where |
|---|---|---|---|
| 16px | `icon.size16` | 1.5pt | Inline with text, within labels, small badges |
| 24px | `icon.size24` | 2pt | Standard action icons, navigation, buttons |
| 32px | `icon.size32` | — | Large decorative / empty state illustrations |

### 16px Icon Set
`heart` · `arrow` · `help` · `camera` · `doc` · `location` · `person` · `clock` · `thumb` · `coin` · `reset` · `tick` · `bell` · `pencil` · `bin` · `calendar` · `call` · `link` · `magnifier` · `gps` · `map`

### 24px Icon Set
`bell` · `home` · `list` · `coin` · `person` · `check` · `heart` · `back_close` · `workmanage` · `star` · `call` · `bookmark` · `calendar` · `min_max` · `inversion` · `key` · `dots` · `arrow` · `gear` · `magnifier` · `msg` · `tool` · `nodes` · `map` · `truck` · `plus` · `info` · `folder` · `camera` · `location` · `refresh` · `reset` · `gallery` · `mic` · `delete` · `error` · `warning` · `download` · `crop` · `gps` · `tick` · `filter` · `user_plus` · `call_plus` · `scrolldown`
White variants available for icons on dark backgrounds: `bell` · `back_close` · `arrow` · `gear` · `call`

---

## 8. Elevation

Elevation is defined in the Figma `Styles / Elevation` section. Specific shadow values require `get_design_context` on node `1:1247` when MCP quota renews. In the interim:

| Level | CSS approximation | Use case |
|---|---|---|
| 0 | `none` | Flat surfaces, cards on same-level bg |
| 1 | `0 1px 2px rgba(0,0,0,0.12)` | Cards, input fields |
| 2 | `0 2px 6px rgba(0,0,0,0.14)` | Floating cards, dropdowns |
| 3 | `0 4px 12px rgba(0,0,0,0.16)` | Bottom sheets, modals |
| 4 | `0 8px 24px rgba(0,0,0,0.18)` | Dialogs, overlays |

> **TODO**: Replace approximations with exact Figma values once MCP quota resets.
