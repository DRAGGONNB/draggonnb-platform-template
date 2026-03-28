'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useLiveBill } from '@/hooks/use-live-bill'

export default function POSPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const { bill, items, session, loading } = useLiveBill(sessionId)

  const [menu, setMenu] = useState<Array<{ id: string; name: string; price: number; category_id: string | null }>>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!session?.restaurant_id) return
    fetch(`/api/restaurant/menu?type=categories&restaurant_id=${session.restaurant_id}`)
      .then(r => r.json())
      .then(d => {
        setCategories(d.categories ?? [])
        const allItems = (d.categories ?? []).flatMap((c: { menu_items?: typeof menu }) => c.menu_items ?? [])
        setMenu(allItems)
      })
  }, [session?.restaurant_id])

  async function addItem(menuItemId: string) {
    setAdding(true)
    await fetch('/api/restaurant/bills/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, menu_item_id: menuItemId, quantity: 1 }),
    })
    setAdding(false)
  }

  async function requestBill() {
    await fetch(`/api/restaurant/sessions/${sessionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'bill_requested' }),
    })
  }

  const filteredMenu = menu.filter(item =>
    (!activeCat || item.category_id === activeCat) &&
    (!search || item.name.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-[#2D2F33]"><div className="w-8 h-8 border-2 border-[#6B1420] border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="flex h-screen bg-[#2D2F33] text-white overflow-hidden">
      {/* Left: Menu */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Category tabs */}
        <div className="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveCat(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${!activeCat ? 'bg-[#6B1420] text-white' : 'bg-[#3A3C40] text-gray-300'}`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${activeCat === cat.id ? 'bg-[#6B1420] text-white' : 'bg-[#3A3C40] text-gray-300'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 pb-2 shrink-0">
          <input
            type="text"
            placeholder="Search menu..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#3A3C40] rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#6B1420]"
          />
        </div>

        {/* Menu grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3 content-start">
          {filteredMenu.map(item => (
            <button
              key={item.id}
              onClick={() => addItem(item.id)}
              disabled={adding}
              className="bg-[#3A3C40] rounded-xl p-3 text-left hover:bg-[#454749] transition-colors active:scale-95"
            >
              <p className="text-sm font-medium leading-tight">{item.name}</p>
              <p className="text-[#6B1420] font-bold mt-1">R{Number(item.price).toFixed(2)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Bill */}
      <div className="w-72 bg-[#1E2023] flex flex-col border-l border-white/10">
        <div className="px-4 py-4 border-b border-white/10">
          <p className="font-semibold">Current Bill</p>
          {session && <p className="text-xs text-gray-500 mt-0.5">Party of {session.party_size}</p>}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {items.length === 0 ? (
            <p className="text-center text-gray-600 text-sm py-8">No items yet</p>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex justify-between items-center px-4 py-2.5 text-sm">
                <span className="flex-1 truncate">{item.quantity > 1 ? `${item.quantity}× ` : ''}{item.name}</span>
                <span className="ml-2 tabular-nums text-gray-400">R{Number(item.line_total).toFixed(2)}</span>
              </div>
            ))
          )}
        </div>

        {bill && (
          <div className="px-4 py-3 border-t border-white/10 space-y-1">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Subtotal</span><span>R{Number(bill.subtotal).toFixed(2)}</span>
            </div>
            {Number(bill.service_charge) > 0 && (
              <div className="flex justify-between text-sm text-gray-400">
                <span>Service</span><span>R{Number(bill.service_charge).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1">
              <span>Total</span><span className="text-[#6B1420]">R{Number(bill.total).toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="px-4 py-3 space-y-2 border-t border-white/10">
          <button
            onClick={requestBill}
            disabled={!bill || Number(bill?.total) === 0 || session?.status !== 'open'}
            className="w-full bg-[#6B1420] text-white rounded-xl py-3 font-semibold disabled:opacity-40 active:scale-95"
          >
            Request Bill
          </button>
          {(session?.status !== 'open' || items.length > 0) && (
            <button
              onClick={() => router.push(`/restaurant/pos/${sessionId}/bill`)}
              className="w-full bg-[#3A3C40] text-gray-300 rounded-xl py-3 text-sm font-medium active:scale-95 transition-transform"
            >
              View Bill
            </button>
          )}
          <button
            onClick={() => router.push('/restaurant/tables')}
            className="w-full bg-[#3A3C40] text-gray-300 rounded-xl py-2 text-sm"
          >
            Back to Floor
          </button>
        </div>
      </div>
    </div>
  )
}
