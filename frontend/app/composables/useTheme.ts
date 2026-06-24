import { getTemplate } from '~/utils/templates'
import type { ThemeDefaults } from '~/utils/templates'

export function useTheme() {
  const templateId = 'modern-dark' as const
  const template = getTemplate(templateId)
  const isGlass = true
  const isDark = true

  const cssVars = computed<Record<string, string>>(() => {
    const t: ThemeDefaults = template.defaults
    return {
      '--theme-primary': t.primary,
      '--theme-primary-hover': t.primaryHover,
      '--theme-primary-soft': t.primarySoft,
      '--theme-primary-text': t.primaryText,
      '--theme-secondary': t.secondary,
      '--theme-surface': t.surface,
      '--theme-surface-alt': t.surfaceAlt,
      '--theme-surface-elevated': t.surfaceElevated,
      '--theme-border': t.border,
      '--theme-text': t.text,
      '--theme-text-muted': t.textMuted,
      '--theme-text-on-primary': t.textOnPrimary,
      '--theme-nav-bg': t.navBg,
      '--theme-nav-text': t.navText,
      '--theme-glass-bg': t.glassBg,
      '--theme-glass-border': t.glassBorder,
      '--theme-glass-blur': t.glassBlur,
      '--theme-radius': t.radius,
      '--theme-font': t.font,
    }
  })

  return { cssVars, templateId, template, isGlass, isDark }
}
