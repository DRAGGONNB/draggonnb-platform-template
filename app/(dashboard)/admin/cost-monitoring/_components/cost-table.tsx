'use client'

import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import type { CostRow } from '@/lib/admin/cost-monitoring'
import { CostTrendChart } from './cost-trend-chart'

function formatZAR(cents: number): string {
  return `R${(cents / 100).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

interface CostTableProps {
  rows: CostRow[]
}

export function CostTable({ rows }: CostTableProps) {
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'marginPct', desc: false }, // worst-margin first by default
  ])

  const columns: ColumnDef<CostRow>[] = useMemo(
    () => [
      {
        id: 'orgName',
        header: 'Org',
        accessorKey: 'orgName',
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-[#363940]">{row.original.orgName}</div>
            {row.original.subdomain && (
              <div className="text-xs text-gray-500">
                {row.original.subdomain}.draggonnb.co.za
              </div>
            )}
          </div>
        ),
      },
      {
        id: 'mrrZarCents',
        header: 'MRR',
        accessorKey: 'mrrZarCents',
        cell: ({ row }) => (
          <span className="tabular-nums">{formatZAR(row.original.mrrZarCents)}</span>
        ),
      },
      {
        id: 'costMTDZarCents',
        header: 'Cost MTD',
        accessorKey: 'costMTDZarCents',
        cell: ({ row }) => (
          <span className="tabular-nums">{formatZAR(row.original.costMTDZarCents)}</span>
        ),
      },
      {
        id: 'marginPct',
        header: 'Margin %',
        accessorKey: 'marginPct',
        cell: ({ row }) => {
          const m = row.original.marginPct
          const colorClass =
            m < 0 ? 'text-red-600 font-semibold' : m < 60 ? 'text-amber-600' : 'text-green-700'
          return <span className={colorClass}>{m.toFixed(1)}%</span>
        },
      },
      {
        id: 'isOverFortyPctMrrFlag',
        header: 'Flag',
        accessorKey: 'isOverFortyPctMrrFlag',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.isOverFortyPctMrrFlag ? (
            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-[#6B1420] text-white">
              &gt;40% MRR
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          ),
      },
      {
        id: 'trend',
        header: 'Trend',
        enableSorting: false,
        cell: ({ row }) => (
          <button
            onClick={() =>
              setExpandedOrgId(
                expandedOrgId === row.original.orgId ? null : row.original.orgId,
              )
            }
            className="text-sm text-[#6B1420] underline underline-offset-2 hover:opacity-70"
          >
            {expandedOrgId === row.original.orgId ? 'Hide' : 'Show 30d'}
          </button>
        ),
      },
    ],
    [expandedOrgId],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-500">No active orgs with cost data yet.</p>
        <p className="mt-1 text-sm text-gray-400">
          Data appears after the nightly cron at 02:00 SAST once orgs run AI operations.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left">
        <thead className="bg-gray-50 text-sm text-gray-600">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className={`p-3 font-semibold ${h.column.getCanSort() ? 'cursor-pointer select-none hover:text-gray-900' : ''}`}
                  onClick={h.column.getToggleSortingHandler()}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {h.column.getIsSorted() === 'asc' && ' ↑'}
                  {h.column.getIsSorted() === 'desc' && ' ↓'}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-100">
          {table.getRowModel().rows.map((r) => (
            <>
              <tr key={r.id} className="hover:bg-gray-50">
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className="p-3 text-sm">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
              {expandedOrgId === r.original.orgId && (
                <tr key={`${r.id}-trend`}>
                  <td colSpan={6} className="bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium text-gray-500">
                      30-day cost trend — {r.original.orgName}
                    </p>
                    <CostTrendChart
                      trend={r.original.last30DaysCostTrend}
                      orgName={r.original.orgName}
                    />
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
