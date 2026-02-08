'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Search,
  ArrowLeft,
  Loader2,
  DollarSign,
  Calendar,
  TrendingUp
} from 'lucide-react'

interface Deal {
  id: string
  name: string
  value: number
  stage: string
  probability: number
  expected_close_date: string | null
  description: string | null
  contacts?: {
    first_name: string
    last_name: string
    email: string
  }
  created_at: string
}

const STAGES = [
  { value: 'lead', label: 'Lead', color: 'bg-gray-100 text-gray-700' },
  { value: 'qualified', label: 'Qualified', color: 'bg-blue-100 text-blue-700' },
  { value: 'proposal', label: 'Proposal', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-700' },
  { value: 'won', label: 'Won', color: 'bg-green-100 text-green-700' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
]

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('')
  const [total, setTotal] = useState(0)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    value: '',
    stage: 'lead',
    probability: '20',
    expected_close_date: '',
    description: '',
  })

  useEffect(() => {
    loadDeals()
  }, [search, stageFilter])

  async function loadDeals() {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (stageFilter) params.set('stage', stageFilter)

      const res = await fetch(`/api/crm/deals?${params.toString()}`)
      const data = await res.json()

      if (res.ok) {
        setDeals(data.deals || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Failed to load deals:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setIsCreating(true)

    try {
      const res = await fetch('/api/crm/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          value: parseFloat(formData.value) || 0,
          probability: parseInt(formData.probability) || 0,
        }),
      })

      if (res.ok) {
        setIsCreateOpen(false)
        setFormData({ name: '', value: '', stage: 'lead', probability: '20', expected_close_date: '', description: '' })
        loadDeals()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create deal')
      }
    } catch (error) {
      console.error('Create error:', error)
    } finally {
      setIsCreating(false)
    }
  }

  // Calculate pipeline value
  const pipelineValue = deals
    .filter(d => !['won', 'lost'].includes(d.stage))
    .reduce((sum, d) => sum + (d.value || 0), 0)

  const wonValue = deals
    .filter(d => d.stage === 'won')
    .reduce((sum, d) => sum + (d.value || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/crm">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Deals</h1>
            <p className="text-gray-600 mt-1">{total} deals in pipeline</p>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Deal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Deal</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Deal Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Website Redesign Project"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Value (R)</Label>
                  <Input
                    id="value"
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="10000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stage">Stage</Label>
                  <Select value={formData.stage} onValueChange={(v) => setFormData({ ...formData, stage: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="probability">Probability (%)</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected_close_date">Expected Close</Label>
                  <Input
                    id="expected_close_date"
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Deal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Pipeline Value</div>
              <div className="text-2xl font-bold">R{pipelineValue.toLocaleString()}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Won This Month</div>
              <div className="text-2xl font-bold">R{wonValue.toLocaleString()}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-purple-100">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Active Deals</div>
              <div className="text-2xl font-bold">{deals.filter(d => !['won', 'lost'].includes(d.stage)).length}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search deals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Stages</SelectItem>
            {STAGES.map((stage) => (
              <SelectItem key={stage.value} value={stage.value}>
                {stage.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Deals List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : deals.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-4xl mb-4">💼</div>
          <h3 className="text-lg font-medium text-gray-900">No deals yet</h3>
          <p className="text-gray-500 mt-1">Start tracking your sales pipeline</p>
          <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Deal
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal) => {
            const stage = STAGES.find(s => s.value === deal.stage)
            return (
              <Card key={deal.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-lg truncate flex-1">{deal.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 ${stage?.color || 'bg-gray-100'}`}>
                    {stage?.label || deal.stage}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Value</span>
                    <span className="font-semibold">R{deal.value?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Probability</span>
                    <span>{deal.probability}%</span>
                  </div>
                  {deal.expected_close_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Expected Close</span>
                      <span>{new Date(deal.expected_close_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {deal.contacts && (
                    <div className="pt-2 border-t mt-2">
                      <span className="text-gray-500">Contact: </span>
                      <span>{deal.contacts.first_name} {deal.contacts.last_name}</span>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
