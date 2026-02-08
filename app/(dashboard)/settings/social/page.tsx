'use client'

import { useEffect, useState } from 'react'
import { ConnectedAccountCard } from '@/components/social/ConnectedAccountCard'
import { ConnectAccountDropdown } from '@/components/social/ConnectAccountButton'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { Share2, Loader2 } from 'lucide-react'
import type { SocialAccount } from '@/lib/social/types'

export default function SocialAccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/social/accounts')
      if (!res.ok) throw new Error('Failed to fetch accounts')
      const data = await res.json()
      setAccounts(data.accounts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async (id: string) => {
    const res = await fetch(`/api/social/accounts/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to disconnect')
    setAccounts(accounts.filter(a => a.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Social Accounts</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Connect your social media accounts to publish content directly from DraggonnB
          </p>
        </div>
        <ConnectAccountDropdown />
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {accounts.length === 0 ? (
        <EmptyState
          icon={Share2}
          title="No accounts connected"
          description="Connect your social media accounts to start publishing content"
        />
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <ConnectedAccountCard
              key={account.id}
              account={account}
              onDisconnect={handleDisconnect}
            />
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <h3 className="font-medium text-gray-900 dark:text-white mb-2">Supported Platforms</h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• <strong>Facebook</strong> - Publish to Pages (requires Page admin access)</li>
          <li>• <strong>Instagram</strong> - Publish to Business/Creator accounts (via Facebook)</li>
          <li>• <strong>LinkedIn</strong> - Publish to personal profiles and company pages</li>
        </ul>
      </div>
    </div>
  )
}
