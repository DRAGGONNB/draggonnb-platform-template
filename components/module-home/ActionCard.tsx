'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ActionCardItem } from './ActionCardItem'
import type { ActionCardProps, ActionCardItem as ActionCardItemType, ApproveAction } from './types'

export function ActionCard({
  cardId,
  title,
  description,
  emptyStateCTA,
  items: initialItems,
  totalCount: initialTotalCount,
  apiEndpoint,
  dismissEndpoint,
  advancedHref,
  variant,
}: ActionCardProps) {
  const [items, setItems] = useState<ActionCardItemType[]>(initialItems)
  const [totalCount, setTotalCount] = useState(initialTotalCount)

  function handleDismiss(itemId: string) {
    const item = items.find((i) => i.id === itemId)
    if (!item) return

    // Optimistic removal
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    setTotalCount((prev) => Math.max(0, prev - 1))

    // Fire dismiss POST
    fetch(dismissEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityId: item.entityId,
        entityType: item.entityType,
        cardType: cardId,
      }),
    }).catch(() => {
      // Restore on failure
      setItems((prev) => [...prev, item])
      setTotalCount((prev) => prev + 1)
    })
  }

  function handleApproveCommit(itemId: string, _action: ApproveAction) {
    // Called by ActionCardItem after the 5s undo window — remove from local state
    setItems((prev) => prev.filter((i) => i.id !== itemId))
    setTotalCount((prev) => Math.max(0, prev - 1))
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-3xl" aria-hidden>
              {'✅'}
            </span>
            <p className="text-sm text-muted-foreground">{emptyStateCTA}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <ActionCardItem
                key={item.id}
                item={item}
                variant={variant}
                apiEndpoint={apiEndpoint}
                onDismiss={() => handleDismiss(item.id)}
                onApproveCommit={(action) => handleApproveCommit(item.id, action)}
              />
            ))}
          </ul>
        )}
      </CardContent>

      {totalCount > items.length && (
        <CardFooter>
          <Link
            href={advancedHref}
            className="text-sm text-primary hover:underline"
          >
            View all {totalCount} in Advanced →
          </Link>
        </CardFooter>
      )}
    </Card>
  )
}
