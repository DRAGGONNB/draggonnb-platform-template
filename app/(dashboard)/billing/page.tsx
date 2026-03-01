'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

// -- Types --

interface UsageLimitResult {
  allowed: boolean
  current: number
  planIncluded: number
  boltOnRemaining: number
  totalAvailable: number
  percent: number
  overageAvailable: boolean
  overageRateZar: number
  overageUnits: number
  overageCostZar: number
  upgradeRequired?: string
  reason?: string
}

interface Credit {
  id: string
  dimension: string
  credits_purchased: number
  credits_remaining: number
  source: string
  purchased_at: string
  expires_at: string
  status: string
  credit_packs: {
    name: string
    dimension: string
  } | null
}

interface BoltOnPack {
  slug: string
  name: string
  dimension: string
  quantity: number
  priceZar: number
  priceDisplay: string
  perUnitCost: string
}

// -- Constants --

const DIMENSION_LABELS: Record<string, string> = {
  ai_generations: 'AI Generations',
  social_posts: 'Social Posts',
  email_sends: 'Email Sends',
  agent_invocations: 'Agent Invocations',
  autopilot_runs: 'Autopilot Runs',
}

// -- Inline Components --

function UsageBar({
  dimension,
  usage,
}: {
  dimension: string
  usage: UsageLimitResult
}) {
  const label = DIMENSION_LABELS[dimension] || dimension.replace(/_/g, ' ')
  const percent = Math.min(usage.percent, 100)

  const barColor =
    percent >= 90
      ? 'bg-red-500'
      : percent >= 75
        ? 'bg-orange-500'
        : percent >= 50
          ? 'bg-yellow-500'
          : 'bg-green-500'

  const isUnlimited = usage.planIncluded >= 999999

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
          {usage.overageUnits > 0 && (
            <Badge variant="destructive" className="text-xs">
              Overage
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isUnlimited ? (
          <div className="text-sm text-muted-foreground">
            {usage.current.toLocaleString()} used (unlimited)
          </div>
        ) : (
          <>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={cn('h-full rounded-full transition-all', barColor)}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {usage.current.toLocaleString()} / {usage.totalAvailable.toLocaleString()} used
              </span>
              <span className="font-medium">{percent}%</span>
            </div>
          </>
        )}

        {usage.boltOnRemaining > 0 && (
          <p className="text-xs text-blue-600">
            +{usage.boltOnRemaining.toLocaleString()} bolt-on credits
          </p>
        )}

        {usage.overageUnits > 0 && (
          <p className="text-xs text-red-600">
            {usage.overageUnits.toLocaleString()} overage units at R
            {(usage.overageRateZar / 100).toLocaleString('en-ZA', {
              minimumFractionDigits: 2,
            })}
            /unit = R
            {(usage.overageCostZar / 100).toLocaleString('en-ZA', {
              minimumFractionDigits: 2,
            })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function CreditRow({ credit }: { credit: Credit }) {
  const label =
    DIMENSION_LABELS[credit.dimension] ||
    credit.dimension.replace(/_/g, ' ')
  const packName = credit.credit_packs?.name || label
  const expiresAt = new Date(credit.expires_at)
  const daysLeft = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  )

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">{packName}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">
          {credit.credits_remaining.toLocaleString()} /{' '}
          {credit.credits_purchased.toLocaleString()}
        </p>
        <p
          className={cn(
            'text-xs',
            daysLeft <= 7 ? 'text-red-500' : 'text-muted-foreground'
          )}
        >
          {daysLeft <= 0
            ? 'Expiring today'
            : `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
        </p>
      </div>
    </div>
  )
}

function PackCard({
  pack,
  onBuy,
  buying,
}: {
  pack: BoltOnPack
  onBuy: (slug: string) => void
  buying: string | null
}) {
  const label =
    DIMENSION_LABELS[pack.dimension] ||
    pack.dimension.replace(/_/g, ' ')

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{pack.name}</CardTitle>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{pack.priceDisplay}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {pack.quantity.toLocaleString()} credits ({pack.perUnitCost}/unit)
        </p>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          size="sm"
          disabled={buying !== null}
          onClick={() => onBuy(pack.slug)}
        >
          {buying === pack.slug ? 'Processing...' : 'Buy Now'}
        </Button>
      </CardFooter>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-64 rounded bg-gray-200" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-36 rounded-lg border bg-gray-100" />
        ))}
      </div>
    </div>
  )
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="flex items-center justify-between py-4">
        <p className="text-sm text-red-700">{message}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  )
}

// -- Main Page --

export default function BillingPage() {
  const [usage, setUsage] = useState<Record<string, UsageLimitResult> | null>(null)
  const [credits, setCredits] = useState<Credit[]>([])
  const [packs, setPacks] = useState<BoltOnPack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [buying, setBuying] = useState<string | null>(null)

  async function fetchData() {
    setLoading(true)
    setError(null)

    try {
      const [usageRes, creditsRes, packsRes] = await Promise.all([
        fetch('/api/billing/usage'),
        fetch('/api/billing/credits'),
        fetch('/api/billing/bolt-on'),
      ])

      if (!usageRes.ok) throw new Error('Failed to fetch usage data')
      if (!creditsRes.ok) throw new Error('Failed to fetch credits')
      if (!packsRes.ok) throw new Error('Failed to fetch credit packs')

      const [usageData, creditsData, packsData] = await Promise.all([
        usageRes.json(),
        creditsRes.json(),
        packsRes.json(),
      ])

      setUsage(usageData.usage)
      setCredits(creditsData.credits || [])
      setPacks(packsData.packs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function handleBuy(packSlug: string) {
    setBuying(packSlug)
    try {
      const res = await fetch('/api/billing/bolt-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packSlug }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Purchase failed')
      }

      const { formData, paymentUrl } = await res.json()

      // Create and submit a hidden form to redirect to PayFast
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = paymentUrl
      Object.entries(formData).forEach(([key, value]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = value as string
        form.appendChild(input)
      })
      document.body.appendChild(form)
      form.submit()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed')
      setBuying(null)
    }
  }

  if (loading) {
    return <LoadingSkeleton />
  }

  if (error && !usage) {
    return <ErrorBanner message={error} onRetry={fetchData} />
  }

  const usageEntries = usage ? Object.entries(usage) : []
  const dimensionOrder = [
    'ai_generations',
    'social_posts',
    'email_sends',
    'agent_invocations',
    'autopilot_runs',
  ]
  const sortedEntries = usageEntries.sort(
    (a, b) => dimensionOrder.indexOf(a[0]) - dimensionOrder.indexOf(b[0])
  )

  // Group packs by dimension
  const packsByDimension: Record<string, BoltOnPack[]> = {}
  packs.forEach((pack) => {
    if (!packsByDimension[pack.dimension]) {
      packsByDimension[pack.dimension] = []
    }
    packsByDimension[pack.dimension].push(pack)
  })

  // Determine plan name from the first usage entry that has planIncluded > 0
  const hasOverage = sortedEntries.some(([, u]) => u.overageUnits > 0)
  const totalOverageCostZar = sortedEntries.reduce(
    (sum, [, u]) => sum + u.overageCostZar,
    0
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Billing & Usage</h1>
          <Badge variant="secondary" className="text-xs">
            Current Plan
          </Badge>
        </div>
        <Button variant="outline" asChild>
          <a href="/settings">Manage Subscription</a>
        </Button>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* Overage Warning */}
      {hasOverage && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-red-700">
              You have overage charges this period totaling R
              {(totalOverageCostZar / 100).toLocaleString('en-ZA', {
                minimumFractionDigits: 2,
              })}
              . Consider purchasing bolt-on credit packs to reduce overage costs.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="usage" className="space-y-6">
        <TabsList>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
          <TabsTrigger value="purchase">Purchase Credits</TabsTrigger>
        </TabsList>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedEntries.map(([dimension, usageData]) => (
              <UsageBar
                key={dimension}
                dimension={dimension}
                usage={usageData}
              />
            ))}
          </div>

          {sortedEntries.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No usage data available. Usage tracking will appear once your
                subscription is active.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Credits Tab */}
        <TabsContent value="credits" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Active Bolt-On Credits</h2>
            <p className="text-sm text-muted-foreground">
              Credits purchased to extend your plan limits
            </p>
          </div>

          <Separator />

          {credits.length > 0 ? (
            <div className="space-y-3">
              {credits.map((credit) => (
                <CreditRow key={credit.id} credit={credit} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No active bolt-on credits. Purchase credit packs to extend your
                usage limits beyond your plan allocation.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Purchase Tab */}
        <TabsContent value="purchase" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Credit Packs</h2>
            <p className="text-sm text-muted-foreground">
              Purchase additional credits to extend your monthly limits
            </p>
          </div>

          <Separator />

          {Object.keys(packsByDimension).length > 0 ? (
            Object.entries(packsByDimension).map(([dimension, dimensionPacks]) => (
              <div key={dimension} className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {DIMENSION_LABELS[dimension] || dimension.replace(/_/g, ' ')}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {dimensionPacks.map((pack) => (
                    <PackCard
                      key={pack.slug}
                      pack={pack}
                      onBuy={handleBuy}
                      buying={buying}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No credit packs available at this time.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
