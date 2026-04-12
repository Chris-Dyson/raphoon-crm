import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const completed = searchParams.get('completed')
  const contact_id = searchParams.get('contact_id')

  let query = supabase
    .from('tasks')
    .select('*, contacts(name, email, product)')
    .order('due_at', { ascending: true })

  if (completed === 'false') query = query.is('completed_at', null)
  if (completed === 'true') query = query.not('completed_at', 'is', null)
  if (contact_id) query = query.eq('contact_id', contact_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  
  const { data, error } = await supabase
    .from('tasks')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
