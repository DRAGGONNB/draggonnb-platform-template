/**
 * Color Palette
 * Programmatic access to design system colors
 * Uses HSL format for consistency with CSS variables
 */

export const colors = {
  // Base colors
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',

  // Card
  card: {
    DEFAULT: 'hsl(var(--card))',
    foreground: 'hsl(var(--card-foreground))',
  },

  // Popover
  popover: {
    DEFAULT: 'hsl(var(--popover))',
    foreground: 'hsl(var(--popover-foreground))',
  },

  // Primary (Brand Blue)
  primary: {
    DEFAULT: 'hsl(var(--primary))',
    foreground: 'hsl(var(--primary-foreground))',
    50: 'hsl(var(--primary-50))',
    100: 'hsl(var(--primary-100))',
    200: 'hsl(var(--primary-200))',
    300: 'hsl(var(--primary-300))',
    400: 'hsl(var(--primary-400))',
    500: 'hsl(var(--primary-500))',
    600: 'hsl(var(--primary-600))',
    700: 'hsl(var(--primary-700))',
    800: 'hsl(var(--primary-800))',
    900: 'hsl(var(--primary-900))',
  },

  // Secondary (Neutral Gray)
  secondary: {
    DEFAULT: 'hsl(var(--secondary))',
    foreground: 'hsl(var(--secondary-foreground))',
    50: 'hsl(var(--secondary-50))',
    100: 'hsl(var(--secondary-100))',
    200: 'hsl(var(--secondary-200))',
    300: 'hsl(var(--secondary-300))',
    400: 'hsl(var(--secondary-400))',
    500: 'hsl(var(--secondary-500))',
    600: 'hsl(var(--secondary-600))',
    700: 'hsl(var(--secondary-700))',
    800: 'hsl(var(--secondary-800))',
    900: 'hsl(var(--secondary-900))',
  },

  // Success (Green)
  success: {
    DEFAULT: 'hsl(var(--success))',
    foreground: 'hsl(var(--success-foreground))',
    50: 'hsl(var(--success-50))',
    100: 'hsl(var(--success-100))',
    200: 'hsl(var(--success-200))',
    300: 'hsl(var(--success-300))',
    400: 'hsl(var(--success-400))',
    500: 'hsl(var(--success-500))',
    600: 'hsl(var(--success-600))',
    700: 'hsl(var(--success-700))',
    800: 'hsl(var(--success-800))',
    900: 'hsl(var(--success-900))',
  },

  // Warning (Amber)
  warning: {
    DEFAULT: 'hsl(var(--warning))',
    foreground: 'hsl(var(--warning-foreground))',
    50: 'hsl(var(--warning-50))',
    100: 'hsl(var(--warning-100))',
    200: 'hsl(var(--warning-200))',
    300: 'hsl(var(--warning-300))',
    400: 'hsl(var(--warning-400))',
    500: 'hsl(var(--warning-500))',
    600: 'hsl(var(--warning-600))',
    700: 'hsl(var(--warning-700))',
    800: 'hsl(var(--warning-800))',
    900: 'hsl(var(--warning-900))',
  },

  // Error/Destructive (Red)
  error: {
    DEFAULT: 'hsl(var(--error))',
    foreground: 'hsl(var(--error-foreground))',
    50: 'hsl(var(--error-50))',
    100: 'hsl(var(--error-100))',
    200: 'hsl(var(--error-200))',
    300: 'hsl(var(--error-300))',
    400: 'hsl(var(--error-400))',
    500: 'hsl(var(--error-500))',
    600: 'hsl(var(--error-600))',
    700: 'hsl(var(--error-700))',
    800: 'hsl(var(--error-800))',
    900: 'hsl(var(--error-900))',
  },

  destructive: {
    DEFAULT: 'hsl(var(--destructive))',
    foreground: 'hsl(var(--destructive-foreground))',
  },

  // Info (Cyan)
  info: {
    DEFAULT: 'hsl(var(--info))',
    foreground: 'hsl(var(--info-foreground))',
    50: 'hsl(var(--info-50))',
    100: 'hsl(var(--info-100))',
    200: 'hsl(var(--info-200))',
    300: 'hsl(var(--info-300))',
    400: 'hsl(var(--info-400))',
    500: 'hsl(var(--info-500))',
    600: 'hsl(var(--info-600))',
    700: 'hsl(var(--info-700))',
    800: 'hsl(var(--info-800))',
    900: 'hsl(var(--info-900))',
  },

  // Muted
  muted: {
    DEFAULT: 'hsl(var(--muted))',
    foreground: 'hsl(var(--muted-foreground))',
  },

  // Accent
  accent: {
    DEFAULT: 'hsl(var(--accent))',
    foreground: 'hsl(var(--accent-foreground))',
  },

  // Border & Input
  border: 'hsl(var(--border))',
  input: 'hsl(var(--input))',
  ring: 'hsl(var(--ring))',
} as const;

// Color variant types for TypeScript autocomplete
export type ColorScale = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export type ColorVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'muted'
  | 'accent';

/**
 * Get color with scale
 * @example getColor('primary', 500) => 'hsl(var(--primary-500))'
 */
export function getColor(variant: ColorVariant, scale?: ColorScale): string {
  if (!scale) {
    return colors[variant].DEFAULT;
  }

  const colorGroup = colors[variant];
  if (typeof colorGroup === 'object' && scale in colorGroup) {
    return (colorGroup as Record<string, string>)[scale];
  }

  return colors[variant].DEFAULT;
}

/**
 * Semantic color mappings for common UI states
 */
export const semantic = {
  // Status colors
  status: {
    active: colors.success.DEFAULT,
    inactive: colors.secondary[400],
    pending: colors.warning.DEFAULT,
    error: colors.error.DEFAULT,
    info: colors.info.DEFAULT,
  },

  // Text colors
  text: {
    primary: colors.foreground,
    secondary: colors.muted.foreground,
    disabled: colors.secondary[400],
    inverse: colors.background,
  },

  // Background colors
  bg: {
    primary: colors.background,
    secondary: colors.secondary[50],
    tertiary: colors.secondary[100],
    inverse: colors.foreground,
  },

  // Interactive states
  interactive: {
    hover: colors.secondary[100],
    pressed: colors.secondary[200],
    focus: colors.primary[100],
    disabled: colors.secondary[100],
  },
} as const;

export default colors;
