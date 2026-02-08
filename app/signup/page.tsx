'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <SignupContent />
    </Suspense>
  )
}

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedTier = searchParams.get('tier')
  const [formData, setFormData] = useState({
    fullName: '',
    organizationName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
        },
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      // If email confirmation is enabled, signUp returns a user but no session.
      // Without a session, auth.uid() is not available and RLS INSERT policies will fail.
      // Show confirmation message instead of proceeding with org/user creation.
      if (authData.user && !authData.session) {
        setError(null)
        setLoading(false)
        router.push('/login?message=Check your email to confirm your account before signing in.')
        return
      }

      // Session is available -- auth.uid() is set, RLS policies will work.
      // Order matters: org first (user needs org_id), then user (usage metrics needs user-org link).
      if (authData.user && authData.session) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: formData.organizationName,
            subscription_tier: 'starter',
            subscription_status: 'trial',
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (orgError) {
          console.error('Organization creation error:', orgError)
          setError('Account created but organization setup failed. Please contact support.')
          setLoading(false)
          return
        }

        // Create user record with organization_id (required for API routes)
        const { error: userError } = await supabase.from('users').insert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          organization_id: orgData.id,
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
        })

        if (userError) {
          console.error('User creation error:', userError)
          // Try to clean up the organization if user creation fails
          try {
            await supabase.from('organizations').delete().eq('id', orgData.id)
          } catch (cleanupErr) {
            console.error('Cleanup failed (org delete):', cleanupErr)
          }
          setError('Account created but user profile setup failed. Please contact support.')
          setLoading(false)
          return
        }

        // Also create initial usage metrics for the organization
        const { error: usageError } = await supabase.from('client_usage_metrics').insert({
          organization_id: orgData.id,
          posts_monthly: 0,
          ai_generations_monthly: 0,
          emails_sent_monthly: 0,
          engagement_rate: 0,
          created_at: new Date().toISOString(),
        })

        if (usageError) {
          console.error('Usage metrics creation error:', usageError)
        }
      }

      // Redirect to checkout if a tier was selected, otherwise dashboard
      if (selectedTier) {
        router.push(`/checkout?tier=${selectedTier}`)
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">
            Create Account
          </CardTitle>
          <CardDescription className="text-center">
            {selectedTier
              ? `Sign up to start your ${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} plan`
              : 'Start your DraggonnB CRMM journey today'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input
                id="organizationName"
                name="organizationName"
                type="text"
                placeholder="Acme Inc."
                value={formData.organizationName}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link href={selectedTier ? `/login?tier=${selectedTier}` : '/login'} className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
