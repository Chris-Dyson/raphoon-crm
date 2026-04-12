'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Mail, BarChart2, Users, Play, Pause, Check } from 'lucide-react'
import { PRODUCTS } from '@/lib/supabase'
import { format } from 'date-fns'

interface Campaign {
  id: string
  name: string
  product?: string
  status: string
  type: string
  ab_test_enabled: boolean
  sent_count: number
  open_count: number
  click_count: number
  reply_count: number
  conversion_count: number
  revenue_generated: number
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  'draft': 'bg-gray-700 text-gray-300',
  'active': 'bg-green-900/50 text-green-300',
  'paused': 'bg-yellow-900/50 text-yellow-300',
  'completed': 'bg-blue-900/50 text-blue-300',
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({
    name: '', product: '', type: 'cold_email',
    subject_a: '', subject_b: '', body_a: '', body_b: '',
    ab_test_enabled: false,
  })

  useEffect(() => {
    fetch('/api/campaigns').then(r => r.json()).then(d => {
      setCampaigns(Array.isArray(d) ? d : [])
      setLoading(false)
    })
  }, [])

  const createCampaign = async () => {
    if (!form.name.trim()) return alert('Campaign name required')
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const campaign = await res.json()
    setCampaigns(prev => [campaign, ...prev])
    setShowNew(false)
    setForm({ name: '', product: '', type: 'cold_email', subject_a: '', subject_b: '', body_a: '', body_b: '', ab_test_enabled: false })
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status } : c))
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Campaigns</h1>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {/* New Campaign Form */}
      {showNew && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Create Campaign</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Campaign Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Q2 FitFlow Outreach"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Product</label>
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
              <label className="text-xs text-gray-400 mb-1 block">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
              >
                <option value="cold_email">Cold Email</option>
                <option value="follow_up">Follow-up Sequence</option>
                <option value="nurture">Nurture</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ab_test"
                checked={form.ab_test_enabled}
                onChange={e => setForm(f => ({ ...f, ab_test_enabled: e.target.checked }))}
                className="w-4 h-4 accent-indigo-600"
              />
              <label htmlFor="ab_test" className="text-sm text-gray-300">Enable A/B Testing</label>
            </div>
          </div>

          {/* Email Templates */}
          <div className={`grid gap-4 mb-4 ${form.ab_test_enabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Subject {form.ab_test_enabled ? 'A' : ''}</label>
              <input
                value={form.subject_a}
                onChange={e => setForm(f => ({ ...f, subject_a: e.target.value }))}
                placeholder="Subject line..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
              />
              <label className="text-xs text-gray-400 mb-1 block mt-2">Email Body {form.ab_test_enabled ? 'A' : ''}</label>
              <textarea
                value={form.body_a}
                onChange={e => setForm(f => ({ ...f, body_a: e.target.value }))}
                placeholder="Hi {{name}},&#10;&#10;I wanted to reach out..."
                rows={5}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none resize-none"
              />
            </div>
            {form.ab_test_enabled && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Subject B</label>
                <input
                  value={form.subject_b}
                  onChange={e => setForm(f => ({ ...f, subject_b: e.target.value }))}
                  placeholder="Alternative subject..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
                />
                <label className="text-xs text-gray-400 mb-1 block mt-2">Email Body B</label>
                <textarea
                  value={form.body_b}
                  onChange={e => setForm(f => ({ ...f, body_b: e.target.value }))}
                  placeholder="Alternative body..."
                  rows={5}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none resize-none"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
            <button onClick={createCampaign} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
              Create Campaign
            </button>
          </div>
        </div>
      )}

      {/* Campaigns List */}
      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No campaigns yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const openRate = c.sent_count > 0 ? ((c.open_count / c.sent_count) * 100).toFixed(1) : '0'
            const clickRate = c.sent_count > 0 ? ((c.click_count / c.sent_count) * 100).toFixed(1) : '0'
            const replyRate = c.sent_count > 0 ? ((c.reply_count / c.sent_count) * 100).toFixed(1) : '0'

            return (
              <div key={c.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-white">{c.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] || 'bg-gray-700 text-gray-300'}`}>
                        {c.status}
                      </span>
                      {c.ab_test_enabled && (
                        <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full">A/B</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {c.product && <span>📦 {c.product}</span>}
                      <span>📅 {format(new Date(c.created_at), 'MMM d, yyyy')}</span>
                      <span className="capitalize">🔧 {c.type.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {c.status === 'active' && (
                      <button onClick={() => updateStatus(c.id, 'paused')}
                        className="p-1.5 text-yellow-400 hover:bg-yellow-900/20 rounded transition-colors" title="Pause">
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                    {(c.status === 'draft' || c.status === 'paused') && (
                      <button onClick={() => updateStatus(c.id, 'active')}
                        className="p-1.5 text-green-400 hover:bg-green-900/20 rounded transition-colors" title="Activate">
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    {c.status === 'active' && (
                      <button onClick={() => updateStatus(c.id, 'completed')}
                        className="p-1.5 text-blue-400 hover:bg-blue-900/20 rounded transition-colors" title="Mark Complete">
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-6 gap-3">
                  <Stat label="Sent" value={c.sent_count.toString()} icon={<Mail className="w-3 h-3" />} />
                  <Stat label="Opens" value={c.open_count.toString()} sub={`${openRate}%`} />
                  <Stat label="Clicks" value={c.click_count.toString()} sub={`${clickRate}%`} />
                  <Stat label="Replies" value={c.reply_count.toString()} sub={`${replyRate}%`} />
                  <Stat label="Conversions" value={c.conversion_count.toString()} highlight />
                  <Stat label="Revenue" value={`$${c.revenue_generated}`} highlight />
                </div>

                {/* Progress bars */}
                {c.sent_count > 0 && (
                  <div className="mt-3 space-y-1">
                    <ProgressBar label="Open rate" value={Number(openRate)} color="blue" />
                    <ProgressBar label="Reply rate" value={Number(replyRate)} color="green" />
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

function Stat({ label, value, sub, icon, highlight }: {
  label: string; value: string; sub?: string; icon?: React.ReactNode; highlight?: boolean
}) {
  return (
    <div className="text-center p-2 bg-gray-800 rounded-lg">
      <p className={`text-lg font-bold ${highlight ? 'text-indigo-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function ProgressBar({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = { blue: 'bg-blue-500', green: 'bg-green-500', yellow: 'bg-yellow-500' }
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-20">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${colors[color] || 'bg-indigo-500'}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-10 text-right">{value}%</span>
    </div>
  )
}
