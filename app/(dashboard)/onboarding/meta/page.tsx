'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Users,
  Mail,
  Share2,
  Palette,
  Bot,
  Hotel,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Check,
  Loader2,
  ArrowRight,
  Shield,
  Smartphone,
  Link2,
  AlertCircle,
} from 'lucide-react'
import { MetaEmbeddedSignup } from '@/components/onboarding/MetaEmbeddedSignup'
import { WABAShareGuide } from '@/components/onboarding/WABAShareGuide'
import { POPIAAgreement } from '@/components/onboarding/POPIAAgreement'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MetaPath = 'A' | 'B' | null

interface BusinessDetails {
  businessName: string
  tradingName: string
  registrationNumber: string
  whatsappNumber: string
  businessEmail: string
  businessAddress: string
}

type ModuleKey = 'crm' | 'email' | 'social' | 'content_studio' | 'accommodation' | 'ai_agents'

interface POPIAState {
  accepted: boolean
  timestamp: string | null
}

type ActivationStage = 'verifying' | 'registering_webhook' | 'provisioning' | 'finalizing' | 'complete'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// DraggonnB's Meta Business Portfolio ID
// In production, this would come from an env variable
const DRAGGONNB_PORTFOLIO_ID = process.env.NEXT_PUBLIC_META_PORTFOLIO_ID || '000000000000000'

const STEPS_MODEL_A = [
  { id: 1, label: 'Welcome' },
  { id: 2, label: 'Business Details' },
  { id: 3, label: 'Module' },
  { id: 4, label: 'POPIA & DPA' },
  { id: 5, label: 'Connect WhatsApp' },
  { id: 6, label: 'Activate' },
] as const

const STEPS_MODEL_B = [
  { id: 1, label: 'Welcome' },
  { id: 2, label: 'Business Details' },
  { id: 3, label: 'Module' },
  { id: 4, label: 'POPIA & DPA' },
  { id: 5, label: 'Link WABA' },
  { id: 6, label: 'Activate' },
] as const

const MODULE_OPTIONS: {
  key: ModuleKey
  name: string
  description: string
  icon: React.ElementType
}[] = [
  {
    key: 'crm',
    name: 'CRM',
    description: 'Manage contacts, companies, and deal pipelines.',
    icon: Users,
  },
  {
    key: 'email',
    name: 'Email Marketing',
    description: 'Send campaigns, sequences, and track engagement.',
    icon: Mail,
  },
  {
    key: 'social',
    name: 'Social Media',
    description: 'Schedule posts and manage your social presence.',
    icon: Share2,
  },
  {
    key: 'content_studio',
    name: 'Content Studio',
    description: 'AI-powered content generation for all channels.',
    icon: Palette,
  },
  {
    key: 'accommodation',
    name: 'Accommodation',
    description: 'Property management, bookings, and guest ops.',
    icon: Hotel,
  },
  {
    key: 'ai_agents',
    name: 'AI Agents',
    description: 'Automated lead qualification and proposals.',
    icon: Bot,
  },
]

const ACTIVATION_STAGES: { key: ActivationStage; label: string }[] = [
  { key: 'verifying', label: 'Verifying business details...' },
  { key: 'registering_webhook', label: 'Registering WhatsApp webhook...' },
  { key: 'provisioning', label: 'Provisioning your account...' },
  { key: 'finalizing', label: 'Finalizing setup...' },
  { key: 'complete', label: 'Setup complete' },
]

// ---------------------------------------------------------------------------
// Step: Welcome (Path Selection)
// ---------------------------------------------------------------------------

function StepWelcome({
  metaPath,
  onSelect,
}: {
  metaPath: MetaPath
  onSelect: (path: MetaPath) => void
}) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <MessageSquare className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">WhatsApp Business Setup</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Connect your business to WhatsApp via the Meta Business API.
          Choose how you would like to get started.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            metaPath === 'A' ? 'border-primary/50 shadow-md' : ''
          }`}
          onClick={() => onSelect('A')}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <Badge className="bg-success text-success-foreground text-[10px]">
                RECOMMENDED
              </Badge>
            </div>
            <CardTitle className="text-base mt-3">Start Fresh</CardTitle>
            <CardDescription>
              We will create a new WhatsApp Business Account for you through
              Meta&apos;s secure Embedded Signup. Fastest path to get going.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            metaPath === 'B' ? 'border-primary/50 shadow-md' : ''
          }`}
          onClick={() => onSelect('B')}
        >
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Link2 className="h-5 w-5" />
            </div>
            <CardTitle className="text-base mt-3">
              I Already Have WhatsApp Business
            </CardTitle>
            <CardDescription>
              Link an existing WhatsApp Business Account (WABA) by sharing
              partner access with DraggonnB.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step: Business Details
