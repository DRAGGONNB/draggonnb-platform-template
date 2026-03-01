'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useRef, useCallback } from 'react'
import {
  Menu,
  X,
  ChevronDown,
  Calculator,
  Hotel,
  Home,
  Briefcase,
  ShoppingBag,
  HeartPulse,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const industryItems = [
  { icon: Calculator, label: 'Accounting Firms', href: '#industries' },
  { icon: Hotel, label: 'Hospitality', href: '#industries' },
  { icon: Home, label: 'Real Estate', href: '#industries' },
  { icon: Briefcase, label: 'Professional Services', href: '#industries' },
  { icon: ShoppingBag, label: 'Retail', href: '#industries' },
  { icon: HeartPulse, label: 'Healthcare', href: '#industries' },
]

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const openDropdown = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setDropdownOpen(true)
  }, [])

  const closeDropdown = useCallback(() => {
    timeoutRef.current = setTimeout(() => setDropdownOpen(false), 200)
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="DraggonnB" width={36} height={36} className="h-9 w-9" />
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-tight tracking-tight">
              <span className="text-brand-charcoal-500">DRAGGON</span>
              <span className="text-brand-crimson-500">NB</span>
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">
              Operating System
            </span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden items-center gap-8 lg:flex">
          <a href="#modules" className="text-sm text-gray-600 transition-colors hover:text-gray-900">
            Platform
          </a>
          <a href="#how-it-works" className="text-sm text-gray-600 transition-colors hover:text-gray-900">
            How It Works
          </a>

          {/* Industries Dropdown */}
          <div
            className="relative"
            onMouseEnter={openDropdown}
            onMouseLeave={closeDropdown}
          >
            <button
              className="flex items-center gap-1 text-sm text-gray-600 transition-colors hover:text-gray-900"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              Industries
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute left-1/2 top-full pt-2 -translate-x-1/2">
                <div className="w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                  {industryItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <a
                        key={item.label}
                        href={item.href}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 transition-colors hover:bg-brand-crimson-50 hover:text-brand-crimson-700"
                      >
                        <Icon className="h-4 w-4 text-brand-crimson-400" />
                        {item.label}
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <a href="#pricing" className="text-sm text-gray-600 transition-colors hover:text-gray-900">
            Pricing
          </a>
          <Link href="/login" className="text-sm text-gray-600 transition-colors hover:text-gray-900">
            Log In
          </Link>
          <Button asChild className="rounded-lg bg-brand-crimson-500 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-crimson-600">
            <Link href="/qualify">Get Started</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:text-gray-900 lg:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white lg:hidden">
          <div className="flex flex-col gap-4 px-4 py-6">
            <a href="#modules" onClick={() => setMobileOpen(false)} className="text-sm text-gray-600 hover:text-gray-900">
              Platform
            </a>
            <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="text-sm text-gray-600 hover:text-gray-900">
              How It Works
            </a>
            <div className="my-1 h-px bg-gray-200" />
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Industries</p>
            {industryItems.map((item) => {
              const Icon = item.icon
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 pl-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <Icon className="h-4 w-4 text-brand-crimson-400" />
                  {item.label}
                </a>
              )
            })}
            <div className="my-1 h-px bg-gray-200" />
            <a href="#pricing" onClick={() => setMobileOpen(false)} className="text-sm text-gray-600 hover:text-gray-900">
              Pricing
            </a>
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
              Log In
            </Link>
            <Button asChild className="w-full rounded-lg bg-brand-crimson-500 text-sm font-semibold text-white hover:bg-brand-crimson-600">
              <Link href="/qualify">Get Started</Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  )
}
