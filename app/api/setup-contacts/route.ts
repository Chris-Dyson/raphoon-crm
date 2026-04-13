import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'pg'

const CREATE_TABLE_SQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text,
  phone text,
  company text,
  title text,
  source text DEFAULT 'manual',
  product text,
  tags text[] DEFAULT '{}',
  status text DEFAULT 'Prospect',
  assigned_to text,
  linkedin_url text,
  twitter_handle text,
  instagram_handle text,
  notes text,
  next_followup_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  type text NOT NULL, subject text, body text,
  metadata jsonb DEFAULT '{}', campaign_id uuid,
  created_at timestamptz DEFAULT now(), created_by text DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL, product text, status text DEFAULT 'draft',
  type text DEFAULT 'cold_email', subject_a text, subject_b text,
  body_a text, body_b text, ab_test_enabled boolean DEFAULT false,
  ab_split_percent integer DEFAULT 50, sent_count integer DEFAULT 0,
  open_count integer DEFAULT 0, click_count integer DEFAULT 0,
  reply_count integer DEFAULT 0, conversion_count integer DEFAULT 0,
  revenue_generated numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  variant text DEFAULT 'A', sent_at timestamptz, opened_at timestamptz,
  clicked_at timestamptz, replied_at timestamptz, unsubscribed_at timestamptz,
  status text DEFAULT 'pending', UNIQUE(campaign_id, contact_id)
);

CREATE TABLE IF NOT EXISTS email_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_contact_id uuid REFERENCES campaign_contacts(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  event_type text NOT NULL, ip_address text, user_agent text, url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revenue_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  product text NOT NULL, amount numeric(10,2) NOT NULL,
  type text DEFAULT 'mrr', status text DEFAULT 'active',
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  notes text, created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  title text NOT NULL, description text, due_at timestamptz,
  completed_at timestamptz, priority text DEFAULT 'medium',
  type text DEFAULT 'followup', created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE, color text DEFAULT '#6366f1',
  position integer NOT NULL, created_at timestamptz DEFAULT now()
);

INSERT INTO pipeline_stages (name, color, position) VALUES
  ('Prospect', '#94a3b8', 0), ('Emailed', '#60a5fa', 1),
  ('Replied', '#34d399', 2), ('Demo', '#f59e0b', 3),
  ('Trial', '#a78bfa', 4), ('Paid', '#10b981', 5), ('Churned', '#ef4444', 6)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all" ON contacts;
  DROP POLICY IF EXISTS "Allow all" ON activities;
  DROP POLICY IF EXISTS "Allow all" ON campaigns;
  DROP POLICY IF EXISTS "Allow all" ON campaign_contacts;
  DROP POLICY IF EXISTS "Allow all" ON email_events;
  DROP POLICY IF EXISTS "Allow all" ON revenue_entries;
  DROP POLICY IF EXISTS "Allow all" ON tasks;
  DROP POLICY IF EXISTS "Allow all" ON pipeline_stages;
END $$;

CREATE POLICY "Allow all" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON campaign_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON email_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON revenue_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON pipeline_stages FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $body$ BEGIN new.updated_at = now(); RETURN new; END; $body$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
`

const CONNECTION_STRINGS = [
  process.env.DATABASE_URL,
  `postgresql://postgres.hkagsntwwlwyzjhgpmpw:${process.env.SUPABASE_DB_PASSWORD || 'thisV0BJ5U0bvap8GSAw'}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.hkagsntwwlwyzjhgpmpw:${process.env.SUPABASE_DB_PASSWORD || 'thisV0BJ5U0bvap8GSAw'}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
].filter(Boolean) as string[]

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { secret } = body as { secret?: string }
  if (secret !== 'raphoon-crm-setup-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let lastError = ''
  for (const connStr of CONNECTION_STRINGS) {
    const client = new Client({
      connectionString: connStr as string,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    })
    try {
      await client.connect()
      await client.query(CREATE_TABLE_SQL)
      const res = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
      )
      await client.end()
      return NextResponse.json({
        success: true,
        message: 'CRM schema created successfully',
        tables: res.rows.map((r: { table_name: string }) => r.table_name),
        connectedVia: connStr.substring(0, 50)
      })
    } catch (error) {
      lastError = String(error)
      try { await client.end() } catch { /* ignore */ }
    }
  }
  return NextResponse.json({ success: false, error: lastError, tried: CONNECTION_STRINGS.length }, { status: 500 })
}

export async function GET() {
  return NextResponse.json({
    message: 'POST with {"secret": "raphoon-crm-setup-2026"} to create CRM schema',
    endpoint: '/api/setup-contacts'
  })
}
