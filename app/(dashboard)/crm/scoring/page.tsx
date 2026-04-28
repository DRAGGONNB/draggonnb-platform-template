import Link from 'next/link'
import { BarChart3, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LeadScoringPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/crm">
          <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-all hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Scoring</h1>
          <p className="mt-0.5 text-sm text-gray-500">Engagement-based lead prioritisation</p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <BarChart3 className="h-5 w-5 text-orange-500" />
            Scoring dashboard coming in v3.1
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Lead scoring tracks engagement signals (email opens, click-throughs, replies, and
            manual activity entries) and surfaces your hottest prospects in the CRM Easy view.
          </p>
          <p className="text-sm text-gray-600">
            The full scoring dashboard — ranking all contacts by score with drill-down into
            each signal — is scheduled for the v3.1 release. In the meantime, your top-scored
            leads appear automatically in the <strong>Hot leads</strong> card on the{' '}
            <Link href="/crm" className="font-medium text-primary hover:underline">
              CRM overview
            </Link>
            .
          </p>
          <div className="rounded-lg border border-orange-100 bg-orange-50 px-4 py-3">
            <p className="text-sm font-medium text-orange-800">
              Scores are calculated nightly by the CRM engagement workflow.
              They update automatically as your contacts interact with your emails and campaigns.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
