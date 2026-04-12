'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, Plus, Upload, Filter, ChevronDown } from 'lucide-react'
import { PIPELINE_STAGES, PRODUCTS, SOURCES } from '@/lib/supabase'
import { format } from 'date-fns'

interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  product?: string
  source?: string
  status: string
  created_at: string
  next_followup_at?: string
  tags?: string[]
}

const STATUS_COLORS: Record<string, string> = {
  'Prospect': 'bg-gray-700 text-gray-300',
  'Emailed': 'bg-blue-900/50 text-blue-300',
  'Replied': 'bg-green-900/50 text-green-300',
  'Demo': 'bg-yellow-900/50 text-yellow-300',
  'Trial': 'bg-purple-900/50 text-purple-300',
  'Paid': 'bg-emerald-900/50 text-emerald-300',
  'Churned': 'bg-red-900/50 text-red-300',
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (productFilter) params.set('product', productFilter)
    params.set('limit', '100')

    const res = await fetch(`/api/contacts?${params}`)
    const data = await res.json()
    setContacts(data.data || [])
    setTotal(data.count || 0)
    setLoading(false)
  }, [search, statusFilter, productFilter])

  useEffect(() => {
    const timer = setTimeout(fetchContacts, 300)
    return () => clearTimeout(timer)
  }, [fetchContacts])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Contacts</h1>
          <p className="text-sm text-gray-500">{total.toLocaleString()} total contacts</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/setup"
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors border border-gray-700"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </Link>
          <Link
            href="/contacts/new"
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Contact
          </Link>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name, email, company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
            showFilters || statusFilter || productFilter
              ? 'bg-indigo-900/30 border-indigo-600 text-indigo-300'
              : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200'
          }`}
        >
          <Filter className="w-4 h-4" /> Filters
          <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showFilters && (
        <div className="flex gap-3 mb-4 p-4 bg-gray-900 rounded-lg border border-gray-800">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Stages</option>
              {PIPELINE_STAGES.map(s => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Product</label>
            <select
              value={productFilter}
              onChange={e => setProductFilter(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Products</option>
              {PRODUCTS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setStatusFilter(''); setProductFilter('') }}
              className="px-3 py-2 text-xs text-gray-400 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Added</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500 text-sm">Loading...</td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500 text-sm">
                  No contacts found.{' '}
                  <Link href="/contacts/new" className="text-indigo-400 hover:underline">Add one</Link> or{' '}
                  <Link href="/setup" className="text-indigo-400 hover:underline">import CSV</Link>.
                </td>
              </tr>
            ) : (
              contacts.map(c => (
                <tr key={c.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${c.id}`} className="flex items-center gap-2 group">
                      <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white flex-shrink-0">
                        {c.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-gray-200 group-hover:text-white font-medium">{c.name}</p>
                        {c.company && <p className="text-xs text-gray-500">{c.company}</p>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{c.email || '—'}</td>
                  <td className="px-4 py-3">
                    {c.product ? (
                      <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                        {c.product}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] || 'bg-gray-700 text-gray-300'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 capitalize">{c.source || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {format(new Date(c.created_at), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
