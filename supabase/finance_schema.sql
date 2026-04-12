-- Finance / Ledger Schema for Raphoon LLC
-- Monthly budget: $2,500

-- Ledger transactions table
create table if not exists ledger_transactions (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  type text not null check (type in ('income', 'expense')),
  category text not null, -- api, infrastructure, platform, hardware, communications, revenue, other
  description text not null,
  amount numeric(10,2) not null, -- negative for expenses, positive for income
  balance numeric(10,2) not null, -- running balance
  notes text,
  is_estimated boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_ledger_date on ledger_transactions(date);
create index if not exists idx_ledger_type on ledger_transactions(type);
create index if not exists idx_ledger_category on ledger_transactions(category);

-- RLS
alter table ledger_transactions enable row level security;
create policy "Allow all" on ledger_transactions for all using (true) with check (true);

-- Updated_at trigger
create trigger update_ledger_updated_at before update on ledger_transactions
  for each row execute function update_updated_at();

-- Seed data from existing ledger CSV
insert into ledger_transactions (date, type, category, description, amount, balance, notes, is_estimated) values
  ('2026-04-03', 'expense', 'hardware', 'Beelink SER9 Pro+ AI Mini PC (Amazon Order #112-1895892-4029028)', -781.85, -781.85, 'Hardware infrastructure - machine Chris Dyson runs on', false),
  ('2026-04-09', 'expense', 'infrastructure', 'Twilio account funding', -50.00, -831.85, 'Initial deposit by Ron', false),
  ('2026-04-10', 'expense', 'api', 'Anthropic API credits (morning)', -26.65, -858.50, 'Receipt #2978-0706-7440', false),
  ('2026-04-10', 'expense', 'api', 'Anthropic API credits (afternoon)', -79.95, -938.45, 'Receipt #2741-3893-2411', false),
  ('2026-04-10', 'expense', 'communications', 'Twilio SMS usage', -4.09, -942.54, 'Apr 10 usage', false),
  ('2026-04-11', 'expense', 'api', 'Anthropic API credits (overnight)', -59.80, -1002.34, 'Receipt #2606-3802-2363', false),
  ('2026-04-11', 'expense', 'api', 'Anthropic API credits (morning)', -61.80, -1064.14, 'Receipt #2956-1844-2197', false),
  ('2026-04-11', 'expense', 'infrastructure', 'Webshare residential proxy 10GB', -26.00, -1090.14, 'Monthly subscription', false),
  ('2026-04-11', 'expense', 'platform', 'Freelancer.com bidding credits', -31.00, -1121.14, 'Funded by Ron for job bidding', false),
  ('2026-04-11', 'expense', 'api', 'Anthropic API credits (afternoon)', -58.82, -1179.96, 'Receipt #2729-5922-4890', false),
  ('2026-04-12', 'expense', 'api', 'Anthropic API credits (estimated)', -100.00, -1279.96, 'Estimated from session volume - actual receipt pending', true)
on conflict do nothing;
