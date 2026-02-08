'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Building2,
  Globe,
  Mail,
  Phone,
  User,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Brain,
} from 'lucide-react'

const industries = [
  { value: 'retail', label: 'Retail' },
  { value: 'ecommerce', label: 'E-Commerce' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'financial_services', label: 'Financial Services' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'construction', label: 'Construction' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'education', label: 'Education' },
  { value: 'technology', label: 'Technology' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'legal', label: 'Legal' },
  { value: 'marketing_agency', label: 'Marketing Agency' },
  { value: 'other', label: 'Other' },
]

const companySizes = [
  { value: '1-5', label: '1-5 employees' },
  { value: '6-20', label: '6-20 employees' },
  { value: '21-50', label: '21-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '200+', label: '200+ employees' },
]

export default function QualifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800" />}>
      <QualifyForm />
    </Suspense>
  )
}

function QualifyForm() {
  const searchParams = useSearchParams()

  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [website, setWebsite] = useState('')
  const [industry, setIndustry] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [issue1, setIssue1] = useState('')
  const [issue2, setIssue2] = useState('')
  const [issue3, setIssue3] = useState('')
  const [honeypot, setHoneypot] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (searchParams.get('prefill') === 'true') {
      try {
        const savedEmail = localStorage.getItem('qualify_email')
        const savedCompany = localStorage.getItem('qualify_company')
        if (savedEmail) setEmail(savedEmail)
        if (savedCompany) setCompanyName(savedCompany)
      } catch {
        // localStorage may not be available
      }
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_name: contactName,
          email,
          phone,
          company_name: companyName,
          website,
          industry,
          company_size: companySize,
          business_issues: [issue1, issue2, issue3],
          source: 'qualify_form',
          honeypot,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong. Please try again.')
      }

      setIsSuccess(true)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClasses =
    'w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-3 text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'
  const selectClasses =
    'w-full rounded-lg border border-white/10 bg-slate-900/50 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'
  const labelClasses = 'mb-1.5 block text-sm font-medium text-slate-300'

  // Confirmation view
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
        {/* Header */}
        <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold gradient-text">DraggonnB</span>
              <span className="text-sm font-medium text-slate-400">CRMM</span>
            </Link>
          </div>
        </header>

        <main className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="w-full max-w-lg text-center">
            {/* Success icon */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20">
              <CheckCircle2 className="h-10 w-10 text-green-400" />
            </div>

            <h1 className="mb-4 text-3xl font-bold text-white">
              Your Challenges Are Being Analyzed
            </h1>

            <p className="mb-10 text-lg text-slate-300">
              Our AI is reviewing your business needs right now. You&apos;ll receive a
              personalized solution proposal within 2 hours at{' '}
              <span className="font-medium text-white">{email}</span>.
            </p>

            {/* What happens next */}
            <div className="mb-10 rounded-xl border border-white/10 bg-slate-800/60 p-6 text-left">
              <h2 className="mb-5 text-lg font-semibold text-white">What happens next?</h2>
              <ol className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    1
                  </span>
                  <p className="text-sm text-slate-300">
                    AI analyzes your 3 business challenges
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    2
                  </span>
                  <p className="text-sm text-slate-300">
                    We match solutions from our automation library
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    3
                  </span>
                  <p className="text-sm text-slate-300">
                    You receive a detailed proposal with pricing
                  </p>
                </li>
              </ol>
            </div>

            <Button asChild size="lg" className="btn-futuristic h-12 rounded-xl px-8 text-base">
              <Link href="/">
                Back to Home
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  // Form view
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold gradient-text">DraggonnB</span>
            <span className="text-sm font-medium text-slate-400">CRMM</span>
          </Link>
        </div>
      </header>

      <main className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-2xl">
          {/* Background glow */}
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[120px]" />

          {/* Card */}
          <div className="relative rounded-2xl border border-white/10 bg-slate-800/60 p-8 shadow-2xl backdrop-blur-sm sm:p-10">
            {/* Title */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">
                Tell Us About Your{' '}
                <span className="gradient-text">Business Challenges</span>
              </h1>
              <p className="text-sm text-slate-400 sm:text-base">
                Our AI will analyze your needs and propose a custom automation solution
                tailored to your business.
              </p>
            </div>

            {/* Error message */}
            {errorMessage && (
              <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact details */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact_name" className={labelClasses}>
                    <User className="mr-1.5 inline h-3.5 w-3.5" />
                    Contact Name
                  </label>
                  <input
                    id="contact_name"
                    type="text"
                    placeholder="Your full name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label htmlFor="email" className={labelClasses}>
                    <Mail className="mr-1.5 inline h-3.5 w-3.5" />
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="you@company.co.za"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="phone" className={labelClasses}>
                    <Phone className="mr-1.5 inline h-3.5 w-3.5" />
                    Phone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+27 XX XXX XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label htmlFor="company_name" className={labelClasses}>
                    <Building2 className="mr-1.5 inline h-3.5 w-3.5" />
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="company_name"
                    type="text"
                    required
                    placeholder="Your company name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="website" className={labelClasses}>
                  <Globe className="mr-1.5 inline h-3.5 w-3.5" />
                  Website
                </label>
                <input
                  id="website"
                  type="url"
                  placeholder="https://yourcompany.co.za"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className={inputClasses}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="industry" className={labelClasses}>
                    Industry
                  </label>
                  <select
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className={selectClasses}
                  >
                    <option value="" disabled>
                      Select your industry
                    </option>
                    {industries.map((ind) => (
                      <option key={ind.value} value={ind.value}>
                        {ind.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="company_size" className={labelClasses}>
                    Company Size
                  </label>
                  <select
                    id="company_size"
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className={selectClasses}
                  >
                    <option value="" disabled>
                      Select company size
                    </option>
                    {companySizes.map((size) => (
                      <option key={size.value} value={size.value}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/10" />

              {/* Business challenges */}
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-400" />
                  <h2 className="text-lg font-semibold text-white">Your Business Challenges</h2>
                </div>
                <p className="mb-4 text-sm text-slate-400">
                  Describe up to 3 areas where your business is struggling. Our AI will use these
                  to craft a tailored automation proposal.
                </p>
              </div>

              <div>
                <label htmlFor="issue1" className={labelClasses}>
                  Business Challenge 1 <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="issue1"
                  required
                  rows={3}
                  placeholder="Describe your first key business area causing issues..."
                  value={issue1}
                  onChange={(e) => setIssue1(e.target.value)}
                  className={inputClasses + ' resize-none'}
                />
              </div>

              <div>
                <label htmlFor="issue2" className={labelClasses}>
                  Business Challenge 2 <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="issue2"
                  required
                  rows={3}
                  placeholder="What's another area where you're losing time or money?"
                  value={issue2}
                  onChange={(e) => setIssue2(e.target.value)}
                  className={inputClasses + ' resize-none'}
                />
              </div>

              <div>
                <label htmlFor="issue3" className={labelClasses}>
                  Business Challenge 3 <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="issue3"
                  required
                  rows={3}
                  placeholder="Is there a third challenge we could help automate?"
                  value={issue3}
                  onChange={(e) => setIssue3(e.target.value)}
                  className={inputClasses + ' resize-none'}
                />
              </div>

              {/* Honeypot */}
              <input
                type="text"
                name="website_url"
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="btn-futuristic h-12 w-full rounded-xl text-base"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing Your Challenges...
                  </>
                ) : (
                  <>
                    Get Your AI Solution
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
