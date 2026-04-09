'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RESTAURANT_ID, SECTION_META } from '@/lib/restaurant/constants'
import { QRCodeSVG } from 'qrcode.react'
import {
  Loader2, QrCode, Download, RefreshCw, Copy, Check, ExternalLink,
} from 'lucide-react'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://draggonnb-platform.vercel.app'

interface TableQR {
  id: string
  label: string
  section: string
  capacity: number
  qr_token: string | null
}

function guestUrl(token: string) {
  return `${APP_URL}/t/${token}`
}

export default function QRCodesPage() {
  const [tables, setTables] = useState<TableQR[]>([])
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const fetchTables = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('restaurant_tables')
      .select('id, label, section, capacity, qr_token')
      .eq('restaurant_id', RESTAURANT_ID)
      .eq('is_active', true)
      .order('section')
      .order('label')
    setTables(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTables() }, [fetchTables])

  async function regenerateToken(tableId: string) {
    setRegenerating(tableId)
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    const supabase = createClient()
    await supabase.from('restaurant_tables').update({ qr_token: token }).eq('id', tableId)
    await fetchTables()
    setRegenerating(null)
  }

  function copyLink(token: string, tableId: string) {
    navigator.clipboard.writeText(guestUrl(token))
    setCopied(tableId)
    setTimeout(() => setCopied(null), 2000)
  }

  function downloadQR(tableLabel: string) {
    const svg = document.getElementById(`qr-${tableLabel}`)
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 512, 512)
      ctx.drawImage(img, 0, 0, 512, 512)
      const a = document.createElement('a')
      a.download = `QR-${tableLabel}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  const sections = [...new Set(tables.map((t) => t.section))]
  const filtered = filter === 'all' ? tables : tables.filter((t) => t.section === filter)
  const withToken = tables.filter((t) => t.qr_token).length

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[#0077B6]" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QR Codes</h1>
        <p className="text-sm text-gray-500 mt-1">{withToken}/{tables.length} tables have QR codes</p>
      </div>

      {/* Section filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filter === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
          All ({tables.length})
        </button>
        {sections.map((sec) => {
          const meta = SECTION_META[sec]
          return (
            <button key={sec} onClick={() => setFilter(sec)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-colors ${filter === sec ? `${meta?.bg ?? 'bg-gray-100'} ${meta?.color ?? 'text-gray-700'} border-current` : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
              {meta?.label ?? sec}
            </button>
          )
        })}
      </div>

      {/* QR grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
          <QrCode className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No tables found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((table) => {
            const meta = SECTION_META[table.section]
            return (
              <div key={table.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{table.label}</p>
                    <span className={`text-xs font-medium capitalize ${meta?.color ?? 'text-gray-500'}`}>{meta?.label ?? table.section} &middot; {table.capacity} seats</span>
                  </div>
                  <button
                    onClick={() => regenerateToken(table.id)}
                    disabled={regenerating === table.id}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                    title={table.qr_token ? 'Regenerate token' : 'Generate token'}
                  >
                    {regenerating === table.id ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  </button>
                </div>

                {table.qr_token ? (
                  <>
                    <div className="flex justify-center mb-4">
                      <QRCodeSVG
                        id={`qr-${table.label}`}
                        value={guestUrl(table.qr_token)}
                        size={160}
                        level="M"
                        bgColor="#ffffff"
                        fgColor="#1f2937"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => copyLink(table.qr_token!, table.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200">
                        {copied === table.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        {copied === table.id ? 'Copied' : 'Copy Link'}
                      </button>
                      <button onClick={() => downloadQR(table.label)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#0077B6]/10 text-[#0077B6] hover:bg-[#0077B6]/20 border border-[#0077B6]/20">
                        <Download size={14} /> Download
                      </button>
                    </div>
                    <a href={guestUrl(table.qr_token)} target="_blank" rel="noopener noreferrer"
                      className="mt-2 flex items-center justify-center gap-1 text-[10px] text-gray-400 hover:text-[#0077B6]">
                      <ExternalLink size={10} /> Preview guest page
                    </a>
                  </>
                ) : (
                  <div className="flex flex-col items-center py-6">
                    <QrCode className="w-10 h-10 text-gray-200 mb-2" />
                    <p className="text-xs text-gray-400 mb-3">No QR code yet</p>
                    <button onClick={() => regenerateToken(table.id)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#0077B6] text-white hover:bg-[#006299]">
                      Generate QR Code
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
