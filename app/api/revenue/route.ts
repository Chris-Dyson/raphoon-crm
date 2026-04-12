import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('revenue_entries')
    .select('*, contacts(name, email)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Calculate MRR per product
  const mrrByProduct: Record<string, number> = {}
  const activeEntries = data?.filter(e => e.status === 'active' && e.type === 'mrr') || []
  
  for (const entry of activeEntries) {
    mrrByProduct[entry.product] = (mrrByProduct[entry.product] || 0) + Number(entry.amount)
  }

  const totalMrr = Object.values(mrrByProduct).reduce((a, b) => a + b, 0)

  return NextResponse.json({ entries: data, mrrByProduct, totalMrr })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  
  const { data, error } = await supabase
    .from('revenue_entries')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log activity if contact_id provided
  if (body.contact_id) {
    await supabase.from('activities').insert({
      contact_id: body.contact_id,
      type: 'revenue',
      subject: `Revenue: $${body.amount}/mo (${body.product})`,
      body: body.notes || '',
      metadata: { amount: body.amount, type: body.type, product: body.product }
    })
  }

  return NextResponse.json(data, { status: 201 })
}