// ---------------------------------------------------------------------------

function StepBusinessDetails({
  details,
  onChange,
}: {
  details: BusinessDetails
  onChange: (partial: Partial<BusinessDetails>) => void
}) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Business Details</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          We need a few details about your business for Meta verification and POPIA compliance.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="businessName">
            Registered Business Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="businessName"
            placeholder="e.g. Acme Solutions (Pty) Ltd"
            value={details.businessName}
            onChange={(e) => onChange({ businessName: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tradingName">Trading Name</Label>
          <Input
            id="tradingName"
            placeholder="e.g. Acme Solutions"
            value={details.tradingName}
            onChange={(e) => onChange({ tradingName: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="registrationNumber">Company Registration / ID Number</Label>
          <Input
            id="registrationNumber"
            placeholder="e.g. 2024/123456/07"
            value={details.registrationNumber}
            onChange={(e) => onChange({ registrationNumber: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsappNumber">
            WhatsApp Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="whatsappNumber"
            placeholder="+27812345678"
            value={details.whatsappNumber}
            onChange={(e) => onChange({ whatsappNumber: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            South African format: +27 followed by 9 digits
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessEmail">
            Business Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="businessEmail"
            type="email"
            placeholder="admin@yourbusiness.co.za"
            value={details.businessEmail}
            onChange={(e) => onChange({ businessEmail: e.target.value })}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="businessAddress">Business Address</Label>
          <Input
            id="businessAddress"
            placeholder="123 Main Road, Johannesburg, 2001"
            value={details.businessAddress}
            onChange={(e) => onChange({ businessAddress: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step: Module Selection
// ---------------------------------------------------------------------------

function StepModuleSelect({
  selected,
  onSelect,
}: {
  selected: ModuleKey | null
  onSelect: (key: ModuleKey) => void
}) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Smartphone className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Primary Module</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Select the main module you want to use with WhatsApp integration.
          You can add more modules later from the dashboard.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MODULE_OPTIONS.map((mod) => {
          const Icon = mod.icon
          const isSelected = selected === mod.key

          return (
            <Card
              key={mod.key}
              className={`cursor-pointer transition-all hover:shadow-sm ${
                isSelected ? 'border-primary/50 shadow-md' : ''
              }`}
              onClick={() => onSelect(mod.key)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      isSelected
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{mod.name}</p>
                      {isSelected && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {mod.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step: POPIA
// ---------------------------------------------------------------------------

function StepPOPIA({
  businessName,
  popia,
  onAcceptChange,
}: {
  businessName: string
  popia: POPIAState
  onAcceptChange: (accepted: boolean, timestamp: string | null) => void
}) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">POPIA & Data Processing</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Review and accept the Data Processing Agreement to comply with South African
          data protection law.
        </p>
      </div>

      <POPIAAgreement
        businessName={businessName}
        accepted={popia.accepted}
        onAcceptChange={onAcceptChange}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 5A: Connect WhatsApp (Model A - Embedded Signup)
// ---------------------------------------------------------------------------

function StepConnectWhatsApp({
  onComplete,
  onError,
  connected,
}: {
  onComplete: (data: { wabaId: string; phoneNumberId: string }) => void
  onError: (error: string) => void
  connected: boolean
}) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <MessageSquare className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Connect WhatsApp</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {connected
            ? 'Your WhatsApp Business Account is connected.'
            : 'Launch Meta Embedded Signup to create and connect your WhatsApp Business Account.'}
        </p>
      </div>

      <MetaEmbeddedSignup onComplete={onComplete} onError={onError} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 5B: Link Existing WABA (Model B)
// ---------------------------------------------------------------------------

function StepLinkWABA({
  wabaId,
  onWabaIdChange,
}: {
  wabaId: string
  onWabaIdChange: (id: string) => void
}) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Link2 className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Link Your WhatsApp Account</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Enter your existing WABA ID and share partner access so DraggonnB can manage
          messaging on your behalf.
        </p>
      </div>

      <WABAShareGuide
        wabaId={wabaId}
        onWabaIdChange={onWabaIdChange}
        portfolioId={DRAGGONNB_PORTFOLIO_ID}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step: Verify & Activate
// ---------------------------------------------------------------------------

function StepActivate({
  details,
  selectedModule,
  metaPath,
  popia,
  activating,
  activationStage,
  activated,
  error,
  onActivate,
}: {
  details: BusinessDetails
  selectedModule: ModuleKey | null
  metaPath: MetaPath
  popia: POPIAState
  activating: boolean
  activationStage: ActivationStage | null
  activated: boolean
  error: string | null
  onActivate: () => void
}) {
  if (activated) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <Check className="h-10 w-10 text-success" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">You are all set!</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your WhatsApp Business integration is configured and ready to use.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button size="lg" asChild>
            <a href="/dashboard">
              Open Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href="/api/meta/test-message">
              Send Test Message
            </a>
          </Button>
          <Button variant="ghost" size="lg" asChild>
            <a href="/onboarding">
              Add Another Module
            </a>
          </Button>
        </div>
      </div>
    )
  }

  const moduleName = MODULE_OPTIONS.find((m) => m.key === selectedModule)?.name || '--'
  const pathLabel = metaPath === 'A' ? 'Embedded Signup (New WABA)' : 'Existing WABA (Partner Access)'

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Verify & Activate</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Review your setup details and activate your WhatsApp Business integration.
        </p>
      </div>

      {/* Summary Table */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            <SummaryRow label="Business Name" value={details.businessName} />
            <SummaryRow label="Email" value={details.businessEmail} />
            <SummaryRow label="WhatsApp Number" value={details.whatsappNumber} />
            <SummaryRow label="Primary Module" value={moduleName} />
            <SummaryRow label="Setup Path" value={pathLabel} />
            <SummaryRow
              label="POPIA Status"
              value={
                popia.accepted ? (
                  <Badge className="bg-success text-success-foreground">Accepted</Badge>
                ) : (
                  <Badge variant="destructive">Not Accepted</Badge>
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Activation failed</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {/* Activation Progress */}
      {activating && activationStage && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {ACTIVATION_STAGES.map((stage) => {
              const stageIndex = ACTIVATION_STAGES.findIndex((s) => s.key === stage.key)
              const currentIndex = ACTIVATION_STAGES.findIndex(
                (s) => s.key === activationStage
              )
              const isDone = stageIndex < currentIndex
              const isCurrent = stageIndex === currentIndex
              const isPending = stageIndex > currentIndex

              return (
                <div key={stage.key} className="flex items-center gap-3">
                  {isDone && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10">
                      <Check className="h-3.5 w-3.5 text-success" />
                    </div>
                  )}
                  {isCurrent && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  )}
                  {isPending && (
                    <div className="h-6 w-6 shrink-0 rounded-full border-2 border-muted" />
                  )}
                  <span
                    className={`text-sm ${
                      isDone
                        ? 'text-muted-foreground line-through'
                        : isCurrent
                        ? 'font-medium'
                        : 'text-muted-foreground/50'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {!activating && (
        <div className="text-center pt-2">
          <Button size="lg" onClick={onActivate} className="gap-2 px-8">
            <Sparkles className="h-4 w-4" />
            Activate My Account
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            You can change these settings later from the Settings page.
          </p>
        </div>
      )}
    </div>
  )
}

function SummaryRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || '--'}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Wizard Page
// ---------------------------------------------------------------------------

export default function MetaOnboardingPage() {
  const [step, setStep] = useState(1)
  const [metaPath, setMetaPath] = useState<MetaPath>(null)

  const [details, setDetails] = useState<BusinessDetails>({
    businessName: '',
    tradingName: '',
    registrationNumber: '',
    whatsappNumber: '',
    businessEmail: '',
    businessAddress: '',
  })

  const [selectedModule, setSelectedModule] = useState<ModuleKey | null>(null)

  const [popia, setPopia] = useState<POPIAState>({
    accepted: false,
    timestamp: null,
  })

  // Model A state
  const [embeddedSignupData, setEmbeddedSignupData] = useState<{
    wabaId: string
    phoneNumberId: string
  } | null>(null)

  // Model B state
  const [wabaId, setWabaId] = useState('')

  // Activation state
  const [activating, setActivating] = useState(false)
  const [activationStage, setActivationStage] = useState<ActivationStage | null>(null)
  const [activated, setActivated] = useState(false)
  const [activationError, setActivationError] = useState<string | null>(null)

  const steps = metaPath === 'B' ? STEPS_MODEL_B : STEPS_MODEL_A
  const totalSteps = steps.length
  const progressValue = (step / totalSteps) * 100

  const handleDetailsChange = useCallback((partial: Partial<BusinessDetails>) => {
    setDetails((prev) => ({ ...prev, ...partial }))
  }, [])

  const handlePOPIAChange = useCallback((accepted: boolean, timestamp: string | null) => {
    setPopia({ accepted, timestamp })
  }, [])

  const handleEmbeddedSignupComplete = useCallback(
    (data: { wabaId: string; phoneNumberId: string }) => {
      setEmbeddedSignupData(data)
    },
    []
  )

  const handleEmbeddedSignupError = useCallback((error: string) => {
    console.error('Meta Embedded Signup error:', error)
  }, [])

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return metaPath !== null
      case 2:
        return (
          details.businessName.trim().length > 0 &&
          /^\+27\d{9}$/.test(details.whatsappNumber) &&
          details.businessEmail.includes('@')
        )
      case 3:
        return selectedModule !== null
      case 4:
        return popia.accepted
      case 5:
        if (metaPath === 'A') {
          return embeddedSignupData !== null
        }
        return wabaId.length >= 10
      default:
        return true
    }
  }

  const runActivation = async () => {
    setActivating(true)
    setActivationError(null)

    const stages: ActivationStage[] = [
      'verifying',
      'registering_webhook',
      'provisioning',
      'finalizing',
      'complete',
    ]

    try {
      for (const stage of stages) {
        setActivationStage(stage)
        if (stage === 'complete') break

        if (stage === 'verifying') {
          // Submit data to API
          const res = await fetch('/api/onboarding/meta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessName: details.businessName,
              tradingName: details.tradingName,
              registrationNumber: details.registrationNumber,
              whatsappNumber: details.whatsappNumber,
              businessEmail: details.businessEmail,
              businessAddress: details.businessAddress,
              selectedModule,
              popiaAccepted: popia.accepted,
              popiaTimestamp: popia.timestamp,
              metaPath,
              wabaId: metaPath === 'B' ? wabaId : undefined,
              embeddedSignupWabaId: embeddedSignupData?.wabaId,
              embeddedSignupPhoneNumberId: embeddedSignupData?.phoneNumberId,
            }),
          })

          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || 'Verification failed')
          }

          // Simulate brief delay for UX
          await new Promise((r) => setTimeout(r, 800))
        } else {
          // Simulate remaining stages (real provisioning in Phase 08.5)
          await new Promise((r) => setTimeout(r, 1200))
        }
      }

      setActivated(true)
    } catch (err) {
      setActivationError(err instanceof Error ? err.message : 'Activation failed')
      setActivating(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Meta WhatsApp Setup</h1>
        <p className="text-muted-foreground mt-1">
          Connect your business to WhatsApp via the Meta Business API.
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Step {step} of {totalSteps}: {steps[step - 1].label}
          </span>
          <span className="text-muted-foreground">{Math.round(progressValue)}%</span>
        </div>
        <Progress value={progressValue} className="h-2" />
        <div className="hidden sm:flex items-center justify-between">
          {steps.map((s) => (
            <button
              key={s.id}
              onClick={() => !activated && !activating && s.id <= step && setStep(s.id)}
              disabled={activated || activating || s.id > step}
              className={`text-xs transition-colors ${
                s.id === step
                  ? 'text-primary font-medium'
                  : s.id < step
                  ? 'text-muted-foreground hover:text-foreground cursor-pointer'
                  : 'text-muted-foreground/40'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="p-6 sm:p-8">
        {step === 1 && <StepWelcome metaPath={metaPath} onSelect={setMetaPath} />}

        {step === 2 && (
          <StepBusinessDetails details={details} onChange={handleDetailsChange} />
        )}

        {step === 3 && (
          <StepModuleSelect selected={selectedModule} onSelect={setSelectedModule} />
        )}

        {step === 4 && (
          <StepPOPIA
            businessName={details.businessName}
            popia={popia}
            onAcceptChange={handlePOPIAChange}
          />
        )}

        {step === 5 && metaPath === 'A' && (
          <StepConnectWhatsApp
            onComplete={handleEmbeddedSignupComplete}
            onError={handleEmbeddedSignupError}
            connected={embeddedSignupData !== null}
          />
        )}

        {step === 5 && metaPath === 'B' && (
          <StepLinkWABA wabaId={wabaId} onWabaIdChange={setWabaId} />
        )}

        {step === 6 && (
          <StepActivate
            details={details}
            selectedModule={selectedModule}
            metaPath={metaPath}
            popia={popia}
            activating={activating}
            activationStage={activationStage}
            activated={activated}
            error={activationError}
            onActivate={runActivation}
          />
        )}
      </Card>

      {/* Navigation */}
      {!activated && !activating && (
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {step < totalSteps ? (
            <Button
              onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
              disabled={!canProceed()}
              className="gap-1"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <div />
          )}
        </div>
      )}
    </div>
  )
}
