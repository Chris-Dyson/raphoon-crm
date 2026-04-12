import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { readFileSync } from 'fs'
import { join } from 'path'

const PRESET_FILES: Record<string, { product: string; source: string }> = {
  'fitflow_leads.csv': { product: 'FitFlow', source: 'scraped' },
  'transcriptapi_leads.csv': { product: 'TranscriptAPI', source: 'scraped' },
  'ai_token_calculator_leads.csv': { product: 'Token Calculator', source: 'scraped' },
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const file = searchParams.get('file') || ''
  const product = searchParams.get('product') || ''

  if (!PRESET_FILES[file]) {
    return NextResponse.json({ error: 'Unknown preset file' }, { status: 400 })
  }

  try {
    // Try to read from workspace directory
    const possiblePaths = [
      join(process.cwd(), '..', '..', '.openclaw', 'workspace', file),
      join('/home/chrisdyson/.openclaw/workspace', file),
      join(process.cwd(), 'data', file),
    ]

    let csvText = ''
    for (const p of possiblePaths) {
      try {
        csvText = readFileSync(p, 'utf8')
        break
      } catch { }
    }

    if (!csvText) {
      return NextResponse.json({ error: `File not found: ${file}` }, { status: 404 })
    }

    const lines = csvText.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    
    const contacts = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = values[i] || '' })
      return obj
    }).filter(c => Object.values(c).some(v => v))

    const toInsert = contacts.map((c) => ({
      name: c['Name'] || c['Channel Name'] || 'Unknown',
      email: c['Email'] || null,
      phone: c['Phone'] || null,
      twitter_handle: c['Handle/Twitter'] || c['Twitter/Email'] || null,
      instagram_handle: c['Handle/Instagram'] || null,
      source: 'scraped',
      product: product || PRESET_FILES[file].product,
      tags: [product || PRESET_FILES[file].product],
      status: 'Prospect',
      notes: [
        c['Why Fit'] && `Why Fit: ${c['Why Fit']}`,
        c['Best Platform'] && `Best Platform: ${c['Best Platform']}`,
        c['Contact Status'] && `Contact Status: ${c['Contact Status']}`,
        c['Focus Area'] && `Focus: ${c['Focus Area']}`,
        c['Subscriber Count'] && `Subscribers: ${c['Subscriber Count']}`,
      ].filter(Boolean).join('\n') || null
    }))

    const { data, error } = await supabase
      .from('contacts')
      .insert(toInsert)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ imported: data?.length || 0 })

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
