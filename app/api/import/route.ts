import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { contacts, product, source = 'scraped' } = body

  if (!contacts || !Array.isArray(contacts)) {
    return NextResponse.json({ error: 'contacts array required' }, { status: 400 })
  }

  const toInsert = contacts.map((c: Record<string, string>) => ({
    name: c.name || c['Name'] || c['Channel Name'] || 'Unknown',
    email: c.email || c['Email'] || null,
    phone: c.phone || c['Phone'] || null,
    company: c.company || c['Company'] || null,
    twitter_handle: c['Handle/Twitter'] || c['Twitter/Email'] || null,
    instagram_handle: c['Handle/Instagram'] || null,
    source,
    product: product || c['Product'] || null,
    tags: product ? [product] : [],
    status: 'Prospect',
    notes: [
      c['Why Fit'] && `Why Fit: ${c['Why Fit']}`,
      c['Best Platform'] && `Best Platform: ${c['Best Platform']}`,
      c['Contact Status'] && `Contact Status: ${c['Contact Status']}`,
      c['Focus Area'] && `Focus: ${c['Focus Area']}`,
      c['Subscriber Count'] && `Subscribers: ${c['Subscriber Count']}`,
    ].filter(Boolean).join('\n') || null
  }))

  // Upsert to avoid duplicates on email
  const { data, error } = await supabase
    .from('contacts')
    .upsert(toInsert, { 
      onConflict: 'email',
      ignoreDuplicates: false
    })
    .select()

  if (error) {
    // Try insert without upsert if email column has issues
    const { data: insertData, error: insertError } = await supabase
      .from('contacts')
      .insert(toInsert)
      .select()
    
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    return NextResponse.json({ imported: insertData?.length || 0, data: insertData })
  }

  return NextResponse.json({ imported: data?.length || 0, data })
}
