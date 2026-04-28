// GADA VN Design System — Mobile Theme
// Source: packages/ui/tokens.json (Figma l9T36IlqSYGhGxAiRseRV7)
// Primary = #0669F7 (blue, MD3 primary role)
// Brand = #FF6B2C (orange, web landing/wages/status display only)

export const Colors = {
  // Primary (Blue — GADA design system MD3 primary)
  primary: '#0669F7',
  primaryDark: '#0454C5',
  primaryLight: '#3186FF',
  primaryContainer: '#C1DAFF',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#072857',

  // Brand (Orange — wages, hero CTA, "모집 중" badge only)
  brand: '#FF6B2C',
  brandDark: '#E54D0D',
  brandLight: '#FF844E',
  brandContainer: '#FFE4D4',

  // Construction (dark hero, aligned with web app)
  constructionDark: '#1A1A2E',
  constructionMid: '#2D2D44',
  constructionLight: '#4A4A6A',

  // Secondary (Yellow Y-40) — worker badges
  secondary: '#FDBC08',
  secondaryContainer: '#FCECBB',
  onSecondary: '#3C2C02',

  // Success (Green G-40)
  success: '#00C800',
  successContainer: '#D1F3D3',
  onSuccess: '#FFFFFF',
  onSuccessContainer: '#024209',

  // Error (Red R-40)
  error: '#ED1C24',
  errorContainer: '#FFDCE0',
  onError: '#FFFFFF',
  onErrorContainer: '#540C0E',

  // Neutral (N scale)
  onSurface: '#25282A',        // N-10 primary text
  onSurfaceVariant: '#7A7B7A', // N-50 secondary text
  disabled: '#B2B2B2',         // N-70
  outline: '#DDDDDD',          // N-90
  surfaceContainer: '#F2F2F2', // N-95
  surfaceDim: '#F8F8FA',       // N-99
  surface: '#FFFFFF',          // N-100

  // Background
  background: '#F5F7FA',       // NV-99

  // Shadows / overlays
  shadowBlack: '#000000',
  overlay80: 'rgba(0,0,0,0.80)',
  overlay30: 'rgba(0,0,0,0.30)',

  // Gradient brand
  gradientStart: '#FFC72C',
  gradientEnd: '#0669F7',
} as const;

export const Radius = {
  xs: 4,
  sm: 4,    // GADA design system: default = 4px
  md: 12,
  lg: 16,
  pill: 24, // GADA design system: pill = 24px
  full: 999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Font = {
  h1: { fontSize: 32, lineHeight: 40, fontWeight: '700' as const },
  h2: { fontSize: 28, lineHeight: 35, fontWeight: '700' as const },
  h3: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
  t1: { fontSize: 20, lineHeight: 25, fontWeight: '700' as const },
  t2: { fontSize: 18, lineHeight: 23, fontWeight: '700' as const },
  t3: { fontSize: 16, lineHeight: 20, fontWeight: '700' as const },
  t4: { fontSize: 14, lineHeight: 18, fontWeight: '700' as const },
  body1: { fontSize: 18, lineHeight: 26, fontWeight: '400' as const },
  body2: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  body3: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
} as const;
