export interface ThemeDefaults {
  primary: string
  primaryHover: string
  primarySoft: string
  primaryText: string
  secondary: string
  surface: string
  surfaceAlt: string
  surfaceElevated: string
  border: string
  text: string
  textMuted: string
  textOnPrimary: string
  navBg: string
  navText: string
  glassBg: string
  glassBorder: string
  glassBlur: string
  radius: string
  font: string
}

export interface ColorPreset {
  label: string
  primary: string
  secondary: string
}

export interface BackgroundPreset {
  label: string
  color: string
}

export interface ThemeTemplate {
  id: string
  label: string
  glass: boolean
  defaults: ThemeDefaults
  presets: ColorPreset[]
  backgroundPresets: BackgroundPreset[]
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function lighten(hex: string, amount: number): string {
  const { h, s, l } = hexToHsl(hex)
  return hslToHex(h, s, Math.min(100, l + amount))
}

export function darken(hex: string, amount: number): string {
  const { h, s, l } = hexToHsl(hex)
  return hslToHex(h, s, Math.max(0, l - amount))
}

export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0')
  return `${hex}${a}`
}

export function softTint(hex: string, isDark: boolean): string {
  const { h, s } = hexToHsl(hex)
  return isDark ? hslToHex(h, Math.min(s, 30), 15) : hslToHex(h, Math.min(100, s + 20), 95)
}

export function softText(hex: string, isDark: boolean): string {
  const { h, s } = hexToHsl(hex)
  return isDark ? hslToHex(h, Math.min(80, s), 75) : hslToHex(h, Math.min(80, s), 30)
}

export function derivePrimaryVariants(primary: string, isDark: boolean) {
  return {
    primaryHover: isDark ? lighten(primary, 8) : darken(primary, 8),
    primarySoft: softTint(primary, isDark),
    primaryText: softText(primary, isDark),
  }
}

const lightTemplate: ThemeTemplate = {
  id: 'light',
  label: 'Light',
  glass: false,
  defaults: {
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    primarySoft: '#EFF6FF',
    primaryText: '#1E40AF',
    secondary: '#10B981',
    surface: '#FFFFFF',
    surfaceAlt: '#F9FAFB',
    surfaceElevated: '#FFFFFF',
    border: '#E5E7EB',
    text: '#111827',
    textMuted: '#6B7280',
    textOnPrimary: '#FFFFFF',
    navBg: '#FFFFFF',
    navText: '#6B7280',
    glassBg: '#FFFFFF',
    glassBorder: '#E5E7EB',
    glassBlur: 'none',
    radius: '0.75rem',
    font: 'Inter, system-ui, sans-serif',
  },
  presets: [
    { label: 'Blue', primary: '#3B82F6', secondary: '#10B981' },
    { label: 'Violet', primary: '#8B5CF6', secondary: '#EC4899' },
    { label: 'Emerald', primary: '#10B981', secondary: '#3B82F6' },
    { label: 'Rose', primary: '#F43F5E', secondary: '#8B5CF6' },
    { label: 'Amber', primary: '#F59E0B', secondary: '#EF4444' },
  ],
  backgroundPresets: [
    { label: 'White', color: '#FFFFFF' },
    { label: 'Light Gray', color: '#F9FAFB' },
    { label: 'Warm White', color: '#FEFCE8' },
    { label: 'Cool Gray', color: '#F1F5F9' },
  ],
}

const modernTemplate: ThemeTemplate = {
  id: 'modern',
  label: 'Modern',
  glass: true,
  defaults: {
    primary: '#6366F1',
    primaryHover: '#4F46E5',
    primarySoft: '#EEF2FF',
    primaryText: '#3730A3',
    secondary: '#06B6D4',
    surface: 'rgba(255, 255, 255, 0.55)',
    surfaceAlt: '#F0F4FF',
    surfaceElevated: 'rgba(255, 255, 255, 0.72)',
    border: 'rgba(255, 255, 255, 0.45)',
    text: '#1E293B',
    textMuted: '#64748B',
    textOnPrimary: '#FFFFFF',
    navBg: 'rgba(255, 255, 255, 0.5)',
    navText: '#64748B',
    glassBg: 'rgba(255, 255, 255, 0.35)',
    glassBorder: 'rgba(255, 255, 255, 0.4)',
    glassBlur: 'blur(40px) saturate(1.8)',
    radius: '1.25rem',
    font: 'Inter, system-ui, sans-serif',
  },
  presets: [
    { label: 'Indigo', primary: '#6366F1', secondary: '#06B6D4' },
    { label: 'Violet', primary: '#8B5CF6', secondary: '#EC4899' },
    { label: 'Cyan', primary: '#06B6D4', secondary: '#6366F1' },
    { label: 'Fuchsia', primary: '#D946EF', secondary: '#6366F1' },
    { label: 'Blue', primary: '#3B82F6', secondary: '#10B981' },
  ],
  backgroundPresets: [
    { label: 'White', color: '#FFFFFF' },
    { label: 'Light Gray', color: '#F9FAFB' },
    { label: 'Warm White', color: '#FEFCE8' },
    { label: 'Cool Gray', color: '#F1F5F9' },
  ],
}

