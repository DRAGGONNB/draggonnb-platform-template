'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Circle,
  X,
  UserCircle,
  UserPlus,
  Mail,
  Sparkles,
  MessageSquare,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'

const DISMISS_KEY = 'draggonnb_checklist_dismissed'

interface ChecklistItem {
  id: string
  label: string
  href: string
  icon: React.ElementType
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'profile',
    label: 'Complete your business profile',
    href: '/onboarding',
    icon: UserCircle,
  },
  {
    id: 'contact',
    label: 'Add your first contact',
    href: '/crm/contacts',
    icon: UserPlus,
  },
  {
    id: 'campaign',
    label: 'Create your first campaign',
    href: '/email/campaigns/new',
    icon: Mail,
  },
  {
    id: 'content',
    label: 'Generate AI content',
    href: '/content-generator',
    icon: Sparkles,
  },
  {
    id: 'whatsapp',
    label: 'Connect WhatsApp',
    href: '/onboarding/meta',
    icon: MessageSquare,
  },
]

interface OnboardingChecklistProps {
  completedItems?: string[]
}

export function OnboardingChecklist({ completedItems = [] }: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid flash
  const [completed, setCompleted] = useState<Set<string>>(new Set(completedItems))

  useEffect(() => {
    const stored = localStorage.getItem(DISMISS_KEY)
    setDismissed(stored === 'true')

    // Load completed items from localStorage
    const storedCompleted = localStorage.getItem('draggonnb_checklist_completed')
    if (storedCompleted) {
      try {
        const parsed = JSON.parse(storedCompleted) as string[]
        setCompleted(new Set([...completedItems, ...parsed]))
      } catch {
        setCompleted(new Set(completedItems))
      }
    }
  }, [completedItems])

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem(DISMISS_KEY, 'true')
  }

  const toggleItem = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      localStorage.setItem(
        'draggonnb_checklist_completed',
        JSON.stringify(Array.from(next))
      )
      return next
    })
  }

  if (dismissed) return null

  const completedCount = CHECKLIST_ITEMS.filter((item) => completed.has(item.id)).length
  const totalCount = CHECKLIST_ITEMS.length
  const progressValue = Math.round((completedCount / totalCount) * 100)

  return (
    <Card className="shadow-sm border-[#6B1420]/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900">
            Getting Started
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-gray-600"
            onClick={handleDismiss}
            aria-label="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Progress
            value={progressValue}
            className="h-2 flex-1 bg-[#6B1420]/10 [&>div]:bg-[#6B1420]"
          />
          <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
            {completedCount} of {totalCount}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-1">
          {CHECKLIST_ITEMS.map((item) => {
            const isComplete = completed.has(item.id)
            const Icon = item.icon
            return (
              <li key={item.id} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50">
                <button
                  onClick={() => toggleItem(item.id)}
                  className="flex-shrink-0"
                  aria-label={isComplete ? `Mark ${item.label} incomplete` : `Mark ${item.label} complete`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-[#6B1420]" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300" />
                  )}
                </button>
                <Icon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                <Link
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    isComplete
                      ? 'text-gray-400 line-through'
                      : 'text-gray-700 hover:text-[#6B1420]'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
