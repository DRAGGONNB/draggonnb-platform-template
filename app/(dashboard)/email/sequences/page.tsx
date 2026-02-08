'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Loader2,
  GitBranch,
  Play,
  Pause,
  Users,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface EmailSequence {
  id: string
  name: string
  description: string | null
  trigger_type: string
  is_active: boolean
  total_enrolled: number
  total_completed: number
  created_at: string
  email_sequence_steps: { count: number }[]
}

const triggerTypeLabels: Record<string, string> = {
  signup: 'New Signup',
  subscription_change: 'Subscription Change',
  inactivity: 'Inactivity',
  manual: 'Manual Enrollment',
  custom: 'Custom Trigger',
}

export default function SequencesPage() {
  const { toast } = useToast()
  const [sequences, setSequences] = useState<EmailSequence[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadSequences()
  }, [])

  async function loadSequences() {
    setIsLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('email_sequences')
      .select('*, email_sequence_steps(count)')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setSequences(data)
    }
    setIsLoading(false)
  }

  async function toggleSequence(id: string, isActive: boolean) {
    const response = await fetch(`/api/email/sequences/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    })

    if (response.ok) {
      setSequences((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: !isActive } : s))
      )
      toast({
        title: 'Success',
        description: `Sequence ${!isActive ? 'activated' : 'deactivated'}`,
      })
    } else {
      toast({
        title: 'Error',
        description: 'Failed to update sequence',
        variant: 'destructive',
      })
    }
  }

  async function deleteSequence(id: string) {
    const response = await fetch(`/api/email/sequences/${id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      setSequences((prev) => prev.filter((s) => s.id !== id))
      toast({
        title: 'Success',
        description: 'Sequence deleted',
      })
    } else {
      const data = await response.json()
      toast({
        title: 'Error',
        description: data.error || 'Failed to delete sequence',
        variant: 'destructive',
      })
    }
  }

  const filteredSequences = sequences.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Sequences</h1>
          <p className="text-muted-foreground mt-1">
            Create automated email drip campaigns
          </p>
        </div>
        <Link href="/email/sequences/builder">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Sequence
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Sequences</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sequences..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSequences.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'No sequences match your search' : 'No sequences yet'}
              </p>
              {!searchQuery && (
                <Link href="/email/sequences/builder">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first sequence
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSequences.map((sequence) => {
                  const stepCount = sequence.email_sequence_steps?.[0]?.count || 0
                  const completionRate =
                    sequence.total_enrolled > 0
                      ? Math.round(
                          (sequence.total_completed / sequence.total_enrolled) * 100
                        )
                      : 0

                  return (
                    <TableRow key={sequence.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sequence.name}</div>
                          {sequence.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {sequence.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {triggerTypeLabels[sequence.trigger_type] || sequence.trigger_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <GitBranch className="h-4 w-4 text-muted-foreground" />
                          {stepCount} {stepCount === 1 ? 'step' : 'steps'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {sequence.total_enrolled}
                        </div>
                      </TableCell>
                      <TableCell>
                        {sequence.total_enrolled > 0 ? (
                          <div className="text-sm">
                            {sequence.total_completed} ({completionRate}%)
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={sequence.is_active}
                            onCheckedChange={() =>
                              toggleSequence(sequence.id, sequence.is_active)
                            }
                          />
                          <span className="text-sm">
                            {sequence.is_active ? (
                              <span className="text-green-600 flex items-center gap-1">
                                <Play className="h-3 w-3" />
                                Active
                              </span>
                            ) : (
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Pause className="h-3 w-3" />
                                Paused
                              </span>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Link href={`/email/sequences/${sequence.id}`}>
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                            </Link>
                            <Link href={`/email/sequences/builder?edit=${sequence.id}`}>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            </Link>
                            {!sequence.is_active && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteSequence(sequence.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
