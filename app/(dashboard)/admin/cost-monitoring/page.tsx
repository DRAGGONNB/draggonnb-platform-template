import { getCostMonitoringRows } from '@/lib/admin/cost-monitoring'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { redirect } from 'next/navigation'
import { CostTable } from './_components/cost-table'

export const dynamic = 'force-dynamic'

export default async function CostMonitoringPage() {
  const { data: userOrg, error } = await getUserOrg()

  if (error || !userOrg) {
    redirect('/login')
  }

  // user_role enum: {admin, manager, user, client}
  // Cost monitoring is platform-operator only — requires 'admin' role
  if (userOrg.role !== 'admin') {
    redirect('/dashboard')
  }

  let rows
  let fetchError: string | null = null

  try {
    rows = await getCostMonitoringRows()
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Unknown error'
    rows = []
  }

  const flaggedCount = rows.filter((r) => r.isOverFortyPctMrrFlag).length
  const totalMRRCents = rows.reduce((sum, r) => sum + r.mrrZarCents, 0)
  const totalCostMTDCents = rows.reduce((sum, r) => sum + r.costMTDZarCents, 0)

  function formatZAR(cents: number) {
    return `R${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-[#363940]">Cost Monitoring</h1>
        <p className="mt-1 text-sm text-gray-500">
          Anthropic AI cost vs MRR per tenant. Red flag = monthly cost &gt; 40% of MRR.
          Sorted by margin ascending (worst first).
        </p>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Active Orgs</p>
          <p className="mt-1 text-2xl font-bold text-[#363940]">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total MRR</p>
          <p className="mt-1 text-2xl font-bold text-[#363940]">{formatZAR(totalMRRCents)}</p>
        </div>
        <div
          className={`rounded-lg border bg-white p-4 ${flaggedCount > 0 ? 'border-[#6B1420]' : 'border-gray-200'}`}
        >
          <p className="text-sm text-gray-500">Flagged Orgs (&gt;40% MRR)</p>
          <p
            className={`mt-1 text-2xl font-bold ${flaggedCount > 0 ? 'text-[#6B1420]' : 'text-[#363940]'}`}
          >
            {flaggedCount} / {rows.length}
          </p>
        </div>
      </div>

      {fetchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load cost data: {fetchError}
        </div>
      )}

      {/* Cost vs MRR table */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Cost vs Revenue — Month to Date
          </h2>
          <span className="text-xs text-gray-400">
            Total AI cost MTD: {formatZAR(totalCostMTDCents)}
          </span>
        </div>
        <CostTable rows={rows} />
      </section>

      <p className="text-xs text-gray-400">
        Cost data populated nightly at 02:00 SAST by the daily-cost-rollup cron.
        MRR from subscription_composition (current composition per org).
      </p>
    </div>
  )
}
