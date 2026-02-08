'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import { PRICING_TIERS } from '@/lib/payments/payfast'

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tier = searchParams.get('tier')
  const [status, setStatus] = useState<'loading' | 'ready' | 'submitting' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  const selectedTier = tier && PRICING_TIERS[tier] ? PRICING_TIERS[tier] : null

  useEffect(() => {
    if (!tier || !selectedTier) {
      setStatus('error')
      setError('Invalid plan selected. Please choose a plan from our pricing page.')
      return
    }
    setStatus('ready')
  }, [tier, selectedTier])

  const handleCheckout = async () => {
    if (!tier) return
    setStatus('submitting')
    setError(null)

    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })

      if (response.status === 401) {
        // Not logged in - redirect to signup with tier
        router.push(`/signup?tier=${tier}`)
        return
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to initiate checkout')
      }

      const { paymentUrl, formData } = await response.json()

      // Create and submit form to PayFast
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
      console.error('Checkout error:', err)
      setError(err instanceof Error ? err.message : 'Failed to initiate checkout. Please try again.')
      setStatus('ready')
    }
  }

  if (!selectedTier) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">No Plan Selected</h1>
          <p className="text-gray-300 mb-6">Please choose a plan from our pricing page to continue.</p>
          <Link
            href="/pricing"
            className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            View Pricing Plans
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Complete Your Subscription</h1>
          <p className="text-gray-300">You&apos;re subscribing to the {selectedTier.name} plan</p>
        </div>

        {/* Plan Summary Card */}
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{selectedTier.name} Plan</h2>
            <div>
              <span className="text-3xl font-bold">R{selectedTier.price.toLocaleString()}</span>
              <span className="text-gray-400 ml-1">/{selectedTier.frequency}</span>
            </div>
          </div>

          <div className="border-t border-slate-600 pt-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">What&apos;s included:</h3>
            <ul className="space-y-2">
              {selectedTier.features.slice(0, 5).map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">{feature}</span>
                </li>
              ))}
              {selectedTier.features.length > 5 && (
                <li className="text-sm text-gray-400 pl-6">
                  + {selectedTier.features.length - 5} more features
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-300">
            You will be redirected to <strong>PayFast</strong> to complete your payment securely.
            Your subscription will renew monthly at R{selectedTier.price.toLocaleString()}.
            Cancel anytime with no penalties.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleCheckout}
            disabled={status === 'submitting'}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {status === 'submitting' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Redirecting to PayFast...
              </>
            ) : (
              `Pay R${selectedTier.price.toLocaleString()} / month`
            )}
          </button>

          <Link
            href="/pricing"
            className="block w-full py-3 px-4 border border-slate-600 hover:border-slate-500 rounded-lg font-semibold transition-colors text-center"
          >
            Change Plan
          </Link>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          Payments are processed securely by PayFast.
        </p>
      </div>
    </div>
  )
}
