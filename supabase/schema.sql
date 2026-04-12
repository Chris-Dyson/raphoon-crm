-- Raphoon CRM Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- CONTACTS TABLE
-- ============================================
create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  company text,
  title text,
  source text default 'manual', -- scraped, organic, referral, manual
  product text, -- FitFlow, TranscriptAPI, Token Calculator, etc.
  tags text[] default '{}',
  status text default 'Prospect', -- Prospect, Emailed, Replied, Demo, Trial, Paid, Churned
  assigned_to text,
  linkedin_url text,
  twitter_handle text,
  instagram_handle text,
  notes text,
  next_followup_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- ACTIVITIES TABLE (timeline per contact)
-- ============================================
create table if not exists activities (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid references contacts(id) on delete cascade,
  type text not null, -- email_sent, email_opened, email_clicked, reply_received, call, note, stage_change, demo, task
  subject text,
  body text,
  metadata jsonb default '{}',
  campaign_id uuid,
  created_at timestamptz default now(),
  created_by text default 'system'
);

-- ============================================
-- CAMPAIGNS TABLE
-- ============================================
create table if not exists campaigns (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  product text,
  status text default 'draft', -- draft, active, paused, completed
  type text default 'cold_email', -- cold_email, follow_up, nurture
  subject_a text,
  subject_b text,
  body_a text,
  body_b text,
  ab_test_enabled boolean default false,
  ab_split_percent integer default 50, -- % going to variant A
  sent_count integer default 0,
  open_count integer default 0,
  click_count integer default 0,
  reply_count integer default 0,
  conversion_count integer default 0,
  revenue_generated numeric(10,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- CAMPAIGN CONTACTS (many-to-many)
-- ============================================
create table if not exists campaign_contacts (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid references campaigns(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  variant text default 'A', -- A or B
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  unsubscribed_at timestamptz,
  status text default 'pending', -- pending, sent, opened, clicked, replied, unsubscribed
  unique(campaign_id, contact_id)
);

-- ============================================
-- EMAIL TRACKING (pixel tracking)
-- ============================================
create table if not exists email_events (
  id uuid primary key default uuid_generate_v4(),
  campaign_contact_id uuid references campaign_contacts(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  event_type text not null, -- open, click
  ip_address text,
  user_agent text,
  url text, -- for clicks
  created_at timestamptz default now()
);

-- ============================================
-- REVENUE TABLE
-- ============================================
create table if not exists revenue_entries (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid references contacts(id) on delete set null,
  product text not null,
  amount numeric(10,2) not null,
  type text default 'mrr', -- mrr, one_time, refund
  status text default 'active', -- active, churned, paused
  campaign_id uuid references campaigns(id) on delete set null,
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- FOLLOW-UP TASKS
-- ============================================
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid references contacts(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  completed_at timestamptz,
  priority text default 'medium', -- low, medium, high
  type text default 'followup', -- followup, call, demo, email
  created_at timestamptz default now()
);

-- ============================================
-- PIPELINE STAGES CONFIG
-- ============================================
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

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
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
create index if not exists idx_tasks_contact_id on tasks(contact_id);

-- ============================================
-- ROW LEVEL SECURITY (open for now - add auth later)
-- ============================================
alter table contacts enable row level security;
alter table activities enable row level security;
alter table campaigns enable row level security;
alter table campaign_contacts enable row level security;
alter table email_events enable row level security;
alter table revenue_entries enable row level security;
alter table tasks enable row level security;
alter table pipeline_stages enable row level security;

-- Allow all access (single-user CRM, no auth needed yet)
create policy "Allow all" on contacts for all using (true) with check (true);
create policy "Allow all" on activities for all using (true) with check (true);
create policy "Allow all" on campaigns for all using (true) with check (true);
create policy "Allow all" on campaign_contacts for all using (true) with check (true);
create policy "Allow all" on email_events for all using (true) with check (true);
create policy "Allow all" on revenue_entries for all using (true) with check (true);
create policy "Allow all" on tasks for all using (true) with check (true);
create policy "Allow all" on pipeline_stages for all using (true) with check (true);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_contacts_updated_at before update on contacts
  for each row execute function update_updated_at();

create trigger update_campaigns_updated_at before update on campaigns
  for each row execute function update_updated_at();
