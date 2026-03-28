'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const SESSION_KEY = 'restaurant_staff_session'

export interface RestaurantStaffSession {
  staffId: string
  displayName: string
  role: string
}

export function useRestaurantStaff(): RestaurantStaffSession | null {
  const [session, setSession] = useState<RestaurantStaffSession | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (raw) {
        setSession(JSON.parse(raw) as RestaurantStaffSession)
      }
    } catch {
      // sessionStorage not available (SSR guard)
    }
  }, [])

  return session
}

interface RestaurantAuthGuardProps {
  children: React.ReactNode
}

export function RestaurantAuthGuard({ children }: RestaurantAuthGuardProps) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [valid, setValid] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as RestaurantStaffSession
        if (parsed.staffId && parsed.displayName && parsed.role) {
          setValid(true)
          setChecked(true)
          return
        }
      }
    } catch {
      // ignore
    }
    setChecked(true)
    router.replace('/restaurant/login')
  }, [router])

  if (!checked) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#2D2F33]">
        <div className="w-8 h-8 border-2 border-[#6B1420] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!valid) return null

  return <>{children}</>
}
