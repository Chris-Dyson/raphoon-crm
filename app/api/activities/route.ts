import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  
  const { data, error } = await supabase
    .from('activities')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const contact_id = searchParams.get('contact_id')
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = supabase
    .from('activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (contact_id) query = query.eq('contact_id', contact_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
