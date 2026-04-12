'use client'

import { useEffect, useState } from 'react'
import { Users, DollarSign, TrendingUp, AlertCircle, CheckSquare, ArrowRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, FunnelChart, Funnel, Cell } from 'recharts'
import Link from 'next/link'
import { format } from 'date-fns'

interface DashboardData {
  totalContacts: number
  statusCounts: Record<string, number>
  productCounts: Record<string, number>
  totalMrr: number
  mrrByProduct: Record<string, number>
  pipelineData: Array<{ stage: string; count: number }>
  recentActivities: Array<{
    id: string
    type: string
    subject: string
    created_at: string
    contacts: { name: string; product: string } | null
  }>
  overdueTasks: Array<{
    id: string
    title: string
    due_at: string
    contacts: { name: string } | null
  }>
  recentContacts: Array<{
    id: string
    name: string
    email: string
    product: string
    status: string
    created_at: string
  }>
  conversionRate: string
}

const STAGE_COLORS = ['#94a3b8', '#60a5fa', '#34d399', '#f59e0b', '#a78bfa', '#10b981', '#ef4444']

const ACTIVITY_ICONS: Record<string, string> = {
  email_sent: '📧',
  email_opened: '👁️',
  email_clicked: '🔗',
  reply_received: '↩️',
  call: '📞',
  note: '📝',
  stage_change: '🔄',
  demo: '🖥️',
  revenue: '💰',
  task: '✅',
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-400">Loading dashboard...</div>
    </div>
  )

  if (!data) return (
    <div className="p-8">
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
        Failed to load dashboard. Make sure your database is set up via <Link href="/setup" className="underline">Setup</Link>.
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <Link href="/contacts/new" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Add Contact
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title="Total Contacts"
          value={data.totalContacts.toLocaleString()}
          icon={<Users className="w-5 h-5" />}
          color="indigo"
          sub={`${data.statusCounts['Paid'] || 0} paid customers`}
        />
        <KpiCard
          title="MRR"
          value={`$${data.totalMrr.toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
          sub="Monthly recurring revenue"
        />
        <KpiCard
          title="Conversion Rate"
          value={`${data.conversionRate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="blue"
          sub="Prospect → Paid"
        />
        <KpiCard
          title="Overdue Tasks"
          value={data.overdueTasks.length.toString()}
          icon={<AlertCircle className="w-5 h-5" />}
          color="red"
          sub="Need attention"
        />
      </div>

      {/* Pipeline + MRR charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pipeline Funnel */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">PIPELINE FUNNEL</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.pipelineData} layout="vertical">
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis type="category" dataKey="stage" tick={{ fill: '#9ca3af', fontSize: 11 }} width={70} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#f9fafb' }}
              />
              <Bar dataKey="count" radius={4}>
                {data.pipelineData.map((_, i) => (
                  <Cell key={i} fill={STAGE_COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* MRR by Product */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">MRR BY PRODUCT</h2>
          {Object.keys(data.mrrByProduct).length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={Object.entries(data.mrrByProduct).map(([product, mrr]) => ({ product, mrr }))}>
                <XAxis dataKey="product" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  formatter={(v) => [`$${v}`, 'MRR']}
                />
                <Bar dataKey="mrr" fill="#6366f1" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-52 text-gray-600 text-sm">
              No revenue data yet. <Link href="/revenue" className="ml-1 text-indigo-400 hover:underline">Add revenue →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div className="col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-400">RECENT ACTIVITY</h2>
          </div>
          <div className="space-y-2">
            {data.recentActivities.length === 0 ? (
              <p className="text-gray-600 text-sm">No activities yet.</p>
            ) : (
              data.recentActivities.slice(0, 8).map(a => (
                <div key={a.id} className="flex items-start gap-3 py-2 border-b border-gray-800 last:border-0">
                  <span className="text-lg mt-0.5">{ACTIVITY_ICONS[a.type] || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{a.subject || a.type}</p>
                    {a.contacts && (
                      <p className="text-xs text-gray-500">{a.contacts.name} · {a.contacts.product}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-600 flex-shrink-0">
                    {format(new Date(a.created_at), 'MMM d')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Overdue Tasks + Recent Contacts */}
        <div className="space-y-4">
          {/* Overdue Tasks */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-400">OVERDUE TASKS</h2>
              <Link href="/tasks" className="text-xs text-indigo-400 hover:underline">View all</Link>
            </div>
            {data.overdueTasks.length === 0 ? (
              <p className="text-gray-600 text-sm">All clear! 🎉</p>
            ) : (
              <div className="space-y-2">
                {data.overdueTasks.slice(0, 4).map(t => (
                  <div key={t.id} className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-200">{t.title}</p>
                      {t.contacts && <p className="text-xs text-gray-500">{t.contacts.name}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Contacts */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-400">NEW CONTACTS</h2>
              <Link href="/contacts" className="text-xs text-indigo-400 hover:underline">View all</Link>
            </div>
            {data.recentContacts.length === 0 ? (
              <p className="text-gray-600 text-sm">No contacts yet.</p>
            ) : (
              <div className="space-y-2">
                {data.recentContacts.slice(0, 4).map(c => (
                  <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center gap-2 hover:bg-gray-800 rounded p-1 -mx-1 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white flex-shrink-0">
                      {c.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-200 truncate">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.product || 'No product'}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ title, value, icon, color, sub }: {
  title: string; value: string; icon: React.ReactNode; color: string; sub: string
}) {
  const colors: Record<string, string> = {
    indigo: 'text-indigo-400 bg-indigo-900/30',
    green: 'text-green-400 bg-green-900/30',
    blue: 'text-blue-400 bg-blue-900/30',
    red: 'text-red-400 bg-red-900/30',
  }
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
        <span className={`p-1.5 rounded-lg ${colors[color]}`}>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{sub}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'Prospect': 'bg-gray-700 text-gray-300',
    'Emailed': 'bg-blue-900/50 text-blue-300',
    'Replied': 'bg-green-900/50 text-green-300',
    'Demo': 'bg-yellow-900/50 text-yellow-300',
    'Trial': 'bg-purple-900/50 text-purple-300',
    'Paid': 'bg-emerald-900/50 text-emerald-300',
    'Churned': 'bg-red-900/50 text-red-300',
  }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${map[status] || 'bg-gray-700 text-gray-300'}`}>
      {status}
    </span>
  )
}
