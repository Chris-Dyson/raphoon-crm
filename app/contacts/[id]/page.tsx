'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, Globe, Edit2, Save, X, Plus, Trash2, CheckSquare, Clock } from 'lucide-react'
import { PIPELINE_STAGES, PRODUCTS, SOURCES, Contact, Activity, Task } from '@/lib/supabase'
import { format, formatDistanceToNow } from 'date-fns'

const STATUS_COLORS: Record<string, string> = {
  'Prospect': 'bg-gray-700 text-gray-300',
  'Emailed': 'bg-blue-900/50 text-blue-300',
  'Replied': 'bg-green-900/50 text-green-300',
  'Demo': 'bg-yellow-900/50 text-yellow-300',
  'Trial': 'bg-purple-900/50 text-purple-300',
  'Paid': 'bg-emerald-900/50 text-emerald-300',
  'Churned': 'bg-red-900/50 text-red-300',
}

const ACTIVITY_ICONS: Record<string, string> = {
  email_sent: '📧', email_opened: '👁️', email_clicked: '🔗',
  reply_received: '↩️', call: '📞', note: '📝',
  stage_change: '🔄', demo: '🖥️', revenue: '💰', task: '✅',
}

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [contact, setContact] = useState<Contact | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Contact>>({})
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [addingTask, setAddingTask] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')

  useEffect(() => {
    fetch(`/api/contacts/${id}`)
      .then(r => r.json())
      .then(d => {
        setContact(d.contact)
        setForm(d.contact)
        setActivities(d.activities)
        setTasks(d.tasks)
      })
  }, [id])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      setContact(data)
      setForm(data)
      setEditing(false)
    } catch { }
    setSaving(false)
  }

  const logActivity = async (type: string, subject: string, body?: string) => {
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: id, type, subject, body, created_by: 'user' })
    })
    const act = await res.json()
    setActivities(prev => [act, ...prev])
  }

  const addNote = async () => {
    if (!note.trim()) return
    await logActivity('note', note)
    setNote('')
    setAddingNote(false)
  }

  const addTask = async () => {
    if (!taskTitle.trim()) return
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: id,
        title: taskTitle,
        due_at: taskDue || null,
        type: 'followup'
      })
    })
    const task = await res.json()
    setTasks(prev => [...prev, task])
    setTaskTitle('')
    setTaskDue('')
    setAddingTask(false)
  }

  const completeTask = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed_at: new Date().toISOString() })
    })
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed_at: new Date().toISOString() } : t))
  }

  const moveStage = async (newStatus: string) => {
    const oldStatus = contact?.status
    await fetch(`/api/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    setContact(c => c ? { ...c, status: newStatus } : c)
    setForm(f => ({ ...f, status: newStatus }))
    await logActivity('stage_change', `Moved from ${oldStatus} → ${newStatus}`)
  }

  const deleteContact = async () => {
    if (!confirm('Delete this contact? This cannot be undone.')) return
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    router.push('/contacts')
  }

  if (!contact) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-400">Loading...</div>
    </div>
  )

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/contacts" className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          {editing ? (
            <input
              value={form.name || ''}
              onChange={e => set('name', e.target.value)}
              className="text-2xl font-bold bg-transparent border-b border-indigo-500 text-white focus:outline-none"
            />
          ) : (
            <h1 className="text-2xl font-bold text-white">{contact.name}</h1>
          )}
          {contact.company && <p className="text-gray-400 text-sm">{contact.company}</p>}
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="p-2 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="p-2 text-gray-400 hover:text-white"><Edit2 className="w-4 h-4" /></button>
              <button onClick={deleteContact} className="p-2 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
            </>
          )}
        </div>
      </div>

      {/* Pipeline stage selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {PIPELINE_STAGES.map(s => (
          <button
            key={s.name}
            onClick={() => moveStage(s.name)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              contact.status === s.name
                ? 'ring-2 ring-offset-2 ring-offset-gray-950 scale-105'
                : 'opacity-50 hover:opacity-80'
            }`}
            style={{
              background: contact.status === s.name ? s.color + '33' : '#1f2937',
              color: contact.status === s.name ? s.color : '#9ca3af',
            }}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Contact Details */}
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact Info</h3>
            <div className="space-y-3">
              {editing ? (
                <>
                  <EditField label="Email" value={form.email || ''} onChange={v => set('email', v)} type="email" />
                  <EditField label="Phone" value={form.phone || ''} onChange={v => set('phone', v)} />
                  <EditField label="Company" value={form.company || ''} onChange={v => set('company', v)} />
                  <EditField label="Title" value={form.title || ''} onChange={v => set('title', v)} />
                  <div>
                    <label className="text-xs text-gray-500">Product</label>
                    <select value={form.product || ''} onChange={e => set('product', e.target.value)} className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none">
                      <option value="">None</option>
                      {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Source</label>
                    <select value={form.source || ''} onChange={e => set('source', e.target.value)} className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none">
                      {SOURCES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Follow-up Date</label>
                    <input type="date" value={form.next_followup_at?.split('T')[0] || ''} onChange={e => set('next_followup_at', e.target.value)}
                      className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none" />
                  </div>
                </>
              ) : (
                <>
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-gray-300 hover:text-indigo-400 transition-colors">
                      <Mail className="w-4 h-4 text-gray-500" /> {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-gray-300 hover:text-indigo-400 transition-colors">
                      <Phone className="w-4 h-4 text-gray-500" /> {contact.phone}
                    </a>
                  )}
                  {contact.linkedin_url && (
                    <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-300 hover:text-indigo-400 transition-colors">
                      <Globe className="w-4 h-4 text-gray-500" /> LinkedIn
                    </a>
                  )}
                  {contact.twitter_handle && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-gray-500">𝕏</span> {contact.twitter_handle}
                    </div>
                  )}
                  {contact.instagram_handle && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="text-gray-500">📷</span> {contact.instagram_handle}
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-800 space-y-1.5">
                    <InfoRow label="Product" value={contact.product} />
                    <InfoRow label="Source" value={contact.source} />
                    <InfoRow label="Status" value={
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[contact.status] || ''}`}>
                        {contact.status}
                      </span>
                    } />
                    {contact.next_followup_at && (
                      <InfoRow label="Follow-up" value={format(new Date(contact.next_followup_at), 'MMM d, yyyy')} />
                    )}
                    <InfoRow label="Added" value={format(new Date(contact.created_at), 'MMM d, yyyy')} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Notes</h3>
            {editing ? (
              <textarea
                value={form.notes || ''}
                onChange={e => set('notes', e.target.value)}
                rows={4}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none resize-none"
              />
            ) : (
              <p className="text-sm text-gray-400 whitespace-pre-wrap">{contact.notes || 'No notes yet.'}</p>
            )}
          </div>
        </div>

        {/* Middle + Right: Timeline + Tasks */}
        <div className="col-span-2 space-y-4">
          {/* Tasks */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tasks & Follow-ups</h3>
              <button onClick={() => setAddingTask(!addingTask)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Task
              </button>
            </div>
            {addingTask && (
              <div className="mb-3 p-3 bg-gray-800 rounded-lg space-y-2">
                <input
                  placeholder="Task title..."
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={taskDue}
                    onChange={e => setTaskDue(e.target.value)}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none"
                  />
                  <button onClick={addTask} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm">Add</button>
                  <button onClick={() => setAddingTask(false)} className="px-3 py-1.5 text-gray-400 hover:text-white text-sm">Cancel</button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {tasks.filter(t => !t.completed_at).map(t => (
                <div key={t.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-800 transition-colors">
                  <button onClick={() => completeTask(t.id)} className="mt-0.5">
                    <CheckSquare className="w-4 h-4 text-gray-500 hover:text-indigo-400 transition-colors" />
                  </button>
                  <div className="flex-1">
                    <p className="text-sm text-gray-200">{t.title}</p>
                    {t.due_at && (
                      <p className={`text-xs flex items-center gap-1 mt-0.5 ${
                        new Date(t.due_at) < new Date() ? 'text-red-400' : 'text-gray-500'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {format(new Date(t.due_at), 'MMM d, yyyy')}
                        {new Date(t.due_at) < new Date() && ' (overdue)'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {tasks.filter(t => !t.completed_at).length === 0 && (
                <p className="text-xs text-gray-600">No open tasks.</p>
              )}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Activity Timeline</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => logActivity('email_sent', 'Email sent')}
                  className="text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                >
                  📧 Log Email
                </button>
                <button
                  onClick={() => logActivity('call', 'Call made')}
                  className="text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded transition-colors"
                >
                  📞 Log Call
                </button>
                <button
                  onClick={() => setAddingNote(!addingNote)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Note
                </button>
              </div>
            </div>

            {addingNote && (
              <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                <textarea
                  placeholder="Add a note..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none resize-none mb-2"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setAddingNote(false)} className="text-xs text-gray-400 hover:text-white px-2 py-1">Cancel</button>
                  <button onClick={addNote} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded">Save Note</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {activities.length === 0 ? (
                <p className="text-xs text-gray-600">No activity yet. Log an email, call, or note above.</p>
              ) : (
                activities.map(a => (
                  <div key={a.id} className="flex gap-3 border-b border-gray-800 pb-3 last:border-0 last:pb-0">
                    <span className="text-lg flex-shrink-0">{ACTIVITY_ICONS[a.type] || '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200">{a.subject || a.type}</p>
                      {a.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.body}</p>}
                    </div>
                    <span className="text-xs text-gray-600 flex-shrink-0 whitespace-nowrap">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode | string | undefined | null }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs text-gray-300">{value}</span>
    </div>
  )
}

function EditField({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full mt-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none" />
    </div>
  )
}
