'use client'

import { useState, useRef, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface POPIAAgreementProps {
  businessName: string
  accepted: boolean
  onAcceptChange: (accepted: boolean, timestamp: string | null) => void
}

const SECTIONS = [
  {
    title: '1. Data Controller',
    content: `Your organization ("the Client") is the Data Controller for all personal information processed through the DraggonnB platform. As Data Controller, you determine the purposes and means of processing personal data of your customers, contacts, and leads. You are responsible for ensuring a lawful basis for processing under the Protection of Personal Information Act (POPIA), 2013.`,
  },
  {
    title: '2. Data Processor',
    content: `DraggonnB (Pty) Ltd acts as the Data Processor on your behalf. We process personal information solely to provide the services you have contracted, including CRM, messaging, marketing automation, and related features. We will not process personal data for any purpose other than delivering the agreed services, and we will not sell, share, or disclose personal data to third parties except as required to provide the service or as required by law.`,
  },
  {
    title: '3. WhatsApp Data',
    content: `When using the WhatsApp Business API integration, message content, phone numbers, and conversation metadata are transmitted through Meta's infrastructure. DraggonnB stores message logs and contact records to enable features such as conversation history, automated responses, and analytics. Message content is stored in your organization's isolated database partition and is not accessible to other tenants. WhatsApp data retention follows Meta's policies (90-day conversation window) and your configured retention settings.`,
  },
  {
    title: '4. POPIA Rights',
    content: `You acknowledge your obligation to honour data subject rights under POPIA, including the right to access, correction, deletion, and objection to processing. DraggonnB provides tools within the platform to facilitate these rights, including contact data export, data deletion requests, and consent tracking. You are responsible for responding to data subject requests within the timeframes required by POPIA. DraggonnB will assist with data subject requests where technically feasible and will notify you if we receive a request directly.`,
  },
  {
    title: '5. Breach Notification',
    content: `In the event of a data breach that affects personal information processed on your behalf, DraggonnB will notify you without undue delay, and in any event within 72 hours of becoming aware of the breach. The notification will include the nature of the breach, the categories and approximate number of data subjects affected, the likely consequences, and the measures taken or proposed to address the breach. You are responsible for notifying the Information Regulator and affected data subjects as required under POPIA Section 22.`,
  },
  {
    title: '6. Third Parties & Sub-processors',
    content: `DraggonnB uses the following sub-processors to deliver the service: Supabase (database hosting, based in AWS regions), Vercel (application hosting), Resend (email delivery), Meta/WhatsApp (messaging API), and PayFast (payment processing, South Africa). All sub-processors are contractually bound to data protection obligations equivalent to those in this agreement. We will notify you of any changes to sub-processors with reasonable advance notice. Data may be transferred outside of South Africa to the extent necessary for service delivery, and such transfers comply with POPIA Section 72 requirements.`,
  },
] as const

export function POPIAAgreement({ businessName, accepted, onAcceptChange }: POPIAAgreementProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const handleScroll = () => {
      const threshold = 20
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
      if (atBottom) {
        setHasScrolledToBottom(true)
      }
    }

    el.addEventListener('scroll', handleScroll)
    // Check initial state (content might not need scrolling)
    handleScroll()
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  const handleCheckedChange = (checked: boolean | 'indeterminate') => {
    const isAccepted = checked === true
    onAcceptChange(isAccepted, isAccepted ? new Date().toISOString() : null)
  }

  return (
    <div className="space-y-4">
      <div
        ref={scrollRef}
        className="h-[320px] overflow-y-auto rounded-lg border bg-muted/20 p-4 space-y-4 text-sm"
      >
        <div className="text-center space-y-1 mb-4">
          <h3 className="font-semibold text-base">
            Data Processing Agreement & POPIA Compliance
          </h3>
          <p className="text-xs text-muted-foreground">
            Between {businessName || '[Your Business]'} and DraggonnB (Pty) Ltd
          </p>
        </div>

        {SECTIONS.map((section, index) => (
          <div key={index}>
            <h4 className="font-medium mb-1">{section.title}</h4>
            <p className="text-muted-foreground text-xs leading-relaxed">{section.content}</p>
            {index < SECTIONS.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}
      </div>

      {!hasScrolledToBottom && (
        <p className="text-xs text-muted-foreground text-center">
          Please scroll to the bottom of the agreement to enable acceptance.
        </p>
      )}

      <div className="flex items-start gap-3 rounded-lg border p-3">
        <Checkbox
          id="popia-accept"
          checked={accepted}
          onCheckedChange={handleCheckedChange}
          disabled={!hasScrolledToBottom}
        />
        <Label
          htmlFor="popia-accept"
          className={`text-sm leading-relaxed cursor-pointer ${
            !hasScrolledToBottom ? 'text-muted-foreground' : ''
          }`}
        >
          I confirm that I have authority to bind{' '}
          <span className="font-medium">{businessName || '[Your Business]'}</span> to this
          Data Processing Agreement and that I have read and understood the POPIA compliance
          terms above.
        </Label>
      </div>
    </div>
  )
}
