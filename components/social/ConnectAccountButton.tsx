'use client'

import { Facebook, Instagram, Linkedin, Twitter, Plus } from 'lucide-react'
import type { SocialPlatform } from '@/lib/social/types'

interface ConnectAccountButtonProps {
  platform: SocialPlatform
  disabled?: boolean
}

const platformConfig = {
  facebook: {
    icon: Facebook,
    label: 'Connect Facebook',
    color: 'bg-blue-600 hover:bg-blue-700',
    oauthPath: '/api/auth/social/facebook',
  },
  instagram: {
    icon: Instagram,
    label: 'Connect Instagram',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
    oauthPath: '/api/auth/social/facebook', // Instagram uses Facebook Graph API
  },
  linkedin: {
    icon: Linkedin,
    label: 'Connect LinkedIn',
    color: 'bg-blue-700 hover:bg-blue-800',
    oauthPath: '/api/auth/social/linkedin',
  },
  twitter: {
    icon: Twitter,
    label: 'Connect Twitter/X',
    color: 'bg-black hover:bg-gray-800',
    oauthPath: '/api/auth/social/twitter',
  },
}

export function ConnectAccountButton({ platform, disabled }: ConnectAccountButtonProps) {
  const config = platformConfig[platform]
  const Icon = config.icon

  const handleConnect = () => {
    // Redirect to OAuth flow
    window.location.href = config.oauthPath
  }

  return (
    <button
      onClick={handleConnect}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${config.color}`}
    >
      <Icon className="w-5 h-5" />
      <span>{config.label}</span>
    </button>
  )
}

export function ConnectAccountDropdown() {
  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
        <Plus className="w-5 h-5" />
        <span>Connect Account</span>
      </button>
      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
        <div className="p-2 space-y-1">
          {(['facebook', 'instagram', 'linkedin'] as SocialPlatform[]).map((platform) => {
            const config = platformConfig[platform]
            const Icon = config.icon
            return (
              <button
                key={platform}
                onClick={() => window.location.href = config.oauthPath}
                className="flex items-center gap-3 w-full px-3 py-2 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                <Icon className="w-5 h-5" />
                <span>{config.label.replace('Connect ', '')}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
