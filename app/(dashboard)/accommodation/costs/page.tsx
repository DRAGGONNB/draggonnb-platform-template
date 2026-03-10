'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  DollarSign,
  Plus,
  Loader2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
  Percent,
  Moon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// --- Types ---

interface CostSummary {
  total_costs: number
  total_revenue: number
  profit_margin: number
  avg_cost_per_night: number
  by_category: Array<{
    category: string
    amount: number
    percentage: number
  }>
}

interface UnitCost {
  id: string
  organization_id: string
  unit_id: string
  unit?: { name: string }
  cost_category_id: string
  cost_category?: { name: string }
  amount: number
  period: 'daily' | 'weekly' | 'monthly' | 'per_booking'
  notes: string | null
  effective_date: string
  created_at: string
}

interface UnitProfitability {
  unit_id: string
  unit_name: string
  revenue: number
  total_costs: number
  net_profit: number
  margin_percentage: number
  occupancy_percentage: number
  period: string
}

// --- Constants ---

type ActiveTab = 'summary' | 'unit-costs' | 'profitability'

const PERIOD_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  per_booking: 'Per Booking',
}

// --- Helpers ---

const formatCurrency = (amount: number | null): string => {
  if (amount == null) return '-'
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
}

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatLabel = (value: string): string => {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`
}

const getMarginColor = (margin: number): string => {
  if (margin > 30) return 'text-green-600'
  if (margin >= 10) return 'text-amber-600'
  return 'text-red-600'
}

const getMarginBadgeColor = (margin: number): string => {
  if (margin > 30) return 'bg-green-100 text-green-700'
  if (margin >= 10) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

// --- Component ---

export default function CostsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary')

  // Cost Summary state
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  // Unit Costs state
  const [unitCosts, setUnitCosts] = useState<UnitCost[]>([])
  const [costsLoading, setCostsLoading] = useState(true)
  const [costsError, setCostsError] = useState<string | null>(null)
  const [unitFilter, setUnitFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Profitability state
  const [profitability, setProfitability] = useState<UnitProfitability[]>([])
  const [profitLoading, setProfitLoading] = useState(true)
  const [profitError, setProfitError] = useState<string | null>(null)
  const [profitSort, setProfitSort] = useState<'margin' | 'revenue'>('margin')
  const [generating, setGenerating] = useState(false)

  // --- Data Fetching ---

  const fetchCostSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const res = await fetch('/api/accommodation/cost-summary')
      if (res.status === 403) {
        setSummaryError('Accommodation module requires Growth tier or above.')
        return
      }
      if (!res.ok) {
        setSummaryError('Failed to load cost summary')
        return
      }
      const data = await res.json()
      setCostSummary(data.data || data)
    } catch {
      setSummaryError('Failed to load cost summary')
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  const fetchUnitCosts = useCallback(async () => {
    setCostsLoading(true)
    try {
      const params = new URLSearchParams()
      if (unitFilter !== 'all') params.set('unit_id', unitFilter)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      const queryStr = params.toString()
      const url = queryStr
        ? `/api/accommodation/unit-costs?${queryStr}`
        : '/api/accommodation/unit-costs'

      const res = await fetch(url)
      if (res.status === 403) {
        setCostsError('Accommodation module requires Growth tier or above.')
        return
      }
      if (!res.ok) {
        setCostsError('Failed to load unit costs')
        return
      }
      const data = await res.json()
      setUnitCosts(data.data || [])
    } catch {
      setCostsError('Failed to load unit costs')
    } finally {
      setCostsLoading(false)
    }
  }, [unitFilter, categoryFilter])

  const fetchProfitability = useCallback(async () => {
    setProfitLoading(true)
    try {
      const res = await fetch('/api/accommodation/unit-profitability')
      if (res.status === 403) {
        setProfitError('Accommodation module requires Growth tier or above.')
        return
      }
      if (!res.ok) {
        setProfitError('Failed to load profitability data')
        return
      }
      const data = await res.json()
      setProfitability(data.data || [])
    } catch {
      setProfitError('Failed to load profitability data')
    } finally {
      setProfitLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCostSummary()
  }, [fetchCostSummary])

  useEffect(() => {
    if (activeTab === 'unit-costs') {
      fetchUnitCosts()
    }
  }, [activeTab, fetchUnitCosts])

  useEffect(() => {
    if (activeTab === 'profitability') {
      fetchProfitability()
    }
  }, [activeTab, fetchProfitability])

  // --- Actions ---

  const handleGenerateReport = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/accommodation/unit-profitability/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        fetchProfitability()
      } else {
        const data = await res.json()
        setProfitError(data.error || 'Failed to generate report')
      }
    } catch {
      setProfitError('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  // --- Computed Values ---

  const units = Array.from(
    new Map(
      unitCosts
        .filter((c) => c.unit?.name)
        .map((c) => [c.unit_id, c.unit?.name || ''])
    ).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]))

  const costCategories = Array.from(
    new Set(unitCosts.map((c) => c.cost_category?.name || '').filter(Boolean))
  ).sort()

  const filteredCosts = unitCosts.filter((cost) => {
    const matchesUnit = unitFilter === 'all' || cost.unit_id === unitFilter
    const matchesCategory =
      categoryFilter === 'all' || cost.cost_category?.name === categoryFilter
    return matchesUnit && matchesCategory
  })

  // Group unit costs by unit for subtotals
  const costsByUnit = filteredCosts.reduce<Record<string, { name: string; costs: UnitCost[]; total: number }>>(
    (acc, cost) => {
      const unitName = cost.unit?.name || 'Unknown'
      if (!acc[cost.unit_id]) {
        acc[cost.unit_id] = { name: unitName, costs: [], total: 0 }
      }
      acc[cost.unit_id].costs.push(cost)
      acc[cost.unit_id].total += cost.amount
      return acc
    },
    {}
  )

  const sortedProfitability = [...profitability].sort((a, b) => {
    if (profitSort === 'margin') return b.margin_percentage - a.margin_percentage
    return b.revenue - a.revenue
  })

  // Determine the max cost for the simple bar visualization
  const maxCategoryAmount =
    costSummary?.by_category?.reduce((max, cat) => Math.max(max, cat.amount), 0) || 1

  // --- Current Error ---
  const currentError =
    activeTab === 'summary'
      ? summaryError
      : activeTab === 'unit-costs'
      ? costsError
      : profitError

  // --- Loading State ---
  const isInitialLoading =
    activeTab === 'summary'
      ? summaryLoading && !costSummary
      : activeTab === 'unit-costs'
      ? costsLoading && unitCosts.length === 0
      : profitLoading && profitability.length === 0

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-primary" />
            Cost Tracking
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor costs, revenue, and unit profitability
          </p>
        </div>
      </div>

      {/* Error */}
      {currentError && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive text-sm">{currentError}</p>
          <button
            className="text-xs text-destructive underline mt-1"
            onClick={() => {
              setSummaryError(null)
              setCostsError(null)
              setProfitError(null)
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'summary'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Cost Summary
        </button>
        <button
          onClick={() => setActiveTab('unit-costs')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'unit-costs'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Unit Costs
        </button>
        <button
          onClick={() => setActiveTab('profitability')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'profitability'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Profitability
        </button>
      </div>

      <Separator className="mb-6" />

      {/* Tab Content: Cost Summary */}
      {activeTab === 'summary' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Costs (MTD)</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(costSummary?.total_costs ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">Month to date</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue (MTD)</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(costSummary?.total_revenue ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">Month to date</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${getMarginColor(
                    costSummary?.profit_margin ?? 0
                  )}`}
                >
                  {formatPercent(costSummary?.profit_margin ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">Revenue minus costs</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Cost Per Night</CardTitle>
                <Moon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(costSummary?.avg_cost_per_night ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">Across all units</p>
              </CardContent>
            </Card>
          </div>

          {/* Cost Breakdown by Category */}
          {costSummary?.by_category && costSummary.by_category.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Cost Breakdown by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount (ZAR)</TableHead>
                        <TableHead className="text-right">% of Total</TableHead>
                        <TableHead className="w-[200px]">Distribution</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costSummary.by_category.map((cat) => (
                        <TableRow key={cat.category}>
                          <TableCell className="font-medium">
                            {formatLabel(cat.category)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(cat.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPercent(cat.percentage)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{
                                    width: `${Math.max(
                                      2,
                                      (cat.amount / maxCategoryAmount) * 100
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No cost data available for the current period.</p>
            </div>
          )}
        </>
      )}

      {/* Tab Content: Unit Costs */}
      {activeTab === 'unit-costs' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Select value={unitFilter} onValueChange={setUnitFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Units" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                {units.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {costCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto">
              <Button onClick={() => alert('Add Cost form coming soon')}>
                <Plus className="mr-2 h-4 w-4" /> Add Cost
              </Button>
            </div>
          </div>

          {/* Unit Costs Grouped Table */}
          {costsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(costsByUnit).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {unitCosts.length === 0
                  ? 'No unit costs recorded yet. Add cost entries to start tracking.'
                  : 'No costs match your filter criteria.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(costsByUnit).map(([unitId, group]) => (
                <Card key={unitId}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <Badge variant="secondary" className="text-sm font-mono">
                      Total: {formatCurrency(group.total)}
                    </Badge>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cost Category</TableHead>
                            <TableHead className="text-right">Amount (ZAR)</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.costs.map((cost) => (
                            <TableRow key={cost.id}>
                              <TableCell className="font-medium">
                                {cost.cost_category?.name || '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(cost.amount)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {PERIOD_LABELS[cost.period] || cost.period}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                                {cost.notes || '-'}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatDate(cost.effective_date)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab Content: Profitability */}
      {activeTab === 'profitability' && (
        <>
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Select
              value={profitSort}
              onValueChange={(v) => setProfitSort(v as 'margin' | 'revenue')}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="margin">Sort by Margin</SelectItem>
                <SelectItem value="revenue">Sort by Revenue</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto">
              <Button onClick={handleGenerateReport} disabled={generating}>
                {generating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Generate Report
              </Button>
            </div>
          </div>

          {/* Profitability Table */}
          {profitLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedProfitability.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No profitability data available. Generate a report to see unit performance.</p>
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unit Name</TableHead>
                      <TableHead className="text-right">Revenue (ZAR)</TableHead>
                      <TableHead className="text-right">Total Costs (ZAR)</TableHead>
                      <TableHead className="text-right">Net Profit (ZAR)</TableHead>
                      <TableHead className="text-right">Margin %</TableHead>
                      <TableHead className="text-right">Occupancy %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedProfitability.map((unit) => (
                      <TableRow key={unit.unit_id}>
                        <TableCell className="font-medium">{unit.unit_name}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(unit.revenue)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatCurrency(unit.total_costs)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${
                            unit.net_profit >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(unit.net_profit)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getMarginBadgeColor(
                              unit.margin_percentage
                            )}`}
                          >
                            {formatPercent(unit.margin_percentage)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, Math.max(0, unit.occupancy_percentage))}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-12 text-right">
                              {formatPercent(unit.occupancy_percentage)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
