'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  DollarSign, TrendingDown, TrendingUp, AlertCircle, Plus, Download,
  Filter, RefreshCw, Flame, Target, X, BarChart2
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'
import { format, parseISO } from 'date-fns'

interface Transaction {
  id: string
  date: string
  type: 'income' | 'expense'
  category: string
  description: string
  amount: number
  balance: number
  notes?: string
  is_estimated: boolean
  created_at: string
}

interface Stats {
  totalExpenses: number
  totalIncome: number
  balance: number
  monthlyBudget: number
  budgetUsed: number
  budgetRemaining: number
  dailyBurnRate: number
  projectedMonthlyBurn: number
  daysActive: number
}

interface CategoryBreakdown {
  category: string
  amount: number
}

interface FinanceData {
  transactions: Transaction[]
  stats: Stats
  categoryBreakdown: CategoryBreakdown[]
}

const CATEGORY_COLORS: Record<string, string> = {
  api: '#6366f1',
  infrastructure: '#10b981',
  platform: '#f59e0b',
  hardware: '#ef4444',
  communications: '#60a5fa',
  revenue: '#34d399',
  other: '#94a3b8',
}

const CATEGORIES = ['api', 'infrastructure', 'platform', 'hardware', 'communications', 'revenue', 'other']

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function GaugeBar({ used, total, label }: { used: number; total: number; label: string }) {
  const pct = Math.min((used / total) * 100, 100)
  const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981'
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-3">
        <div
          className="h-3 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeChart, setActiveChart] = useState<'pie' | 'bar'>('pie')
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'expense',
    category: 'api',
    description: '',
    amount: '',
    notes: '',
    is_estimated: false,
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/finance')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setData(d)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const addTransaction = async () => {
    if (!form.description || !form.amount) return alert('Description and amount required')
    const amountVal = form.type === 'expense'
      ? -Math.abs(parseFloat(form.amount))
      : Math.abs(parseFloat(form.amount))
    const res = await fetch('/api/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: amountVal }),
    })
    if (!res.ok) {
      const err = await res.json()
      alert('Error: ' + err.error)
      return
    }
    setShowAddForm(false)
    setForm({
      date: new Date().toISOString().slice(0, 10),
      type: 'expense', category: 'api', description: '', amount: '', notes: '', is_estimated: false,
    })
    fetchData()
  }

  const deleteTransaction = async (id: string) => {
    if (!confirm('Delete this transaction?')) return
    await fetch(`/api/finance?id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  const exportCSV = () => {
    if (!data) return
    const rows = [
      ['date', 'type', 'category', 'description', 'amount', 'balance', 'notes', 'estimated'],
      ...data.transactions.map(t => [
        t.date?.toString().slice(0, 10),
        t.type,
        t.category,
        `"${t.description}"`,
        t.amount,
        t.balance,
        `"${t.notes || ''}"`,
        t.is_estimated ? 'yes' : 'no',
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `raphoon-ledger-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredTransactions = data?.transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterCategory !== 'all' && t.category !== filterCategory) return false
    return true
  }) ?? []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading financial data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-300 font-medium mb-2">Failed to load finance data</p>
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm">
            Retry
          </button>
        </div>
      </div>
    )
  }

  const s = data!.stats

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-400" />
            Financial Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Raphoon LLC · April 2026 · Budget: $2,500/mo</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-sm font-medium"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Transaction
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2 uppercase tracking-wider">
            <TrendingDown className="w-3.5 h-3.5" /> Total Spent
          </div>
          <div className="text-2xl font-bold text-red-400">{formatCurrency(s.totalExpenses)}</div>
          <div className="text-xs text-gray-500 mt-1">of {formatCurrency(s.monthlyBudget)} budget</div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2 uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5" /> Revenue
          </div>
          <div className="text-2xl font-bold text-green-400">{formatCurrency(s.totalIncome)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {s.totalIncome === 0 ? 'No revenue yet — keep building!' : 'Total revenue in'}
          </div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2 uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5" /> Daily Burn
          </div>
          <div className="text-2xl font-bold text-orange-400">{formatCurrency(s.dailyBurnRate)}</div>
          <div className="text-xs text-gray-500 mt-1">
            Proj. {formatCurrency(s.projectedMonthlyBurn)}/mo
          </div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2 uppercase tracking-wider">
            <Target className="w-3.5 h-3.5" /> Budget Left
          </div>
          <div className={`text-2xl font-bold ${s.budgetRemaining > 500 ? 'text-green-400' : s.budgetRemaining > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
            {formatCurrency(Math.max(s.budgetRemaining, 0))}
          </div>
          <div className="text-xs text-gray-500 mt-1">{s.budgetUsed}% used</div>
        </div>
      </div>

      {/* Budget Gauge + Running Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 col-span-1">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Budget Gauge</h3>
          <GaugeBar used={s.totalExpenses} total={s.monthlyBudget} label="Monthly Budget Used" />
          <div className="mt-4 space-y-1 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Spent</span><span className="text-red-400">{formatCurrency(s.totalExpenses)}</span>
            </div>
            <div className="flex justify-between">
              <span>Revenue</span><span className="text-green-400">{formatCurrency(s.totalIncome)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-800 pt-1 mt-1">
              <span className="font-medium text-gray-300">Net Balance</span>
              <span className={s.balance >= 0 ? 'text-green-400' : 'text-red-400'}>{formatCurrency(s.balance)}</span>
            </div>
          </div>
          {s.budgetUsed > 70 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-yellow-400 bg-yellow-900/20 rounded-lg p-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {s.budgetUsed > 90 ? 'Budget nearly depleted!' : 'Over 70% of budget used'}
            </div>
          )}
        </div>

        {/* Charts */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Category Breakdown</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveChart('pie')}
                className={`px-2 py-1 text-xs rounded ${activeChart === 'pie' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Pie
              </button>
              <button
                onClick={() => setActiveChart('bar')}
                className={`px-2 py-1 text-xs rounded ${activeChart === 'bar' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Bar
              </button>
            </div>
          </div>
          {data!.categoryBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-600 text-sm">No data yet</div>
          ) : activeChart === 'pie' ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data!.categoryBreakdown}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data!.categoryBreakdown.map((entry, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[entry.category] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  formatter={(v) => [formatCurrency(Number(v)), 'Spent']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data!.categoryBreakdown} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="category" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  formatter={(v) => [formatCurrency(Number(v)), 'Spent']}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {data!.categoryBreakdown.map((entry, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[entry.category] || '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Add Transaction Form */}
      {showAddForm && (
        <div className="bg-gray-900 rounded-xl border border-indigo-800/50 p-6 mb-6 relative">
          <button
            onClick={() => setShowAddForm(false)}
            className="absolute top-4 right-4 text-gray-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-base font-semibold text-white mb-4">Add Transaction</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Type *</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Category *</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Description *</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What is this for?"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Amount (USD) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="col-span-2 lg:col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Notes</label>
              <input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Receipt #, vendor, context..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_estimated"
                checked={form.is_estimated}
                onChange={e => setForm(f => ({ ...f, is_estimated: e.target.checked }))}
                className="w-4 h-4 accent-indigo-500"
              />
              <label htmlFor="is_estimated" className="text-xs text-gray-400">Mark as estimated</label>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
            <button
              onClick={addTransaction}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
            >
              Add Transaction
            </button>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {/* Filters */}
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none"
          >
            <option value="all">All types</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </select>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-xs text-gray-600 ml-auto">{filteredTransactions.length} transactions</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Amount</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Balance</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Notes</th>
                <th className="px-4 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500 text-sm">
                    No transactions found
                  </td>
                </tr>
              ) : (
                [...filteredTransactions].reverse().map(t => (
                  <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {(() => {
                        try {
                          const d = t.date?.toString().slice(0, 10)
                          return format(parseISO(d), 'MMM d, yyyy')
                        } catch { return t.date?.toString().slice(0, 10) }
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-200">
                      <div className="flex items-center gap-2">
                        {t.description}
                        {t.is_estimated && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-900/40 text-yellow-400 border border-yellow-800/50">
                            est.
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: (CATEGORY_COLORS[t.category] || '#94a3b8') + '22',
                          color: CATEGORY_COLORS[t.category] || '#94a3b8',
                          border: `1px solid ${(CATEGORY_COLORS[t.category] || '#94a3b8')}44`,
                        }}
                      >
                        {t.category}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm font-mono font-semibold text-right whitespace-nowrap ${
                      t.type === 'income' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {t.type === 'income' ? '+' : ''}{formatCurrency(Number(t.amount))}
                    </td>
                    <td className={`px-4 py-3 text-sm font-mono text-right whitespace-nowrap ${
                      Number(t.balance) >= 0 ? 'text-gray-300' : 'text-red-300'
                    }`}>
                      {formatCurrency(Number(t.balance))}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                      {t.notes || ''}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteTransaction(t.id)}
                        className="text-gray-700 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer summary */}
        {filteredTransactions.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-800 flex items-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <BarChart2 className="w-3 h-3" />
              <span>Showing {filteredTransactions.length} transactions</span>
            </div>
            <div>
              Expenses:{' '}
              <span className="text-red-400">
                {formatCurrency(filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(Number(t.amount)), 0))}
              </span>
            </div>
            <div>
              Income:{' '}
              <span className="text-green-400">
                {formatCurrency(filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0))}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
