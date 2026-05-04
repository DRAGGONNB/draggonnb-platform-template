/**
 * app/(dashboard)/approvals/page.tsx
 * Approvals web fallback — three tabs per CONTEXT B1-B4.
 * Mobile-first 360px cards, grouped by product DraggonnB-first then Trophy,
 * collapsible sections, newest-first within section, plain "Nothing pending" empty state.
 */

import { getUserOrg } from '@/lib/auth/get-user-org'
import { listPendingForUser, listOrgPending, listOrgHistory } from '@/lib/approvals/spine'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ApprovalsPage() {
  const { data: userOrg, error } = await getUserOrg()
  if (error || !userOrg) {
    return (
      <div className="p-6 text-sm text-red-600">
        Could not load approvals: {error ?? 'auth required'}
      </div>
    )
  }

  const isAdmin = ['admin', 'manager'].includes(userOrg.role)
  const myPending = await listPendingForUser(userOrg.userId)
  const orgPending = isAdmin ? await listOrgPending(userOrg.organizationId) : []
  // W3: actually wire the History tab
  const history = await listOrgHistory(userOrg.organizationId)

  return (
    <div className="p-4 max-w-screen-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Approvals</h1>
      <Tabs defaultValue="my-queue">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="my-queue">My queue ({myPending.length})</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="all-org">All org pending ({orgPending.length})</TabsTrigger>
          )}
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="my-queue">
          <GroupedApprovalList items={myPending} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="all-org">
            <GroupedApprovalList items={orgPending} />
          </TabsContent>
        )}

        <TabsContent value="history">
          {history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No history yet</p>
            </div>
          ) : (
            <GroupedApprovalList items={history} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function GroupedApprovalList({ items }: { items: any[] }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nothing pending</p>
        <Link href="/approvals?tab=history" className="text-sm underline">
          View recent history &rarr;
        </Link>
      </div>
    )
  }

  const groups: Record<string, any[]> = {}
  for (const it of items) {
    if (!groups[it.product]) groups[it.product] = []
    groups[it.product].push(it)
  }

  // DraggonnB first, Trophy second, others after
  const orderedProducts = ['draggonnb', 'trophy', ...Object.keys(groups).filter(p => p !== 'draggonnb' && p !== 'trophy')]
  const ordered = orderedProducts.filter((p) => groups[p]?.length > 0)

  return (
    <div className="space-y-6 mt-4">
      {ordered.map((product) => (
        <details key={product} open className="border rounded-md">
          <summary className="px-4 py-2 font-semibold cursor-pointer capitalize">
            {product} ({groups[product].length})
          </summary>
          <ul className="divide-y">
            {groups[product]
              .slice()
              .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
              .map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/approvals/${row.id}`}
                    className="block p-3 hover:bg-muted h-[120px] overflow-hidden"
                  >
                    <div className="flex justify-between text-sm font-medium">
                      <span>{(row.action_type as string).replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground">
                        {row.action_payload?.amount_zar
                          ? `R${Number(row.action_payload.amount_zar).toFixed(2)}`
                          : ''}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 capitalize">
                      {row.product} &middot; {row.target_resource_id} &middot;{' '}
                      <span className="uppercase font-medium">{row.status}</span>
                    </div>
                    <div className="text-xs mt-2 text-muted-foreground">
                      Expires {new Date(row.expires_at).toLocaleString('en-ZA')}
                    </div>
                  </Link>
                </li>
              ))}
          </ul>
        </details>
      ))}
    </div>
  )
}
