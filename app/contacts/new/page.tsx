'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { PIPELINE_STAGES, PRODUCTS, SOURCES } from '@/lib/supabase'

export default function NewContactPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    title: '',
    source: 'manual',
    product: '',
    status: 'Prospect',
    notes: '',
    linkedin_url: '',
    twitter_handle: '',
    instagram_handle: '',
    next_followup_at: '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim()) return alert('Name is required')
    setSaving(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tags: form.product ? [form.product] : [],
          next_followup_at: form.next_followup_at || null,
        })
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      router.push(`/contacts/${data.id}`)
    } catch (err) {
      alert('Error: ' + String(err))
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/contacts" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-white">New Contact</h1>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name *" value={form.name} onChange={v => set('name', v)} placeholder="Jane Smith" />
          <Field label="Email" value={form.email} onChange={v => set('email', v)} type="email" placeholder="jane@example.com" />
          <Field label="Phone" value={form.phone} onChange={v => set('phone', v)} placeholder="+1 555 000 0000" />
          <Field label="Company" value={form.company} onChange={v => set('company', v)} placeholder="Acme Corp" />
          <Field label="Job Title" value={form.title} onChange={v => set('title', v)} placeholder="CEO" />
          
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Product</label>
            <select value={form.product} onChange={e => set('product', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500">
              <option value="">Select product...</option>
              {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Stage</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500">
              {PIPELINE_STAGES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Source</label>
            <select value={form.source} onChange={e => set('source', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500">
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <Field label="Follow-up Date" value={form.next_followup_at} onChange={v => set('next_followup_at', v)} type="date" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="LinkedIn URL" value={form.linkedin_url} onChange={v => set('linkedin_url', v)} placeholder="https://linkedin.com/in/..." />
          <Field label="Twitter Handle" value={form.twitter_handle} onChange={v => set('twitter_handle', v)} placeholder="@handle" />
          <Field label="Instagram Handle" value={form.instagram_handle} onChange={v => set('instagram_handle', v)} placeholder="@handle" />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Any notes about this contact..."
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/contacts" className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Cancel
          </Link>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Contact'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
      />
    </div>
  )
}
