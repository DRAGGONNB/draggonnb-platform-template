'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold gradient-text">DraggonnB</span>
          <span className="text-sm font-medium text-slate-400">CRMM</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-slate-300 transition-colors hover:text-white">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-slate-300 transition-colors hover:text-white">
            How It Works
          </a>
          <a href="#pricing" className="text-sm text-slate-300 transition-colors hover:text-white">
            Pricing
          </a>
          <Link href="/login" className="text-sm text-slate-300 transition-colors hover:text-white">
            Log In
          </Link>
          <Button asChild size="lg" className="btn-futuristic rounded-lg px-6 py-2 text-sm">
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex items-center justify-center rounded-md p-2 text-slate-300 hover:text-white md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-slate-900/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-4 px-4 py-6">
            <a
              href="#features"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-slate-300 transition-colors hover:text-white"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-slate-300 transition-colors hover:text-white"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileOpen(false)}
              className="text-sm text-slate-300 transition-colors hover:text-white"
            >
              Pricing
            </a>
            <Link
              href="/login"
              className="text-sm text-slate-300 transition-colors hover:text-white"
            >
              Log In
            </Link>
            <Button asChild size="lg" className="btn-futuristic w-full rounded-lg text-sm">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  )
}
