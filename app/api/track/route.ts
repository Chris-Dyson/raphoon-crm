import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Pixel tracking endpoint - returns 1x1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const contactId = searchParams.get('c')
  const campaignId = searchParams.get('k')
  const ccId = searchParams.get('cc')

  if (contactId) {
    // Log open event
    await supabase.from('email_events').insert({
      contact_id: contactId,
      campaign_id: campaignId || null,
      campaign_contact_id: ccId || null,
      event_type: 'open',
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
    })

    // Update campaign_contacts
    if (ccId) {
      await supabase
        .from('campaign_contacts')
        .update({ opened_at: new Date().toISOString(), status: 'opened' })
        .eq('id', ccId)
        .is('opened_at', null)
    }

    // Update campaign open count
    if (campaignId) {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('open_count')
        .eq('id', campaignId)
        .single()
      
      if (campaign) {
        await supabase
          .from('campaigns')
          .update({ open_count: campaign.open_count + 1 })
          .eq('id', campaignId)
      }
    }
  }

  return new NextResponse(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
