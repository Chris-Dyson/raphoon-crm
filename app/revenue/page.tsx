'use client'

import { useEffect, useState } from 'react'
import { DollarSign, TrendingUp, Plus, BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { PRODUCTS } from '@/lib/supabase'
import { format } from 'date-fns'

interface RevenueEntry {
  id: string
  contact_id?: string
  product: string
  amount: number
  type: string
  status: string
  notes?: string
  created_at: string
  contacts?: { name: string; email: string } | null
}

interface RevenueData {
  entries: RevenueEntry[]
  mrrByProduct: Record<string, number>
  totalMrr: number
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a78bfa', '#60a5fa', '#34d399']

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({
    product: '', amount: '', type: 'mrr', status: 'active', notes: '', contact_id: ''
  })

  useEffect(() => {
    fetch('/api/revenue').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  const addRevenue = async () => {
    if (!form.product || !form.amount) return alert('Product and amount required')
    const res = await fetch('/api/revenue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) })
    })
    const entry = await res.json()
    setData(prev => {
      if (!prev) return prev
      const newMrr = form.type === 'mrr' && form.status === 'active'
        ? { ...prev.mrrByProduct, [form.product]: (prev.mrrByProduct[form.product] || 0) + parseFloat(form.amount) }
        : prev.mrrByProduct
      return {
        entries: [entry, ...prev.entries],
        mrrByProduct: newMrr,
        totalMrr: Object.values(newMrr).reduce((a, b) => a + b, 0)
      }
    })
    setShowNew(false)
    setForm({ product: '', amount: '', type: 'mrr', status: 'active', notes: '', contact_id: '' })
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-gray-400">Loading...</div></div>

  const mrrData = Object.entries(data?.mrrByProduct || {}).map(([product, mrr]) => ({ product, mrr }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Revenue</h1>
          <p className="text-sm text-gray-500">Track MRR per product and conversions</p>
        </div>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Log Revenue
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <DollarSign className="w-4 h-4" /> TOTAL MRR
          </div>
          <div className="text-3xl font-bold text-green-400">${data?.totalMrr?.toLocaleString() || 0}</div>
          <div className="text-xs text-gray-500 mt-1">Monthly Recurring Revenue</div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <TrendingUp className="w-4 h-4" /> ARR
          </div>
          <div className="text-3xl font-bold text-indigo-400">${((data?.totalMrr || 0) * 12).toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">Annual Run Rate</div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <BarChart2 className="w-4 h-4" /> PAID CUSTOMERS
          </div>
          <div className="text-3xl font-bold text-yellow-400">
            {data?.entries?.filter(e => e.type === 'mrr' && e.status === 'active').length || 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">Active subscriptions</div>
        </div>
      </div>

      {/* New Revenue Form */}
      {showNew && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Log Revenue</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Product *</label>
              <select
                value={form.product}
                onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
              >
                <option value="">Select product...</option>
                {PRODUCTS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Amount ($/mo) *</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="29"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
              >
                <option value="mrr">MRR (subscription)</option>
                <option value="one_time">One-time payment</option>
                <option value="refund">Refund</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="churned">Churned</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Notes</label>
              <input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Customer name, Stripe ID, etc."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
            <button onClick={addRevenue} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
              Log Revenue
            </button>
          </div>
        </div>
      )}

      {/* Charts */}
      {mrrData.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">MRR by Product</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mrrData}>
                <XAxis dataKey="product" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  formatter={(v) => [`$${v}/mo`, 'MRR']}
                />
                <Bar dataKey="mrr" radius={4}>
                  {mrrData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Revenue Share</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={mrrData} dataKey="mrr" nameKey="product" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {mrrData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`$${v}/mo`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Revenue Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
            </tr>
          </thead>
          <tbody>
            {(data?.entries || []).length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-500 text-sm">No revenue entries yet. Log your first customer!</td></tr>
            ) : (
              (data?.entries || []).map(e => (
                <tr key={e.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-200">{e.product}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{e.contacts?.name || e.notes || '—'}</td>
                  <td className="px-4 py-3 text-sm font-bold text-green-400">${Number(e.amount).toFixed(2)}/mo</td>
                  <td className="px-4 py-3 text-xs text-gray-500 capitalize">{e.type}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      e.status === 'active' ? 'bg-green-900/50 text-green-300' :
                      e.status === 'churned' ? 'bg-red-900/50 text-red-300' :
                      'bg-yellow-900/50 text-yellow-300'
                    }`}>{e.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(e.created_at), 'MMM d, yyyy')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
