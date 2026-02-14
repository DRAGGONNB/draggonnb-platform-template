'use client'

import { useEffect } from 'react'
import { generateColorScale } from '@/lib/styles/theme-generator'

export function BrandThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const primaryColor = process.env.NEXT_PUBLIC_BRAND_PRIMARY
    const secondaryColor = process.env.NEXT_PUBLIC_BRAND_SECONDARY
    const brandName = process.env.NEXT_PUBLIC_BRAND_NAME
    const brandLogo = process.env.NEXT_PUBLIC_BRAND_LOGO

    if (!primaryColor) return

    const scale = generateColorScale(primaryColor, secondaryColor || undefined)
    const root = document.documentElement

    root.style.setProperty('--brand-primary', scale.primary)
    root.style.setProperty('--brand-primary-light', scale.primaryLight)
    root.style.setProperty('--brand-primary-dark', scale.primaryDark)
    root.style.setProperty('--brand-primary-subtle', scale.primarySubtle)
    root.style.setProperty('--brand-secondary', scale.secondary)

    if (brandName) {
      document.title = brandName
      root.dataset.brandName = brandName
    }
    if (brandLogo) {
      root.dataset.brandLogo = brandLogo
    }
  }, [])

  return <>{children}</>
}
