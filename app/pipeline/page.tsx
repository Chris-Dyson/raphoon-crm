'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, GripVertical } from 'lucide-react'
import { PIPELINE_STAGES, PRODUCTS } from '@/lib/supabase'

interface Contact {
  id: string
  name: string
  email?: string
  company?: string
  product?: string
  status: string
  created_at: string
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Prospect': { bg: 'bg-gray-800', border: 'border-gray-700', text: 'text-gray-400' },
  'Emailed': { bg: 'bg-blue-900/20', border: 'border-blue-800', text: 'text-blue-400' },
  'Replied': { bg: 'bg-green-900/20', border: 'border-green-800', text: 'text-green-400' },
  'Demo': { bg: 'bg-yellow-900/20', border: 'border-yellow-800', text: 'text-yellow-400' },
  'Trial': { bg: 'bg-purple-900/20', border: 'border-purple-800', text: 'text-purple-400' },
  'Paid': { bg: 'bg-emerald-900/20', border: 'border-emerald-800', text: 'text-emerald-400' },
  'Churned': { bg: 'bg-red-900/20', border: 'border-red-800', text: 'text-red-400' },
}

export default function PipelinePage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [productFilter, setProductFilter] = useState('')
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    const params = new URLSearchParams({ limit: '500' })
    if (productFilter) params.set('product', productFilter)
    const res = await fetch(`/api/contacts?${params}`)
    const data = await res.json()
    setContacts(data.data || [])
  }, [productFilter])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  const byStage = (stage: string) => contacts.filter(c => c.status === stage)

  const handleDragStart = (e: React.DragEvent, contactId: string) => {
    e.dataTransfer.setData('contactId', contactId)
    setDragging(contactId)
  }

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault()
    const contactId = e.dataTransfer.getData('contactId')
    if (!contactId) return

    // Optimistic update
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, status: newStage } : c))
    setDragging(null)
    setDragOver(null)

    await fetch(`/api/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStage })
    })
    
    // Log activity
    await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: contactId,
        type: 'stage_change',
        subject: `Moved to ${newStage}`,
        created_by: 'user'
      })
    })
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Pipeline</h1>
        <div className="flex gap-3">
          <select
            value={productFilter}
            onChange={e => setProductFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
          >
            <option value="">All Products</option>
            {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <Link
            href="/contacts/new"
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Contact
          </Link>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto flex-1 pb-4">
        {PIPELINE_STAGES.map(stage => {
          const stageContacts = byStage(stage.name)
          const colors = STATUS_COLORS[stage.name] || STATUS_COLORS['Prospect']
          const isOver = dragOver === stage.name

          return (
            <div
              key={stage.name}
              className={`flex-shrink-0 w-64 flex flex-col rounded-xl border transition-colors ${
                isOver ? 'border-indigo-500 bg-indigo-900/10' : 'border-gray-800 bg-gray-900'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(stage.name) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => handleDrop(e, stage.name)}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                  <span className="text-sm font-semibold text-gray-200">{stage.name}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                  {stageContacts.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px]">
                {stageContacts.map(contact => (
                  <div
                    key={contact.id}
                    draggable
                    onDragStart={e => handleDragStart(e, contact.id)}
                    onDragEnd={() => { setDragging(null); setDragOver(null) }}
                    className={`bg-gray-800 rounded-lg p-3 border border-gray-700 cursor-grab active:cursor-grabbing hover:border-gray-600 transition-all ${
                      dragging === contact.id ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-3 h-3 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <Link href={`/contacts/${contact.id}`} className="text-sm font-medium text-gray-200 hover:text-white block truncate">
                          {contact.name}
                        </Link>
                        {contact.company && (
                          <p className="text-xs text-gray-500 truncate">{contact.company}</p>
                        )}
                        {contact.product && (
                          <span className="inline-block mt-1 text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
                            {contact.product}
                          </span>
                        )}
                        {contact.email && (
                          <p className="text-xs text-gray-600 truncate mt-1">{contact.email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {stageContacts.length === 0 && (
                  <div className={`text-xs text-gray-600 text-center py-8 border-2 border-dashed rounded-lg ${
                    isOver ? 'border-indigo-500 text-indigo-400' : 'border-gray-700'
                  }`}>
                    {isOver ? 'Drop here' : 'No contacts'}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
