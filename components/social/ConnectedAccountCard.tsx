'use client'

import { useState } from 'react'
import { Facebook, Instagram, Linkedin, Twitter, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import type { SocialAccount } from '@/lib/social/types'

interface ConnectedAccountCardProps {
  account: SocialAccount
  onDisconnect: (id: string) => Promise<void>
}

const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: Twitter,
}

const platformColors = {
  facebook: 'text-blue-600',
  instagram: 'text-pink-600',
  linkedin: 'text-blue-700',
  twitter: 'text-sky-500',
}

export function ConnectedAccountCard({ account, onDisconnect }: ConnectedAccountCardProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const Icon = platformIcons[account.platform]

  const handleDisconnect = async () => {
    if (!confirm(`Disconnect ${account.platform_display_name || account.platform_username}?`)) return
    setIsDisconnecting(true)
    try {
      await onDisconnect(account.id)
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-full bg-gray-100 dark:bg-gray-700 ${platformColors[account.platform]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">
              {account.platform_display_name || account.platform_username || account.platform}
            </span>
            {account.page_name && (
              <span className="text-sm text-gray-500">({account.page_name})</span>
            )}
            {account.status === 'active' ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Connected {new Date(account.connected_at).toLocaleDateString()}
            {account.status !== 'active' && (
              <span className="text-red-500 ml-2">
                ({account.status}{account.error_message ? `: ${account.error_message}` : ''})
              </span>
            )}
          </p>
        </div>
      </div>
      <button
        onClick={handleDisconnect}
        disabled={isDisconnecting}
        className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-50"
        title="Disconnect account"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  )
}
