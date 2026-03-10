'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Package,
  Plus,
  Loader2,
  Search,
  AlertTriangle,
  ArrowUpDown,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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

interface StockItem {
  id: string
  organization_id: string
  name: string
  category: string
  unit_of_measure: string
  current_quantity: number
  min_level: number
  max_level: number
  unit_cost: number
  supplier: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface StockMovement {
  id: string
  organization_id: string
  stock_item_id: string
  stock_item?: { name: string }
  movement_type: 'purchase' | 'usage' | 'adjustment' | 'waste' | 'transfer'
  quantity: number
  unit_cost: number | null
  reference: string | null
  notes: string | null
  created_at: string
}

// --- Constants ---

type StockStatus = 'low_stock' | 'overstocked' | 'in_stock'
type MovementType = 'purchase' | 'usage' | 'adjustment' | 'waste' | 'transfer'

const STOCK_STATUS_COLORS: Record<StockStatus, string> = {
  low_stock: 'bg-red-100 text-red-700',
  overstocked: 'bg-amber-100 text-amber-700',
  in_stock: 'bg-green-100 text-green-700',
}

const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  low_stock: 'Low Stock',
  overstocked: 'Overstocked',
  in_stock: 'In Stock',
}

const MOVEMENT_TYPE_COLORS: Record<MovementType, string> = {
  purchase: 'bg-green-100 text-green-700',
  usage: 'bg-blue-100 text-blue-700',
  adjustment: 'bg-amber-100 text-amber-700',
  waste: 'bg-red-100 text-red-700',
  transfer: 'bg-purple-100 text-purple-700',
}

const MOVEMENT_TYPES: MovementType[] = ['purchase', 'usage', 'adjustment', 'waste', 'transfer']

// --- Helpers ---

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatCurrency = (amount: number | null): string => {
  if (amount == null) return '-'
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
}

