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

create policy "app_items_select_own"
  on public.app_items
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "app_items_insert_own"
  on public.app_items
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "app_items_update_own"
  on public.app_items
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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

create policy "user_push_tokens_select_own"
  on public.user_push_tokens
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_push_tokens_insert_own"
  on public.user_push_tokens
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_push_tokens_update_own"
  on public.user_push_tokens
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_push_tokens_delete_own"
  on public.user_push_tokens
  for delete
  to authenticated
  using (auth.uid() = user_id);
