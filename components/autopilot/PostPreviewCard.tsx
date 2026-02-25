'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Check,
  X,
  Pencil,
  Clock,
  Mail,
  Linkedin,
  Facebook,
  Instagram,
  Twitter,
} from 'lucide-react'

interface ContentQueueItem {
  id: string
  content: string
  platform: string
  status: string
  hashtags?: string[]
  publish_at?: string
  layout_data?: Record<string, unknown>
  source?: string
}

const platformIcons: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="h-4 w-4" />,
  facebook: <Facebook className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  twitter: <Twitter className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
}

const platformColors: Record<string, string> = {
  linkedin: 'bg-blue-100 text-blue-700',
  facebook: 'bg-indigo-100 text-indigo-700',
  instagram: 'bg-pink-100 text-pink-700',
  twitter: 'bg-sky-100 text-sky-700',
  email: 'bg-purple-100 text-purple-700',
}

const statusColors: Record<string, string> = {
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  draft: 'bg-purple-100 text-purple-700',
}

interface PostPreviewCardProps {
  item: ContentQueueItem
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onEdit?: (id: string) => void
  onClick?: (item: ContentQueueItem) => void
}

export function PostPreviewCard({ item, onApprove, onReject, onEdit, onClick }: PostPreviewCardProps) {
  const isEmail = item.platform === 'email' || (item.layout_data as Record<string, unknown>)?.type === 'email'
  const layoutData = (item.layout_data || {}) as Record<string, unknown>
  const displayStatus = isEmail && item.status === 'pending_approval' ? 'draft' : item.status

  const publishTime = item.publish_at
    ? new Date(item.publish_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
    : null

  const truncatedContent = item.content.length > 120
    ? item.content.substring(0, 120) + '...'
    : item.content

  return (
    <Card
      className="p-3 hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => onClick?.(item)}
    >
      <div className="flex items-start gap-2 mb-2">
        <span className={`flex items-center justify-center rounded p-1 ${platformColors[item.platform] || 'bg-gray-100 text-gray-600'}`}>
          {platformIcons[item.platform] || <span className="text-xs">{item.platform}</span>}
        </span>
        <Badge variant="outline" className={`text-[10px] ${statusColors[displayStatus] || 'bg-gray-100'}`}>
          {displayStatus.replace('_', ' ')}
        </Badge>
        {publishTime && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-gray-400">
            <Clock className="h-3 w-3" />
            {publishTime}
          </span>
        )}
      </div>

      {isEmail && typeof layoutData.goal === 'string' && (
        <Badge variant="outline" className="mb-2 text-[10px] bg-purple-50 text-purple-600">
          {layoutData.goal}
        </Badge>
      )}

      <p className="text-xs text-gray-700 leading-relaxed mb-2">
        {truncatedContent}
      </p>

      {!isEmail && item.hashtags && item.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {item.hashtags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] text-blue-500">#{tag}</span>
          ))}
          {item.hashtags.length > 3 && (
            <span className="text-[10px] text-gray-400">+{item.hashtags.length - 3}</span>
          )}
        </div>
      )}

      {item.status === 'pending_approval' && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[10px] text-green-600 hover:bg-green-50"
            onClick={(e) => { e.stopPropagation(); onApprove?.(item.id) }}
          >
            <Check className="h-3 w-3 mr-1" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[10px] text-red-600 hover:bg-red-50"
            onClick={(e) => { e.stopPropagation(); onReject?.(item.id) }}
          >
            <X className="h-3 w-3 mr-1" /> Reject
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[10px]"
            onClick={(e) => { e.stopPropagation(); onEdit?.(item.id) }}
          >
            <Pencil className="h-3 w-3 mr-1" /> Edit
          </Button>
        </div>
      )}
    </Card>
  )
}
