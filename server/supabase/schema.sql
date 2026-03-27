-- Run in Supabase SQL Editor (or migrate via Supabase CLI).
-- Example table for CRUD demo; rename or extend for your real domain (habits, logs, etc.).

create table if not exists public.app_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  body text default ''::text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_items_user_id_created_at_idx
  on public.app_items (user_id, created_at desc);

alter table public.app_items enable row level security;

drop policy if exists "app_items_select_own" on public.app_items;
create policy "app_items_select_own"
  on public.app_items
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "app_items_insert_own" on public.app_items;
create policy "app_items_insert_own"
  on public.app_items
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "app_items_update_own" on public.app_items;
create policy "app_items_update_own"
  on public.app_items
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "app_items_delete_own" on public.app_items;
create policy "app_items_delete_own"
  on public.app_items
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Push tokens for remote notifications
create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  platform text default 'mobile',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_push_tokens_user_id_idx
  on public.user_push_tokens (user_id);

alter table public.user_push_tokens enable row level security;

drop policy if exists "user_push_tokens_select_own" on public.user_push_tokens;
create policy "user_push_tokens_select_own"
  on public.user_push_tokens
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_push_tokens_insert_own" on public.user_push_tokens;
create policy "user_push_tokens_insert_own"
  on public.user_push_tokens
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_push_tokens_update_own" on public.user_push_tokens;
create policy "user_push_tokens_update_own"
  on public.user_push_tokens
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_push_tokens_delete_own" on public.user_push_tokens;
create policy "user_push_tokens_delete_own"
  on public.user_push_tokens
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- AI usage tracking for message cap + billing
create table if not exists public.ai_message_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  context text not null default 'general',
  focus text,
  source text not null default 'local-fallback',
  status text not null default 'ok',
  created_at timestamptz not null default now()
);

create index if not exists ai_message_usage_user_id_created_at_idx
  on public.ai_message_usage (user_id, created_at desc);

alter table public.ai_message_usage enable row level security;

drop policy if exists "ai_message_usage_select_own" on public.ai_message_usage;
create policy "ai_message_usage_select_own"
  on public.ai_message_usage
  for select
  to authenticated
  using (auth.uid() = user_id);

-- =========================
-- AI CREDITS + ROUTING CORE
-- =========================

do $$ begin
  create type plan_type as enum ('free', 'pro', 'enterprise');
exception when duplicate_object then null; end $$;

do $$ begin
  create type provider_type as enum ('gemini', 'openai', 'claude', 'groq', 'local_fallback');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_request_status as enum ('ok', 'limit_reached', 'failed', 'timeout', 'blocked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transaction_reason as enum ('monthly_reset', 'request_deduction', 'manual_adjustment', 'refund', 'penalty', 'guest_monthly_reset');
exception when duplicate_object then null; end $$;

create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan_type plan_type not null default 'free',
  monthly_credit_limit integer not null default 50,
  credits_used integer not null default 0,
  credit_reset_date date not null default (date_trunc('month', now())::date + interval '1 month')::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_users_reset_idx on public.app_users (credit_reset_date);

create table if not exists public.guest_users (
  device_id_hash text primary key,
  monthly_credit_limit integer not null default 20,
  credits_used integer not null default 0,
  last_reset date not null default date_trunc('month', now())::date,
  risk_score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_limits_config (
  feature_name text primary key,
  credit_cost_small integer not null default 1,
  credit_cost_medium integer not null default 2,
  credit_cost_large integer not null default 4,
  model_preference provider_type not null default 'gemini',
  fallback_model provider_type not null default 'openai',
  max_input_tokens integer not null default 3000,
  max_output_tokens integer not null default 600,
  updated_at timestamptz not null default now()
);

insert into public.ai_limits_config (feature_name, credit_cost_small, credit_cost_medium, credit_cost_large, model_preference, fallback_model)
values
  ('home', 1, 2, 4, 'gemini', 'openai'),
  ('habits', 1, 2, 4, 'gemini', 'openai'),
  ('diet', 1, 2, 4, 'gemini', 'openai'),
  ('stats', 1, 2, 4, 'gemini', 'openai'),
  ('quit', 1, 2, 4, 'openai', 'gemini'),
  ('tracker', 1, 2, 4, 'gemini', 'openai'),
  ('settings', 1, 2, 4, 'gemini', 'openai'),
  ('general', 1, 2, 4, 'gemini', 'openai')
on conflict (feature_name) do nothing;

create table if not exists public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  guest_device_id_hash text references public.guest_users(device_id_hash) on delete cascade,
  feature text not null,
  prompt_type text not null default 'general',
  provider_used provider_type,
  model_used text,
  status ai_request_status not null,
  credits_charged integer not null default 0,
  tokens_prompt integer,
  tokens_completion integer,
  response_time_ms integer,
  error_code text,
  created_at timestamptz not null default now(),
  constraint ai_requests_actor_chk check (
    (user_id is not null and guest_device_id_hash is null)
    or (user_id is null and guest_device_id_hash is not null)
  )
);

create index if not exists ai_requests_user_created_idx on public.ai_requests (user_id, created_at desc);
create index if not exists ai_requests_feature_created_idx on public.ai_requests (feature, created_at desc);

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.ai_requests(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  guest_device_id_hash text references public.guest_users(device_id_hash) on delete cascade,
  feature text not null,
  provider provider_type not null,
  model text,
  tokens_used integer not null default 0,
  credits_used integer not null default 0,
  cost_estimate_usd numeric(10,6) not null default 0,
  response_time_ms integer not null default 0,
  cache_hit boolean not null default false,
  created_at timestamptz not null default now(),
  constraint ai_usage_logs_actor_chk check (
    (user_id is not null and guest_device_id_hash is null)
    or (user_id is null and guest_device_id_hash is not null)
  )
);

create index if not exists ai_usage_logs_user_created_idx on public.ai_usage_logs (user_id, created_at desc);
create index if not exists ai_usage_logs_provider_created_idx on public.ai_usage_logs (provider, created_at desc);

create table if not exists public.ai_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  guest_device_id_hash text references public.guest_users(device_id_hash) on delete cascade,
  request_id uuid references public.ai_requests(id) on delete set null,
  credits_added integer not null default 0,
  credits_deducted integer not null default 0,
  reason transaction_reason not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ai_credit_tx_actor_chk check (
    (user_id is not null and guest_device_id_hash is null)
    or (user_id is null and guest_device_id_hash is not null)
  )
);

create index if not exists ai_credit_tx_user_created_idx on public.ai_credit_transactions (user_id, created_at desc);

alter table public.app_users enable row level security;
alter table public.ai_requests enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.ai_credit_transactions enable row level security;

drop policy if exists "app_users_select_own" on public.app_users;
create policy "app_users_select_own"
  on public.app_users
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "ai_requests_select_own" on public.ai_requests;
create policy "ai_requests_select_own"
  on public.ai_requests
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "ai_usage_logs_select_own" on public.ai_usage_logs;
create policy "ai_usage_logs_select_own"
  on public.ai_usage_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "ai_credit_tx_select_own" on public.ai_credit_transactions;
create policy "ai_credit_tx_select_own"
  on public.ai_credit_transactions
  for select
  to authenticated
  using (auth.uid() = user_id);
