import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
})

// Auto-migrate: create table if it doesn't exist
async function ensureTable(client: { query: (q: string, p?: unknown[]) => Promise<unknown> }) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ledger_transactions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      date date NOT NULL,
      type text NOT NULL CHECK (type IN ('income', 'expense')),
      category text NOT NULL,
      description text NOT NULL,
      amount numeric(10,2) NOT NULL,
      balance numeric(10,2) NOT NULL,
      notes text,
      is_estimated boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_transactions(date)`)
  await client.query(`CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger_transactions(type)`)
  await client.query(`CREATE INDEX IF NOT EXISTS idx_ledger_category ON ledger_transactions(category)`)
}

// Seed initial data if table is empty
async function seedIfEmpty(client: { query: (q: string, p?: unknown[]) => Promise<{ rows: { count: string }[] }> }) {
  const count = await client.query('SELECT count(*) FROM ledger_transactions')
  if (parseInt((count as { rows: { count: string }[] }).rows[0].count) > 0) return

  const entries = [
    ['2026-04-03', 'expense', 'hardware', 'Beelink SER9 Pro+ AI Mini PC (Amazon Order #112-1895892-4029028)', -781.85, -781.85, 'Hardware infrastructure - machine Chris Dyson runs on', false],
    ['2026-04-09', 'expense', 'infrastructure', 'Twilio account funding', -50.00, -831.85, 'Initial deposit by Ron', false],
    ['2026-04-10', 'expense', 'api', 'Anthropic API credits (morning)', -26.65, -858.50, 'Receipt #2978-0706-7440', false],
    ['2026-04-10', 'expense', 'api', 'Anthropic API credits (afternoon)', -79.95, -938.45, 'Receipt #2741-3893-2411', false],
    ['2026-04-10', 'expense', 'communications', 'Twilio SMS usage', -4.09, -942.54, 'Apr 10 usage', false],
    ['2026-04-11', 'expense', 'api', 'Anthropic API credits (overnight)', -59.80, -1002.34, 'Receipt #2606-3802-2363', false],
    ['2026-04-11', 'expense', 'api', 'Anthropic API credits (morning)', -61.80, -1064.14, 'Receipt #2956-1844-2197', false],
    ['2026-04-11', 'expense', 'infrastructure', 'Webshare residential proxy 10GB', -26.00, -1090.14, 'Monthly subscription', false],
    ['2026-04-11', 'expense', 'platform', 'Freelancer.com bidding credits', -31.00, -1121.14, 'Funded by Ron for job bidding', false],
    ['2026-04-11', 'expense', 'api', 'Anthropic API credits (afternoon)', -58.82, -1179.96, 'Receipt #2729-5922-4890', false],
    ['2026-04-12', 'expense', 'api', 'Anthropic API credits (estimated)', -100.00, -1279.96, 'Estimated from session volume - actual receipt pending', true],
  ]

  for (const e of entries) {
    await client.query(
      'INSERT INTO ledger_transactions (date, type, category, description, amount, balance, notes, is_estimated) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      e
    )
  }
}

export async function GET() {
  const client = await pool.connect()
  try {
    await ensureTable(client as Parameters<typeof ensureTable>[0])
    await seedIfEmpty(client as Parameters<typeof seedIfEmpty>[0])

    const txns = await (client as { query: (q: string) => Promise<{ rows: unknown[] }> }).query(
      'SELECT * FROM ledger_transactions ORDER BY date ASC, created_at ASC'
    )

    const rows = txns.rows as Array<{
      type: string
      category: string
      amount: number | string
      date: string
    }>

    // Calculate stats
    const MONTHLY_BUDGET = 2500
    const transactions = rows
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const balance = totalIncome - totalExpenses

    // Category breakdown
    const categoryMap: Record<string, number> = {}
    transactions.filter(t => t.type === 'expense').forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + Math.abs(Number(t.amount))
    })
    const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({
      category, amount: Math.round(amount * 100) / 100
    })).sort((a, b) => b.amount - a.amount)

    // Burn rate (days with expenses)
    const dateSet = new Set(transactions.filter(t => t.type === 'expense').map(t => t.date?.toString().slice(0, 10)))
    const daysActive = Math.max(dateSet.size, 1)
    const dailyBurnRate = totalExpenses / daysActive
    const projectedMonthlyBurn = dailyBurnRate * 30

    return NextResponse.json({
      transactions,
      stats: {
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalIncome: Math.round(totalIncome * 100) / 100,
        balance: Math.round(balance * 100) / 100,
        monthlyBudget: MONTHLY_BUDGET,
        budgetUsed: Math.round((totalExpenses / MONTHLY_BUDGET) * 100),
        budgetRemaining: Math.round((MONTHLY_BUDGET - totalExpenses) * 100) / 100,
        dailyBurnRate: Math.round(dailyBurnRate * 100) / 100,
        projectedMonthlyBurn: Math.round(projectedMonthlyBurn * 100) / 100,
        daysActive,
      },
      categoryBreakdown,
    })
  } catch (err) {
    console.error('Finance GET error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function POST(req: Request) {
  const body = await req.json()
  const { date, type, category, description, amount, notes, is_estimated } = body

  if (!date || !type || !category || !description || amount === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await ensureTable(client as Parameters<typeof ensureTable>[0])

    // Calculate new running balance
    const last = await (client as { query: (q: string) => Promise<{ rows: { balance: string }[] }> }).query(
      'SELECT balance FROM ledger_transactions ORDER BY date DESC, created_at DESC LIMIT 1'
    )
    const lastBalance = last.rows.length > 0 ? Number(last.rows[0].balance) : 0
    const newBalance = lastBalance + Number(amount)

    const result = await (client as { query: (q: string, p: unknown[]) => Promise<{ rows: unknown[] }> }).query(
      `INSERT INTO ledger_transactions (date, type, category, description, amount, balance, notes, is_estimated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [date, type, category, description, Number(amount), Math.round(newBalance * 100) / 100, notes || null, is_estimated || false]
    )

    return NextResponse.json(result.rows[0])
  } catch (err) {
    console.error('Finance POST error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const client = await pool.connect()
  try {
    await (client as { query: (q: string, p: unknown[]) => Promise<unknown> }).query(
      'DELETE FROM ledger_transactions WHERE id = $1', [id]
    )
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  } finally {
    client.release()
  }
}
