'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, AlertCircle, ExternalLink } from 'lucide-react'

type SignupStatus = 'idle' | 'connecting' | 'connected' | 'error'

interface MetaEmbeddedSignupProps {
  onComplete: (data: { wabaId: string; phoneNumberId: string }) => void
  onError: (error: string) => void
}

export function MetaEmbeddedSignup({ onComplete, onError }: MetaEmbeddedSignupProps) {
  const [status, setStatus] = useState<SignupStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Only accept messages from our own origin
      if (event.origin !== window.location.origin) return

      const data = event.data
      if (!data || data.type !== 'meta-embedded-signup-result') return

      if (data.success) {
        setStatus('connected')
        onComplete({
          wabaId: data.wabaId,
          phoneNumberId: data.phoneNumberId,
        })
      } else {
        setStatus('error')
        const msg = data.error || 'Meta signup failed'
        setErrorMessage(msg)
        onError(msg)
      }
    },
    [onComplete, onError]
  )

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  const launchSignup = () => {
    setStatus('connecting')
    setErrorMessage(null)

    const width = 600
    const height = 700
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const popup = window.open(
      '/api/meta/embedded-signup',
      'meta-embedded-signup',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    )

    if (!popup) {
      setStatus('error')
      const msg = 'Popup was blocked. Please allow popups for this site.'
      setErrorMessage(msg)
      onError(msg)
      return
    }

    // Poll for popup close without completion
    const interval = setInterval(() => {
      if (popup.closed) {
        clearInterval(interval)
        setStatus((prev) => {
          if (prev === 'connecting') {
            const msg = 'Signup window was closed before completion'
            setErrorMessage(msg)
            onError(msg)
            return 'error'
          }
          return prev
        })
      }
    }, 1000)
  }

  const retry = () => {
    setStatus('idle')
    setErrorMessage(null)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Clicking the button below will open a secure Meta popup where you can:
        </p>
        <ul className="text-sm text-muted-foreground space-y-1.5 ml-4 list-disc">
          <li>Authorize DraggonnB to manage your WhatsApp Business Account</li>
          <li>Create or select a WhatsApp Business Account (WABA)</li>
          <li>Verify your phone number for WhatsApp messaging</li>
          <li>Register webhooks for incoming messages</li>
        </ul>
      </div>

      {status === 'idle' && (
        <Button onClick={launchSignup} className="gap-2">
          <ExternalLink className="h-4 w-4" />
          Launch Meta Signup
        </Button>
      )}

      {status === 'connecting' && (
        <div className="flex items-center gap-3">
          <Button disabled className="gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting to Meta...
          </Button>
          <span className="text-xs text-muted-foreground">
            Complete the signup in the popup window
          </span>
        </div>
      )}

      {status === 'connected' && (
        <div className="flex items-center gap-3 rounded-lg border border-success/50 bg-success/10 p-3">
          <Check className="h-5 w-5 text-success" />
          <div>
            <p className="text-sm font-medium">WhatsApp Business Account connected</p>
            <p className="text-xs text-muted-foreground">
              Your account has been linked successfully.
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto">Connected</Badge>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Connection failed</p>
              <p className="text-xs text-muted-foreground">
                {errorMessage || 'An unknown error occurred during Meta signup.'}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={retry} size="sm">
            Try Again
          </Button>
        </div>
      )}

      <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground/70 mb-1">Security Notice</p>
        <p>
          This uses Meta&apos;s official Embedded Signup flow. Your Meta credentials are
          never shared with DraggonnB. The popup connects directly to Meta&apos;s servers.
        </p>
      </div>
    </div>
  )
}
