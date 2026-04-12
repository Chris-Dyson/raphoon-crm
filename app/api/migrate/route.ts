import { NextResponse } from 'next/server'
import { Client } from 'pg'

const schema = `
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- CONTACTS TABLE
create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  company text,
  title text,
  source text default 'manual',
  product text,
  tags text[] default '{}',
  status text default 'Prospect',
  assigned_to text,
  linkedin_url text,
  twitter_handle text,
  instagram_handle text,
  notes text,
  next_followup_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ACTIVITIES TABLE
create table if not exists activities (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid references contacts(id) on delete cascade,
  type text not null,
  subject text,
  body text,
  metadata jsonb default '{}',
  campaign_id uuid,
  created_at timestamptz default now(),
  created_by text default 'system'
);

-- CAMPAIGNS TABLE
create table if not exists campaigns (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  product text,
  status text default 'draft',
  type text default 'cold_email',
  subject_a text,
  subject_b text,
  body_a text,
  body_b text,
  ab_test_enabled boolean default false,
  ab_split_percent integer default 50,
  sent_count integer default 0,
  open_count integer default 0,
  click_count integer default 0,
  reply_count integer default 0,
  conversion_count integer default 0,
  revenue_generated numeric(10,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CAMPAIGN CONTACTS
create table if not exists campaign_contacts (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid references campaigns(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  variant text default 'A',
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  unsubscribed_at timestamptz,
  status text default 'pending',
  unique(campaign_id, contact_id)
);

-- EMAIL EVENTS
create table if not exists email_events (
  id uuid primary key default uuid_generate_v4(),
  campaign_contact_id uuid references campaign_contacts(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  event_type text not null,
  ip_address text,
  user_agent text,
  url text,
  created_at timestamptz default now()
);

-- REVENUE TABLE
create table if not exists revenue_entries (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid references contacts(id) on delete set null,
  product text not null,
  amount numeric(10,2) not null,
  type text default 'mrr',
  status text default 'active',
  campaign_id uuid references campaigns(id) on delete set null,
  notes text,
  created_at timestamptz default now()
);

-- TASKS TABLE
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid references contacts(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  completed_at timestamptz,
  priority text default 'medium',
  type text default 'followup',
  created_at timestamptz default now()
);

-- PIPELINE STAGES
create table if not exists pipeline_stages (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  color text default '#6366f1',
  position integer not null,
  created_at timestamptz default now()
);

insert into pipeline_stages (name, color, position) values
  ('Prospect', '#94a3b8', 0),
  ('Emailed', '#60a5fa', 1),
  ('Replied', '#34d399', 2),
  ('Demo', '#f59e0b', 3),
  ('Trial', '#a78bfa', 4),
  ('Paid', '#10b981', 5),
  ('Churned', '#ef4444', 6)
on conflict (name) do nothing;

-- INDEXES
create index if not exists idx_contacts_status on contacts(status);
create index if not exists idx_contacts_product on contacts(product);
create index if not exists idx_contacts_email on contacts(email);
create index if not exists idx_contacts_created_at on contacts(created_at);
create index if not exists idx_activities_contact_id on activities(contact_id);
create index if not exists idx_activities_created_at on activities(created_at);
create index if not exists idx_campaign_contacts_campaign on campaign_contacts(campaign_id);
create index if not exists idx_campaign_contacts_contact on campaign_contacts(contact_id);
create index if not exists idx_revenue_product on revenue_entries(product);
create index if not exists idx_tasks_due_at on tasks(due_at);

-- RLS
alter table contacts enable row level security;
alter table activities enable row level security;
alter table campaigns enable row level security;
alter table campaign_contacts enable row level security;
alter table email_events enable row level security;
alter table revenue_entries enable row level security;
alter table tasks enable row level security;
alter table pipeline_stages enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='contacts' and policyname='Allow all') then
    create policy "Allow all" on contacts for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='activities' and policyname='Allow all') then
    create policy "Allow all" on activities for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='campaigns' and policyname='Allow all') then
    create policy "Allow all" on campaigns for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='campaign_contacts' and policyname='Allow all') then
    create policy "Allow all" on campaign_contacts for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='email_events' and policyname='Allow all') then
    create policy "Allow all" on email_events for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='revenue_entries' and policyname='Allow all') then
    create policy "Allow all" on revenue_entries for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='tasks' and policyname='Allow all') then
    create policy "Allow all" on tasks for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='pipeline_stages' and policyname='Allow all') then
    create policy "Allow all" on pipeline_stages for all using (true) with check (true);
  end if;
end $$;

-- UPDATED_AT TRIGGER
create or replace function update_updated_at()
returns trigger as \$\$
begin
  new.updated_at = now();
  return new;
end;
\$\$ language plpgsql;

drop trigger if exists update_contacts_updated_at on contacts;
create trigger update_contacts_updated_at before update on contacts
  for each row execute function update_updated_at();

drop trigger if exists update_campaigns_updated_at on campaigns;
create trigger update_campaigns_updated_at before update on campaigns
  for each row execute function update_updated_at();
`

const CONNECTION_STRINGS = [
  process.env.DATABASE_URL,
  `postgresql://postgres.hkagsntwwlwyzjhgpmpw:${process.env.SUPABASE_DB_PASSWORD || 'thisV0BJ5U0bvap8GSAw'}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.hkagsntwwlwyzjhgpmpw:${process.env.SUPABASE_DB_PASSWORD || 'thisV0BJ5U0bvap8GSAw'}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD || 'thisV0BJ5U0bvap8GSAw'}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?options=project%3Dhkagsntwwlwyzjhgpmpw`,
].filter(Boolean) as string[]

export async function POST() {
  let lastError = ''
  
  for (const connStr of CONNECTION_STRINGS) {
    const client = new Client({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    })

    try {
      await client.connect()
      console.log('Connected using:', connStr.substring(0, 60))
      await client.query(schema)
      
      const res = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
      )
      
      await client.end()
      return NextResponse.json({
        success: true,
        tables: res.rows.map((r: { table_name: string }) => r.table_name),
        connectedVia: connStr.substring(0, 50)
      })
    } catch (error) {
      console.error('Connection failed:', connStr.substring(0, 50), String(error))
      lastError = String(error)
      try { await client.end() } catch { }
    }
  }
  
  return NextResponse.json(
    { success: false, error: lastError, tried: CONNECTION_STRINGS.length },
    { status: 500 }
  )
}

export async function GET() {
  return NextResponse.json({ message: 'POST to this endpoint to run migrations' })
}
