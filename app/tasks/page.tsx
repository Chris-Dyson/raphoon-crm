'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckSquare, Square, Clock, AlertTriangle, Plus } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'

interface Task {
  id: string
  title: string
  description?: string
  due_at?: string
  completed_at?: string
  priority: string
  type: string
  contact_id: string
  created_at: string
  contacts?: { name: string; email: string; product: string } | null
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-400',
  medium: 'text-yellow-400',
  high: 'text-red-400',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)

  const fetchTasks = async () => {
    const res = await fetch(`/api/tasks?completed=${showCompleted}`)
    const data = await res.json()
    setTasks(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchTasks() }, [showCompleted])

  const completeTask = async (id: string) => {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed_at: new Date().toISOString() })
    })
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const deleteTask = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const overdue = tasks.filter(t => !t.completed_at && t.due_at && isPast(new Date(t.due_at)) && !isToday(new Date(t.due_at)))
  const today = tasks.filter(t => !t.completed_at && t.due_at && isToday(new Date(t.due_at)))
  const upcoming = tasks.filter(t => !t.completed_at && (!t.due_at || (!isPast(new Date(t.due_at)) && !isToday(new Date(t.due_at)))))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Tasks & Follow-ups</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
              showCompleted ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            {showCompleted ? 'Showing Completed' : 'Show Completed'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading tasks...</div>
      ) : (
        <div className="space-y-6">
          {/* Overdue */}
          {overdue.length > 0 && (
            <TaskSection title="⚠️ Overdue" tasks={overdue} onComplete={completeTask} onDelete={deleteTask} headerClass="text-red-400" />
          )}

          {/* Today */}
          {today.length > 0 && (
            <TaskSection title="📅 Due Today" tasks={today} onComplete={completeTask} onDelete={deleteTask} headerClass="text-yellow-400" />
          )}

          {/* Upcoming */}
          <TaskSection title="📋 Upcoming" tasks={upcoming} onComplete={completeTask} onDelete={deleteTask} />

          {tasks.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No tasks. Add tasks from a contact&apos;s page.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TaskSection({ title, tasks, onComplete, onDelete, headerClass }: {
  title: string
  tasks: Task[]
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  headerClass?: string
}) {
  if (tasks.length === 0) return null
  
  return (
    <div>
      <h2 className={`text-sm font-semibold mb-3 ${headerClass || 'text-gray-400'}`}>{title} ({tasks.length})</h2>
      <div className="space-y-2">
        {tasks.map(task => (
          <div key={task.id} className="bg-gray-900 rounded-lg border border-gray-800 p-4 flex items-start gap-3 group hover:border-gray-700 transition-colors">
            <button onClick={() => onComplete(task.id)} className="mt-0.5 flex-shrink-0">
              <Square className="w-5 h-5 text-gray-500 hover:text-indigo-400 transition-colors" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-200">{task.title}</p>
                <span className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority === 'high' && '🔴 High'}
                  {task.priority === 'medium' && '🟡 Medium'}
                  {task.priority === 'low' && '⚪ Low'}
                </span>
              </div>
              {task.description && <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>}
              <div className="flex items-center gap-3 mt-1.5">
                {task.contacts && (
                  <Link href={`/contacts/${task.contact_id}`} className="text-xs text-indigo-400 hover:underline">
                    👤 {task.contacts.name}
                    {task.contacts.product && ` · ${task.contacts.product}`}
                  </Link>
                )}
                {task.due_at && (
                  <span className={`text-xs flex items-center gap-1 ${
                    isPast(new Date(task.due_at)) && !isToday(new Date(task.due_at)) ? 'text-red-400' : 'text-gray-500'
                  }`}>
                    <Clock className="w-3 h-3" />
                    {isToday(new Date(task.due_at)) ? 'Today' : format(new Date(task.due_at), 'MMM d')}
                    {isPast(new Date(task.due_at)) && !isToday(new Date(task.due_at)) && (
                      <AlertTriangle className="w-3 h-3 ml-0.5" />
                    )}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => onDelete(task.id)}
              className="opacity-0 group-hover:opacity-100 text-xs text-gray-600 hover:text-red-400 transition-all"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
