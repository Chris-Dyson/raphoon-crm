import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const [
    { count: totalContacts },
    { data: byStatus },
    { data: byProduct },
    { data: revenue },
    { data: recentActivities },
    { data: overdueTasks },
    { data: recentContacts },
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    Promise.resolve({ data: null }),
    supabase.from('contacts').select('product').not('product', 'is', null),
    supabase.from('revenue_entries').select('*').eq('status', 'active'),
    supabase.from('activities').select('*, contacts(name, product)').order('created_at', { ascending: false }).limit(10),
    supabase.from('tasks').select('*, contacts(name)').is('completed_at', null).lt('due_at', new Date().toISOString()).limit(5),
    supabase.from('contacts').select('*').order('created_at', { ascending: false }).limit(5),
  ])

  // Calculate by status
  const statusCounts: Record<string, number> = {}
  const productCounts: Record<string, number> = {}
  
  // Get all contacts for counting
  const { data: allContacts } = await supabase.from('contacts').select('status, product')
  
  for (const c of allContacts || []) {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1
    if (c.product) productCounts[c.product] = (productCounts[c.product] || 0) + 1
  }

  // Calculate MRR
  const activeRevenue = revenue?.filter(r => r.status === 'active' && r.type === 'mrr') || []
  const totalMrr = activeRevenue.reduce((sum, r) => sum + Number(r.amount), 0)
  
  const mrrByProduct: Record<string, number> = {}
  for (const r of activeRevenue) {
    mrrByProduct[r.product] = (mrrByProduct[r.product] || 0) + Number(r.amount)
  }

  // Pipeline funnel data
  const stages = ['Prospect', 'Emailed', 'Replied', 'Demo', 'Trial', 'Paid', 'Churned']
  const pipelineData = stages.map(stage => ({
    stage,
    count: statusCounts[stage] || 0,
  }))

  return NextResponse.json({
    totalContacts: totalContacts || 0,
    statusCounts,
    productCounts,
    totalMrr,
    mrrByProduct,
    pipelineData,
    recentActivities: recentActivities || [],
    overdueTasks: overdueTasks || [],
    recentContacts: recentContacts || [],
    conversionRate: totalContacts ? ((statusCounts['Paid'] || 0) / (totalContacts || 1) * 100).toFixed(1) : '0',
  })
}