const darkTemplate: ThemeTemplate = {
  id: 'dark',
  label: 'Dark',
  glass: false,
  defaults: {
    primary: '#60A5FA',
    primaryHover: '#93C5FD',
    primarySoft: '#1E293B',
    primaryText: '#93C5FD',
    secondary: '#34D399',
    surface: '#1E293B',
    surfaceAlt: '#0F172A',
    surfaceElevated: '#334155',
    border: '#334155',
    text: '#F1F5F9',
    textMuted: '#94A3B8',
    textOnPrimary: '#0F172A',
    navBg: '#1E293B',
    navText: '#94A3B8',
    glassBg: '#1E293B',
    glassBorder: '#334155',
    glassBlur: 'none',
    radius: '0.75rem',
    font: 'Inter, system-ui, sans-serif',
  },
  presets: [
    { label: 'Blue', primary: '#60A5FA', secondary: '#34D399' },
    { label: 'Violet', primary: '#A78BFA', secondary: '#F472B6' },
    { label: 'Emerald', primary: '#34D399', secondary: '#60A5FA' },
    { label: 'Rose', primary: '#FB7185', secondary: '#A78BFA' },
    { label: 'Amber', primary: '#FBBF24', secondary: '#FB923C' },
  ],
  backgroundPresets: [
    { label: 'Dark Gray', color: '#1E293B' },
    { label: 'Night', color: '#0F172A' },
    { label: 'Pure Black', color: '#000000' },
    { label: 'Charcoal', color: '#111827' },
  ],
}

const modernDarkTemplate: ThemeTemplate = {
  id: 'modern-dark',
  label: 'Modern Dark',
  glass: true,
  defaults: {
    primary: '#818CF8',
    primaryHover: '#A5B4FC',
    primarySoft: 'rgba(99, 102, 241, 0.15)',
    primaryText: '#A5B4FC',
    secondary: '#22D3EE',
    surface: 'rgba(30, 41, 59, 0.55)',
    surfaceAlt: '#0F172A',
    surfaceElevated: 'rgba(51, 65, 85, 0.55)',
    border: 'rgba(148, 163, 184, 0.12)',
    text: '#F1F5F9',
    textMuted: '#94A3B8',
    textOnPrimary: '#0F172A',
    navBg: 'rgba(15, 23, 42, 0.55)',
    navText: '#94A3B8',
    glassBg: 'rgba(30, 41, 59, 0.35)',
    glassBorder: 'rgba(148, 163, 184, 0.1)',
    glassBlur: 'blur(40px) saturate(1.8)',
    radius: '1.25rem',
    font: 'Inter, system-ui, sans-serif',
  },
  presets: [
    { label: 'Indigo', primary: '#818CF8', secondary: '#22D3EE' },
    { label: 'Violet', primary: '#A78BFA', secondary: '#F472B6' },
    { label: 'Cyan', primary: '#22D3EE', secondary: '#818CF8' },
    { label: 'Fuchsia', primary: '#E879F9', secondary: '#818CF8' },
    { label: 'Blue', primary: '#60A5FA', secondary: '#34D399' },
  ],
  backgroundPresets: [
    { label: 'Dark Gray', color: '#1E293B' },
    { label: 'Night', color: '#0F172A' },
    { label: 'Pure Black', color: '#000000' },
    { label: 'Charcoal', color: '#111827' },
  ],
}

export const templates: ThemeTemplate[] = [
  lightTemplate,
  modernTemplate,
  darkTemplate,
  modernDarkTemplate,
]

export function getTemplate(id: string): ThemeTemplate {
  return templates.find(t => t.id === id) ?? lightTemplate
}
