import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  title?: string
  source?: string
  product?: string
  tags?: string[]
  status: string
  assigned_to?: string
  linkedin_url?: string
  twitter_handle?: string
  instagram_handle?: string
  notes?: string
  next_followup_at?: string
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  contact_id: string
  type: string
  subject?: string
  body?: string
  metadata?: Record<string, unknown>
  campaign_id?: string
  created_at: string
  created_by?: string
}

export interface Campaign {
  id: string
  name: string
  product?: string
  status: string
  type: string
  subject_a?: string
  subject_b?: string
  body_a?: string
  body_b?: string
  ab_test_enabled: boolean
  ab_split_percent: number
  sent_count: number
  open_count: number
  click_count: number
  reply_count: number
  conversion_count: number
  revenue_generated: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  contact_id: string
  title: string
  description?: string
  due_at?: string
  completed_at?: string
  priority: string
  type: string
  created_at: string
}

export interface RevenueEntry {
  id: string
  contact_id?: string
  product: string
  amount: number
  type: string
  status: string
  campaign_id?: string
  notes?: string
  created_at: string
}

export const PIPELINE_STAGES = [
  { name: 'Prospect', color: '#94a3b8' },
  { name: 'Emailed', color: '#60a5fa' },
  { name: 'Replied', color: '#34d399' },
  { name: 'Demo', color: '#f59e0b' },
  { name: 'Trial', color: '#a78bfa' },
  { name: 'Paid', color: '#10b981' },
  { name: 'Churned', color: '#ef4444' },
]

export const PRODUCTS = [
  'FitFlow',
  'TranscriptAPI', 
  'Token Calculator',
  'TTS Bot',
  'AI Model Comparison',
  'Code Snippet Manager',
  'Email Template Generator',
  'Image Compression SaaS',
  'Other',
]

export const SOURCES = ['scraped', 'organic', 'referral', 'manual', 'cold_email', 'inbound']
