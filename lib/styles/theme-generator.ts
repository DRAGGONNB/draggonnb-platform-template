export interface BrandColorScale {
  primary: string
  primaryLight: string
  primaryDark: string
  primarySubtle: string
  secondary: string
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  let r: number, g: number, b: number

  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16)
    g = parseInt(clean[1] + clean[1], 16)
    b = parseInt(clean[2] + clean[2], 16)
  } else if (clean.length === 6) {
    r = parseInt(clean.slice(0, 2), 16)
    g = parseInt(clean.slice(2, 4), 16)
    b = parseInt(clean.slice(4, 6), 16)
  } else {
    throw new Error(`Invalid hex color: ${hex}`)
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    throw new Error(`Invalid hex color: ${hex}`)
  }

  return { r, g, b }
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  )
}

function mixColors(color1: string, color2: string, weight: number): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  const w = Math.max(0, Math.min(1, weight))

  return rgbToHex(
    c1.r * w + c2.r * (1 - w),
    c1.g * w + c2.g * (1 - w),
    c1.b * w + c2.b * (1 - w)
  )
}

export function generateColorScale(
  primaryHex: string,
  secondaryHex?: string
): BrandColorScale {
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(primaryHex)) {
    throw new Error(`Invalid hex color: ${primaryHex}`)
  }

  return {
    primary: primaryHex,
    primaryLight: mixColors(primaryHex, '#ffffff', 0.7),
    primaryDark: mixColors(primaryHex, '#000000', 0.7),
    primarySubtle: mixColors(primaryHex, '#0a0a0a', 0.1),
    secondary: secondaryHex || '#1E293B',
  }
}

export function generateBrandCSS(scale: BrandColorScale): string {
  return `--brand-primary: ${scale.primary};
    --brand-primary-light: ${scale.primaryLight};
    --brand-primary-dark: ${scale.primaryDark};
    --brand-primary-subtle: ${scale.primarySubtle};
    --brand-secondary: ${scale.secondary};`
}