const formatLabel = (value: string): string => {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const getStockStatus = (item: StockItem): StockStatus => {
  if (item.current_quantity <= item.min_level) return 'low_stock'
  if (item.current_quantity >= item.max_level) return 'overstocked'
  return 'in_stock'
}

const getMovementIcon = (type: MovementType) => {
  switch (type) {
    case 'purchase':
      return <TrendingUp className="h-3 w-3" />
    case 'usage':
      return <TrendingDown className="h-3 w-3" />
    case 'waste':
      return <Minus className="h-3 w-3" />
    case 'adjustment':
      return <ArrowUpDown className="h-3 w-3" />
    case 'transfer':
      return <ArrowUpDown className="h-3 w-3" />
  }
}

// --- Component ---

export default function StockPage() {
  const [activeTab, setActiveTab] = useState<'items' | 'movements'>('items')

  // Stock Items state
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)
  const [itemsError, setItemsError] = useState<string | null>(null)
  const [itemSearch, setItemSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Stock Movements state
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [movementsLoading, setMovementsLoading] = useState(true)
  const [movementsError, setMovementsError] = useState<string | null>(null)
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // --- Data Fetching ---

  const fetchStockItems = useCallback(async () => {
    setItemsLoading(true)
    try {
      const res = await fetch('/api/accommodation/stock-items')
      if (res.status === 403) {
        setItemsError('Accommodation module requires Growth tier or above.')
        return
      }
      if (!res.ok) {
        setItemsError('Failed to load stock items')
        return
      }
      const data = await res.json()
      setStockItems(data.data || [])
    } catch {
      setItemsError('Failed to load stock items')
    } finally {
      setItemsLoading(false)
    }
  }, [])

  const fetchMovements = useCallback(async () => {
    setMovementsLoading(true)
    try {
      const params = new URLSearchParams()
      if (movementTypeFilter !== 'all') params.set('type', movementTypeFilter)
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      const queryStr = params.toString()
      const url = queryStr
        ? `/api/accommodation/stock-movements?${queryStr}`
        : '/api/accommodation/stock-movements'

      const res = await fetch(url)
      if (res.status === 403) {
        setMovementsError('Accommodation module requires Growth tier or above.')
        return
      }
      if (!res.ok) {
        setMovementsError('Failed to load stock movements')
        return
      }
      const data = await res.json()
      setMovements(data.data || [])
    } catch {
      setMovementsError('Failed to load stock movements')
    } finally {
      setMovementsLoading(false)
    }
  }, [movementTypeFilter, dateFrom, dateTo])

  useEffect(() => {
    fetchStockItems()
  }, [fetchStockItems])

  useEffect(() => {
    if (activeTab === 'movements') {
      fetchMovements()
    }
  }, [activeTab, fetchMovements])

  // --- Computed Values ---

  const categories = Array.from(new Set(stockItems.map((item) => item.category))).sort()

  const filteredItems = stockItems.filter((item) => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
    const matchesSearch =
      !itemSearch.trim() || item.name.toLowerCase().includes(itemSearch.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const lowStockCount = stockItems.filter((item) => item.current_quantity <= item.min_level).length
  const totalValue = stockItems.reduce(
    (sum, item) => sum + item.current_quantity * item.unit_cost,
    0
  )

  // --- Loading State ---

  const isLoading = activeTab === 'items' ? itemsLoading : movementsLoading

  if (isLoading && (activeTab === 'items' ? stockItems.length === 0 : movements.length === 0)) {
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
            <Package className="h-8 w-8 text-primary" />
            Stock & Inventory
          </h1>
          <p className="text-muted-foreground mt-2">
            Track stock levels, purchases, and usage
          </p>
        </div>
        <Button onClick={() => alert('Add Item form coming soon')}>
          <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </div>

      {/* Error */}
      {(itemsError || movementsError) && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-destructive text-sm">{itemsError || movementsError}</p>
          <button
            className="text-xs text-destructive underline mt-1"
            onClick={() => {
              setItemsError(null)
              setMovementsError(null)
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockItems.length}</div>
            <p className="text-xs text-muted-foreground">Active stock items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-600' : ''}`}>
              {lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground">Items below minimum level</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">Current inventory value</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'items'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Stock Items
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'movements'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Stock Movements
        </button>
      </div>

      <Separator className="mb-6" />

      {/* Tab Content: Stock Items */}
      {activeTab === 'items' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by item name..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {formatLabel(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stock Items Table */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {stockItems.length === 0
                  ? 'No stock items found. Add your first item to start tracking inventory.'
                  : 'No items match your search or filter criteria.'}
              </p>
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Current Qty</TableHead>
                      <TableHead className="text-right">Min Level</TableHead>
                      <TableHead className="text-right">Max Level</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const status = getStockStatus(item)
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {formatLabel(item.category)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.unit_of_measure}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {item.current_quantity}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {item.min_level}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {item.max_level}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unit_cost)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STOCK_STATUS_COLORS[status]}`}
                            >
                              {STOCK_STATUS_LABELS[status]}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Tab Content: Stock Movements */}
      {activeTab === 'movements' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {MOVEMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[160px]"
                placeholder="From"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[160px]"
                placeholder="To"
              />
            </div>
          </div>

          {/* Movements Table */}
          {movementsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowUpDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No stock movements recorded yet.</p>
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement) => {
                      const isPositive = movement.movement_type === 'purchase'
                      const isNegative =
                        movement.movement_type === 'usage' || movement.movement_type === 'waste'
                      const displayQty = isNegative
                        ? `-${Math.abs(movement.quantity)}`
                        : isPositive
                        ? `+${movement.quantity}`
                        : movement.quantity.toString()

                      return (
                        <TableRow key={movement.id}>
                          <TableCell className="text-muted-foreground">
                            {formatDate(movement.created_at)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {movement.stock_item?.name || movement.stock_item_id.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                MOVEMENT_TYPE_COLORS[movement.movement_type]
                              }`}
                            >
                              {getMovementIcon(movement.movement_type)}
                              {formatLabel(movement.movement_type)}
                            </span>
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono ${
                              isPositive
                                ? 'text-green-600'
                                : isNegative
                                ? 'text-red-600'
                                : ''
                            }`}
                          >
                            {displayQty}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(movement.unit_cost)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {movement.reference || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                            {movement.notes || '-'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
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
