# GADA Design System — Do & Don't

## Principles

The GADA UI is an **operational tool**, not a marketing product.
Every rule below protects usability, consistency, and trust at scale.

---

## Colors

### DO
- Use the exact GADA token colors: `#0669F7`, `#FFC72C`, `#00C800`, `#ED1C24`, `#25282A`, `#7A7B7A`, `#98A2B2`, `#EFF1F5`, `#DDDDDD`, `#F2F4F5`
- Use semantic mappings (`bg-[#EFF1F5]` for borders, `text-[#98A2B2]` for placeholder)
- Use `#ED1C24` exclusively for errors and destructive actions
- Use `#00C800` exclusively for success states

### DON'T
- Invent colors not in the token set (no `#FF6600`, `#7C3AED`, etc.)
- Use `blue-500`, `green-400` Tailwind defaults — always use GADA hex values
- Apply gradients to interactive elements or backgrounds
- Use primary blue on large surface areas (backgrounds, full-page fills)
- Use color as the sole indicator of state — always add text or icon

---

## Typography

### DO
- Use the defined type scale: Headline 01–03, Title 01–03, Paragraph 01–02, Button 01
- Apply Bold for titles, headings, and button labels
- Use `#25282A` for primary text, `#7A7B7A` for secondary, `#98A2B2` for placeholder

### DON'T
- Use arbitrary font sizes (`text-[13px]`, `text-[22px]`)
- Mix more than 2 font weights in a single component
- Use all-caps text in body content (acceptable only in labels/tags)
- Set line-height below the defined scale values

---

## Spacing

### DO
- Use the 4pt spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64
- Layout margin: 24px, gutter: 16px
- Add 24px section padding on desktop, 16px on mobile
- Maintain consistent padding within component type (all cards use same internal padding)

### DON'T
- Use arbitrary spacing (`mt-[7px]`, `px-[11px]`, `gap-[22px]`)
- Reduce touch targets below 44px height/width
- Collapse spacing between items below 8px
- Use margin to compensate for wrong component sizing

---

## Components

### DO
- Use canonical components from `components.json`
- Adapt layout per platform (stacked mobile, grid desktop)
- Use Bottom Sheet on mobile for overlays, Modal on desktop
- Use one Primary Button per screen maximum
- Keep card content scannable: title, subtitle, key metric — no more
- Show loading state on all async actions

### DON'T
- Create new component patterns not in the design system
- Nest Elevated cards inside Elevated cards
- Put more than one Primary button on a screen
- Use hover-only interactions (no `hover:` without equivalent tap behavior)
- Use tooltip on mobile — show inline label or use tap-to-reveal instead
- Use FAB on desktop — use a standard button in the page header
- Create custom checkbox/radio/switch styles — use the canonical selection components

---

## Platform Adaptation

### DO
- Use one unified design language across web, mobile web, and native app
- Adapt layout: single column mobile, grid desktop
- Adapt navigation: bottom tab bar mobile, GNB + sidebar desktop
- Adapt overlays: bottom sheet mobile, modal desktop
- Adapt content density: comfortable on mobile, medium on desktop

### DON'T
- Create a separate visual system for mobile vs desktop
- Change colors, radius, or typography between platforms
- Remove components on mobile — reorganize them
- Assume desktop users won't touch the screen
- Build mobile-first-only and ignore desktop (GADA is used on both)

---

## Interaction & Animation

### DO
- Add `transition-colors` on color state changes (150ms)
- Add `press-effect` class (scale-[0.98]) on tappable cards and buttons
- Animate bottom sheet in: `translate-y-0` from `translate-y-full`
- Auto-dismiss snackbars after 4s (except errors)

### DON'T
- Animate layout shifts (height, width changes) without user intent
- Use transitions longer than 300ms
- Add decorative animations that delay user action
- Use `animate-bounce`, `animate-ping` for non-alerting states

---

## Content & Copy

### DO
- Write operational, direct copy: "지원 취소", "계약 확인", "출근 완료"
- Use numbers and dates clearly: "2026-04-08", "₫700,000"
- Show empty states with actionable guidance
- Keep button labels under 4 words

### DON'T
- Use marketing language: "경험을 혁신하세요", "강력한 기능", "무제한 가능성"
- Use vague status labels: "처리 중" without expected time
- Leave empty states blank — always provide context and a CTA
- Truncate critical information (amounts, names, dates)

---

## Accessibility

### DO
- Add `aria-label` to all icon-only buttons
- Associate all form labels with `htmlFor`/`id`
- Provide visible focus rings: `focus:ring-2 focus:ring-[#0669F7]`
- Maintain minimum 4.5:1 text contrast ratio

### DON'T
- Use placeholder text as a label substitute
- Remove focus styles with `outline-none` without a custom replacement
- Make interactive elements smaller than 44×44pt
- Use `<div onClick>` instead of `<button>` for interactive elements
