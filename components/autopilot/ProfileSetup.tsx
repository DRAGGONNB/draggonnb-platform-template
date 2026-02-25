'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

interface ProfileSetupProps {
  onComplete: () => void
}

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Real Estate', 'Retail',
  'Hospitality', 'Education', 'Construction', 'Manufacturing',
  'Professional Services', 'Marketing', 'Food & Beverage', 'Other',
]

const TONES = [
  'professional', 'casual', 'friendly', 'authoritative', 'inspirational', 'conversational',
]

const PLATFORMS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter/X' },
]

const EMAIL_GOALS = [
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 're_engagement', label: 'Re-engagement' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'event_invite', label: 'Event Invite' },
]

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    business_name: '',
    industry: '',
    target_market: '',
    business_description: '',
    location: '',
    website: '',
    tone: 'professional',
    tagline: '',
    content_pillars: '',
    seo_keywords: '',
    unique_selling_points: '',
    brand_values: '',
    brand_do: '',
    brand_dont: '',
    preferred_platforms: ['linkedin', 'facebook'] as string[],
    email_campaigns_per_week: 1,
    preferred_email_goals: ['newsletter', 'promotion'] as string[],
  })

  function togglePlatform(platform: string) {
    setForm((prev) => ({
      ...prev,
      preferred_platforms: prev.preferred_platforms.includes(platform)
        ? prev.preferred_platforms.filter((p) => p !== platform)
        : [...prev.preferred_platforms, platform],
    }))
  }

  function toggleEmailGoal(goal: string) {
    setForm((prev) => ({
      ...prev,
      preferred_email_goals: prev.preferred_email_goals.includes(goal)
        ? prev.preferred_email_goals.filter((g) => g !== goal)
        : [...prev.preferred_email_goals, goal],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = {
        business_name: form.business_name,
        industry: form.industry,
        target_market: form.target_market,
        business_description: form.business_description || null,
        location: form.location || null,
        website: form.website || null,
        tone: form.tone,
        tagline: form.tagline || null,
        content_pillars: form.content_pillars ? form.content_pillars.split(',').map((s) => s.trim()) : [],
        seo_keywords: form.seo_keywords ? form.seo_keywords.split(',').map((s) => s.trim()) : [],
        unique_selling_points: form.unique_selling_points ? form.unique_selling_points.split(',').map((s) => s.trim()) : [],
        brand_values: form.brand_values ? form.brand_values.split(',').map((s) => s.trim()) : [],
        brand_do: form.brand_do ? form.brand_do.split(',').map((s) => s.trim()) : [],
        brand_dont: form.brand_dont ? form.brand_dont.split(',').map((s) => s.trim()) : [],
        preferred_platforms: form.preferred_platforms,
        email_campaigns_per_week: form.email_campaigns_per_week,
        preferred_email_goals: form.preferred_email_goals,
        autopilot_enabled: true,
      }

      const res = await fetch('/api/autopilot/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save profile')
      }

      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Set Up Your Business Autopilot</h2>
        <p className="text-sm text-gray-500 mt-1">
          Tell us about your business so the AI can create content that matches your brand.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Identity */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Business Identity</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                value={form.business_name}
                onChange={(e) => setForm((p) => ({ ...p, business_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="industry">Industry *</Label>
              <select
                id="industry"
                value={form.industry}
                onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                required
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind.toLowerCase()}>{ind}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="target_market">Target Market *</Label>
            <Input
              id="target_market"
              value={form.target_market}
              onChange={(e) => setForm((p) => ({ ...p, target_market: e.target.value }))}
              placeholder="e.g., Small business owners in South Africa"
              required
            />
          </div>

          <div>
            <Label htmlFor="business_description">Business Description</Label>
            <Textarea
              id="business_description"
              value={form.business_description}
              onChange={(e) => setForm((p) => ({ ...p, business_description: e.target.value }))}
              placeholder="Brief description of what your business does"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="e.g., Cape Town, South Africa"
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website}
                onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                placeholder="https://"
              />
            </div>
          </div>
        </div>

        {/* Brand Voice */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Brand Voice</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tone">Tone</Label>
              <select
                id="tone"
                value={form.tone}
                onChange={(e) => setForm((p) => ({ ...p, tone: e.target.value }))}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={form.tagline}
                onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="brand_values">Brand Values (comma-separated)</Label>
            <Input
              id="brand_values"
              value={form.brand_values}
              onChange={(e) => setForm((p) => ({ ...p, brand_values: e.target.value }))}
              placeholder="e.g., innovation, trust, quality"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brand_do">Voice Do&apos;s (comma-separated)</Label>
              <Input
                id="brand_do"
                value={form.brand_do}
                onChange={(e) => setForm((p) => ({ ...p, brand_do: e.target.value }))}
                placeholder="e.g., use data, be direct"
              />
            </div>
            <div>
              <Label htmlFor="brand_dont">Voice Don&apos;ts (comma-separated)</Label>
              <Input
                id="brand_dont"
                value={form.brand_dont}
                onChange={(e) => setForm((p) => ({ ...p, brand_dont: e.target.value }))}
                placeholder="e.g., no jargon, no emojis"
              />
            </div>
          </div>
        </div>

        {/* Content Strategy */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Content Strategy</h3>

          <div>
            <Label htmlFor="content_pillars">Content Pillars (comma-separated)</Label>
            <Input
              id="content_pillars"
              value={form.content_pillars}
              onChange={(e) => setForm((p) => ({ ...p, content_pillars: e.target.value }))}
              placeholder="e.g., industry insights, product tips, customer stories"
            />
          </div>

          <div>
            <Label htmlFor="seo_keywords">SEO Keywords (comma-separated)</Label>
            <Input
              id="seo_keywords"
              value={form.seo_keywords}
              onChange={(e) => setForm((p) => ({ ...p, seo_keywords: e.target.value }))}
              placeholder="e.g., CRM software, automation, small business"
            />
          </div>

          <div>
            <Label htmlFor="unique_selling_points">Unique Selling Points (comma-separated)</Label>
            <Input
              id="unique_selling_points"
              value={form.unique_selling_points}
              onChange={(e) => setForm((p) => ({ ...p, unique_selling_points: e.target.value }))}
              placeholder="e.g., AI-powered, affordable, local support"
            />
          </div>
        </div>

        {/* Platform Preferences */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Platforms</h3>

          <div>
            <Label>Social Platforms</Label>
            <div className="flex gap-2 mt-1">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => togglePlatform(p.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    form.preferred_platforms.includes(p.value)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Email Campaign Goals</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {EMAIL_GOALS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => toggleEmailGoal(g.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    form.preferred_email_goals.includes(g.value)
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="email_campaigns_per_week">Email Campaigns Per Week</Label>
            <select
              id="email_campaigns_per_week"
              value={form.email_campaigns_per_week}
              onChange={(e) => setForm((p) => ({ ...p, email_campaigns_per_week: parseInt(e.target.value) }))}
              className="w-32 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value={0}>0</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save & Activate Autopilot'
          )}
        </Button>
      </form>
    </Card>
  )
}
